import type {
  ItineraryPlanRequest,
  ComprehensiveItineraryPlan,
  ComprehensiveDayPlan,
  ComprehensiveScheduledItem,
  PlannedMealBreak,
  TransitBuffer,
  PaceLevel,
  UnrecordedDataFlags,
} from '../types/travel/planning';
import type { Activity, ScheduledActivityItem, TravelStyle } from '../types/itinerary';
import type { DetailedPlace } from '../types/travel/places';
import { getDestinationData } from '../data/destinations';
import { getActivitiesForDestination, hasVerifiedActivitiesForDestination } from '../data/activities';
import { getDetailedPlacesForDestination } from '../data/mock/mockPlaces';
import { calculateGeodesicDistanceKm, estimateTravelTimeMinutes, recommendTransitMode } from '../data/mock/mockRoutes';
import { PriorityQueue } from '../ds/PriorityQueue';
import { parseTimeToMinutes, formatMinutesToTime } from './itineraryService';

/**
 * Robust matcher associating candidate activities with detailed places.
 */
function findDetailedPlaceForActivity(act: Activity, places: DetailedPlace[]): DetailedPlace | undefined {
  const actName = act.name.toLowerCase();
  const actId = act.id.toLowerCase();

  return places.find((p) => {
    const pName = p.name.toLowerCase();
    const pId = p.id.toLowerCase();

    // Exact ID or name match
    if (pId === actId || pName === actName) return true;

    // Place ID suffix token match (e.g. 'act-paris-louvre' and 'plc-par-louvre')
    const actToken = actId.split('-').pop() || '';
    const pToken = pId.split('-').pop() || '';
    if (actToken && pToken && actToken === pToken) return true;

    // Distinctive key landmarks
    const keyPhrases = [
      'louvre',
      'orsay',
      'eiffel',
      'seine',
      'montmartre',
      'sensoji',
      'senso-ji',
      'meiji',
      'tsukiji',
      'shibuya',
      'teamlab',
      'pyramid',
      'gem',
      'bazaar',
      'citadel',
      'felucca',
      'koshari',
      'gateway',
      'cst',
      'marine drive',
      'elephanta',
      'colosseum',
      'vatican',
      'pantheon',
      'trevi',
      'trastevere',
    ];
    for (const phrase of keyPhrases) {
      if (actName.includes(phrase) && pName.includes(phrase)) return true;
    }

    return false;
  });
}

export interface IItineraryPlanningEngine {
  planTrip(request: ItineraryPlanRequest): ComprehensiveItineraryPlan;
  validateRequest(request: ItineraryPlanRequest): { isValid: boolean; errors: string[] };
}

export class ItineraryPlanningEngine implements IItineraryPlanningEngine {
  /**
   * Validates input request for invalid inputs, inverted dates, negative budgets, and empty destinations.
   */
  public validateRequest(request: ItineraryPlanRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request || !request.destinationId || !request.destinationId.trim()) {
      errors.push('Destination is required and cannot be empty.');
    }

    if (request.days !== undefined && request.days <= 0) {
      errors.push(`Invalid trip duration: days must be at least 1 (received ${request.days}).`);
    }

    if (request.budget !== undefined && request.budget < 0) {
      errors.push(`Invalid budget: budget cannot be negative (received ${request.budget}).`);
    }

    if (request.travelers !== undefined && request.travelers <= 0) {
      errors.push(`Invalid travelers count: must be at least 1 (received ${request.travelers}).`);
    }

    if (request.startDate && request.endDate) {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (start > end) {
          errors.push(
            `Invalid date range: startDate (${request.startDate}) cannot be after endDate (${request.endDate}).`
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Helper to compute day-of-week index (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
   * from start date and day offset.
   */
  private getDayOfWeek(startDateStr: string | undefined, dayIndex: number): { dayOfWeekNumber: number; dayOfWeekName: string; dateStr?: string } {
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (!startDateStr) {
      // Default baseline: assume Day 1 is Monday (1)
      const dow = (dayIndex) % 7;
      return { dayOfWeekNumber: dow, dayOfWeekName: DAY_NAMES[dow] };
    }

    const d = new Date(startDateStr);
    if (isNaN(d.getTime())) {
      const dow = (dayIndex) % 7;
      return { dayOfWeekNumber: dow, dayOfWeekName: DAY_NAMES[dow] };
    }

    // Add (dayIndex - 1) days
    d.setDate(d.getDate() + (dayIndex - 1));
    const dow = d.getDay();
    const dateStr = d.toISOString().split('T')[0];
    return { dayOfWeekNumber: dow, dayOfWeekName: DAY_NAMES[dow], dateStr };
  }

  /**
   * Checks if an activity fits within its known opening hours.
   */
  private isWithinOpeningHours(
    place: ReturnType<typeof getDetailedPlacesForDestination>[0] | undefined,
    startMins: number,
    endMins: number,
    dayOfWeek: number
  ): { allowed: boolean; reason?: string } {
    if (!place || !place.openingHours || !place.isOpenHoursRecorded) {
      return { allowed: true }; // Unrecorded hours -> don't guess, allow with honest unrecorded flag
    }

    // 1. Check closed days
    if (place.openingHours.closedDays && place.openingHours.closedDays.includes(dayOfWeek)) {
      return {
        allowed: false,
        reason: `${place.name} is closed on this day of week.`,
      };
    }

    // 2. Check open / close time bounds
    const openMins = parseTimeToMinutes(place.openingHours.open);
    const closeMins = parseTimeToMinutes(place.openingHours.close);

    // If venue closes past midnight (e.g. 01:30 AM), closeMins < openMins
    if (closeMins > openMins) {
      if (startMins < openMins) {
        return {
          allowed: false,
          reason: `Scheduled start (${formatMinutesToTime(startMins)}) is before opening (${place.openingHours.open}).`,
        };
      }
      if (endMins > closeMins) {
        return {
          allowed: false,
          reason: `Scheduled end (${formatMinutesToTime(endMins)}) exceeds closing (${place.openingHours.close}).`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Main planning engine method.
   */
  public planTrip(request: ItineraryPlanRequest): ComprehensiveItineraryPlan {
    const validation = this.validateRequest(request);
    const warnings: string[] = [...validation.errors];

    // Sanitize destination
    const destId = (request.destinationId || '').trim().toLowerCase() || 'paris';
    const dest = getDestinationData(destId);

    // Calculate total days
    let daysCount = request.days || 1;
    if (request.startDate && request.endDate) {
      const s = new Date(request.startDate);
      const e = new Date(request.endDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
        const diffMs = e.getTime() - s.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
        daysCount = Math.max(1, diffDays);
      }
    }
    daysCount = Math.max(1, Math.min(14, daysCount));

    const travelers = Math.max(1, request.travelers || 1);
    const budget = Math.max(0, request.budget !== undefined ? request.budget : 400);
    const travelStyle: TravelStyle = request.travelStyle || 'culture';
    const pace: PaceLevel = request.pace || 'balanced';

    // Retrieve candidate activities & detailed places
    let basicCandidates = getActivitiesForDestination(dest.id, dest.name);
    const detailedPlaces = getDetailedPlacesForDestination(dest.id);

    // If basic candidate activities list is empty but detailed places are recorded (e.g. Bangkok / Thailand),
    // derive verified candidates from detailed places so realistic planning engine succeeds honestly
    if (basicCandidates.length === 0 && detailedPlaces.length > 0) {
      basicCandidates = detailedPlaces.map((p) => ({
        id: `act-${p.destinationId}-${p.id.replace(/^plc-[a-z]+-/, '')}`,
        destinationId: p.destinationId,
        name: p.name,
        description: p.description,
        category: p.category,
        estimatedDurationMinutes: p.estimatedDurationMinutes,
        estimatedCostPerPerson: p.estimatedCostPerPerson,
        tags: p.tags,
        timeOfDay: p.timeOfDay || 'any',
        coordinates: p.coordinates,
        environment: p.environment || 'both',
      }));
    }

    const hasVerified = hasVerifiedActivitiesForDestination(dest.id) || basicCandidates.length > 0;
    if (!hasVerified) {
      warnings.push(
        `Notice: No verified local activity data is currently available for ${dest.name}. Ryoko does not generate placeholder activities or guessed prices.`
      );
    }

    // Configure daily slot structure according to pace
    const getPaceSlots = (paceLevel: PaceLevel) => {
      switch (paceLevel) {
        case 'relaxed':
          return [
            { slotName: 'morning', label: 'MORNING · 10:00 AM', startMins: 10 * 60, defaultDuration: 120 },
            { slotName: 'afternoon', label: 'AFTERNOON · 02:30 PM', startMins: 14 * 60 + 30, defaultDuration: 90 },
          ];
        case 'fast-paced':
          return [
            { slotName: 'early_morning', label: 'EARLY MORNING · 08:30 AM', startMins: 8 * 60 + 30, defaultDuration: 90 },
            { slotName: 'late_morning', label: 'LATE MORNING · 10:30 AM', startMins: 10 * 60 + 30, defaultDuration: 90 },
            { slotName: 'afternoon', label: 'AFTERNOON · 02:00 PM', startMins: 14 * 60, defaultDuration: 120 },
            { slotName: 'evening', label: 'EVENING · 06:30 PM', startMins: 18 * 60 + 30, defaultDuration: 90 },
          ];
        case 'balanced':
        default:
          return [
            { slotName: 'morning', label: 'MORNING · 09:30 AM', startMins: 9 * 60 + 30, defaultDuration: 120 },
            { slotName: 'afternoon', label: 'AFTERNOON · 01:45 PM', startMins: 13 * 60 + 45, defaultDuration: 120 },
            { slotName: 'evening', label: 'EVENING · 06:30 PM', startMins: 18 * 60 + 30, defaultDuration: 90 },
          ];
      }
    };

    const slots = getPaceSlots(pace);

    const usedCounts = new Map<string, number>();
    const lastDayUsed = new Map<string, number>();
    const dayPlans: ComprehensiveDayPlan[] = [];
    const legacyDayPlans: ScheduledActivityItem[][] = [];

    let overallCost = 0;
    let admissionsUnrecordedCount = 0;
    let openingHoursUnrecordedCount = 0;

    for (let dayIndex = 1; dayIndex <= daysCount; dayIndex++) {
      const { dayOfWeekNumber, dayOfWeekName, dateStr } = this.getDayOfWeek(request.startDate, dayIndex);

      // Match destination forecast for this specific day
      const dayForecast =
        request.weatherForecast?.[dayIndex - 1] ||
        request.weatherForecast?.find((f) => f.date === dateStr);

      const isRainy = dayForecast
        ? dayForecast.condition === 'rainy' ||
          dayForecast.condition === 'showers' ||
          dayForecast.condition === 'thunderstorm' ||
          dayForecast.precipitationChancePercent >= 55
        : false;

      const isVeryHot = dayForecast ? dayForecast.tempHighC >= 32 : false;
      const isPleasant = dayForecast
        ? (dayForecast.condition === 'sunny' ||
            dayForecast.condition === 'partly_cloudy' ||
            dayForecast.condition === 'breezy') &&
          dayForecast.tempHighC >= 15 &&
          dayForecast.tempHighC < 30 &&
          dayForecast.precipitationChancePercent < 30
        : false;

      let dayWeatherAdaptationNote: string | undefined;
      if (dayForecast) {
        if (isRainy) {
          dayWeatherAdaptationNote = `Weather-adapted for rain/showers (${dayForecast.tempHighC}°C): indoor venues and covered attractions prioritized.`;
        } else if (isVeryHot) {
          dayWeatherAdaptationNote = `Weather-adapted for high heat (${dayForecast.tempHighC}°C): indoor/shaded visits prioritized during peak daytime hours.`;
        } else if (isPleasant) {
          dayWeatherAdaptationNote = `Weather-adapted for clear conditions (${dayForecast.tempHighC}°C): outdoor landmarks and walking tours prioritized.`;
        }
      }

      const dayTimelineItems: ComprehensiveScheduledItem[] = [];
      const dayScheduledItems: ScheduledActivityItem[] = [];
      const dayMealBreaks: PlannedMealBreak[] = [];
      let dailyCost = 0;
      let dayActiveMinutes = 0;
      let dayTransitMinutes = 0;
      let prevActivity: Activity | null = null;
      let prevEndTimeMins: number | null = null;

      // 1. Plan Activities for each slot
      for (let sIdx = 0; sIdx < slots.length; sIdx++) {
        const slot = slots[sIdx];
        const remainingBudget = Math.max(0, budget - overallCost);

        // Max-heap PriorityQueue to select best candidate for this slot
        const pq = new PriorityQueue<Activity>(true);

        basicCandidates.forEach((act) => {
          // Rule: Skip if already used on this day!
          if (lastDayUsed.get(act.id) === dayIndex) return;

          // Check opening hours if recorded
          const detailed = findDetailedPlaceForActivity(act, detailedPlaces);
          const duration = act.estimatedDurationMinutes || slot.defaultDuration;
          const hoursCheck = this.isWithinOpeningHours(
            detailed,
            slot.startMins,
            slot.startMins + duration,
            dayOfWeekNumber
          );
          if (!hoursCheck.allowed) {
            return; // Skip venue because it is closed or outside operating hours!
          }

          // Proximity & style scoring
          let score = 50;
          if (travelStyle === 'culture' && (act.category === 'landmark' || act.category === 'art')) score += 30;
          if (travelStyle === 'foodie' && act.category === 'food') score += 40;
          if (travelStyle === 'relaxed' && (act.category === 'stroll' || act.category === 'nature')) score += 35;
          if (travelStyle === 'adventure' && (act.category === 'nature' || act.tags.includes('adventure'))) score += 35;

          // User interests match
          if (request.interests && request.interests.length > 0) {
            request.interests.forEach((interest) => {
              const lower = interest.toLowerCase();
              if (act.tags.some((t) => t.toLowerCase().includes(lower)) || act.name.toLowerCase().includes(lower)) {
                score += 25;
              }
            });
          }

          // Weather-awareness scoring: prioritize indoor venues during rain/storms or extreme heat
          if (dayForecast) {
            if (isRainy) {
              if (act.environment === 'indoor') {
                score += 40;
              } else if (act.environment === 'outdoor') {
                score -= 35;
              }
            } else if (isVeryHot) {
              if (act.environment === 'indoor') {
                score += 30;
              } else if (
                act.environment === 'outdoor' &&
                (slot.slotName.includes('afternoon') || slot.slotName.includes('late_morning'))
              ) {
                score -= 25;
              }
            } else if (isPleasant) {
              if (
                act.environment === 'outdoor' ||
                act.category === 'stroll' ||
                act.category === 'nature' ||
                act.category === 'landmark'
              ) {
                score += 15;
              }
            }
          }

          // Geographic clustering with prior activity in this day (anti-backtracking)
          if (prevActivity && prevActivity.coordinates && act.coordinates) {
            const dist = calculateGeodesicDistanceKm(prevActivity.coordinates, act.coordinates);
            if (dist <= 1.5) {
              score += 45;       // Highly walkable immediate cluster
            } else if (dist <= 4.0) {
              score += 25;       // Same urban district / quadrant
            } else if (dist > 8.0) {
              score -= 35;       // Significant cross-town backtracking penalty
            } else if (dist > 14.0) {
              score -= 55;       // Severe cross-city transit penalty
            }
          }

          // Protect reasonable daily touring capacity
          const maxDailyMinutes = pace === 'relaxed' ? 360 : pace === 'fast-paced' ? 600 : 480;
          const projectedDuration = (act.estimatedDurationMinutes || slot.defaultDuration);
          const projectedTransit = (prevActivity && prevActivity.coordinates && act.coordinates)
            ? estimateTravelTimeMinutes(calculateGeodesicDistanceKm(prevActivity.coordinates, act.coordinates))
            : 0;
          if (dayActiveMinutes + dayTransitMinutes + projectedDuration + projectedTransit > maxDailyMinutes) {
            score -= 35; // Avoid scheduling more than the day can comfortably accommodate
          }

          // Budget awareness
          if (remainingBudget > 0 && typeof act.estimatedCostPerPerson === 'number') {
            const groupCost = act.estimatedCostPerPerson * travelers;
            if (groupCost > remainingBudget) {
              score -= 35;
            } else if (act.estimatedCostPerPerson <= 15) {
              score += 10;
            }
          }

          // Penalize reused activities across trip
          const timesUsed = usedCounts.get(act.id) || 0;
          score -= timesUsed * 60;

          pq.enqueue(act, score);
        });

        const selected = pq.dequeue();

        if (selected) {
          usedCounts.set(selected.id, (usedCounts.get(selected.id) || 0) + 1);
          lastDayUsed.set(selected.id, dayIndex);

          const detailed = findDetailedPlaceForActivity(selected, detailedPlaces);
          const duration = selected.estimatedDurationMinutes || slot.defaultDuration;
          const endMins = slot.startMins + duration;

          const isAdmissionRecorded = typeof selected.estimatedCostPerPerson === 'number';
          if (!isAdmissionRecorded) admissionsUnrecordedCount++;

          const costForGroup = isAdmissionRecorded
            ? (selected.estimatedCostPerPerson as number) * travelers
            : undefined;

          if (typeof costForGroup === 'number') {
            dailyCost += costForGroup;
          }

          // Transit buffer from previous stop (verified route or geodesic estimate)
          let transitFromPrevious: TransitBuffer | null = null;
          if (prevActivity && prevActivity.coordinates && selected.coordinates) {
            const routeKey1 = `${prevActivity.id}->${selected.id}`;
            const routeKey2 = `${prevActivity.coordinates.lat.toFixed(4)},${prevActivity.coordinates.lng.toFixed(4)}->${selected.coordinates.lat.toFixed(4)},${selected.coordinates.lng.toFixed(4)}`;
            const verified = request.verifiedRoutes?.[routeKey1] || request.verifiedRoutes?.[routeKey2];

            if (verified && verified.success && !verified.isEstimated && verified.liveTrafficVerified) {
              const transitMins = verified.estimatedDurationMinutes;
              const dist = verified.distanceKm;
              dayTransitMinutes += transitMins;

              transitFromPrevious = {
                fromActivityName: prevActivity.name,
                toActivityName: selected.name,
                distanceKm: dist,
                estimatedMinutes: transitMins,
                mode: verified.mode,
                isEstimated: false,
                liveTrafficVerified: true,
                routeSummary: verified.route?.summary || `Verified ${verified.mode} route (~${dist.toFixed(1)} km, ~${transitMins} min)`,
                sourceAttribution: verified.sourceAttribution,
              };
            } else {
              const dist = calculateGeodesicDistanceKm(prevActivity.coordinates, selected.coordinates);
              const mode = recommendTransitMode(dist);
              const transitMins = estimateTravelTimeMinutes(dist, mode);
              dayTransitMinutes += transitMins;

              transitFromPrevious = {
                fromActivityName: prevActivity.name,
                toActivityName: selected.name,
                distanceKm: dist,
                estimatedMinutes: transitMins,
                mode,
                isEstimated: true,
                liveTrafficVerified: false,
                routeSummary: mode === 'walking'
                  ? `Scenic ${dist.toFixed(1)} km walking stroll (~${transitMins} min)`
                  : `Urban ${mode} transition (~${dist.toFixed(1)} km, ~${transitMins} min)`,
                sourceAttribution: 'Ryoko Geodesic Urban Route Engine',
              };
            }
          }

          const isOpenHoursRecorded = detailed ? detailed.isOpenHoursRecorded : false;
          if (!isOpenHoursRecorded) openingHoursUnrecordedCount++;

          // Selection reason
          let selectionReason: string;
          if (prevActivity && prevActivity.coordinates && selected.coordinates) {
            const dist = calculateGeodesicDistanceKm(prevActivity.coordinates, selected.coordinates);
            if (dist <= 5.0) {
              selectionReason = `Geographically clustered near ${prevActivity.name} (~${dist.toFixed(1)} km) to minimize transit.`;
            } else {
              selectionReason = `Curated for ${slot.slotName} timing & ${travelStyle} travel style.`;
            }
          } else {
            selectionReason = `Morning anchor activity matching your ${travelStyle} travel style.`;
          }

          if (dayForecast) {
            if (isRainy && selected.environment === 'indoor') {
              selectionReason += ' · Weather-adapted: sheltered indoor venue for rain.';
            } else if (isVeryHot && selected.environment === 'indoor') {
              selectionReason += ' · Weather-adapted: air-conditioned indoor visit during heat.';
            } else if (isPleasant && (selected.environment === 'outdoor' || selected.category === 'landmark' || selected.category === 'stroll')) {
              selectionReason += ' · Weather-adapted: outdoor exploration favored under clear skies.';
            }
          }

          const timelineItem: ComprehensiveScheduledItem = {
            id: `sch-day${dayIndex}-${selected.id}`,
            itemType: 'activity',
            title: selected.name,
            description: selected.description,
            startTime: formatMinutesToTime(slot.startMins),
            endTime: formatMinutesToTime(endMins),
            durationMinutes: duration,
            category: selected.category,
            costForGroup,
            isAdmissionRecorded,
            openingHours: detailed?.openingHours?.description,
            isOpenHoursRecorded,
            coordinates: selected.coordinates,
            transitFromPrevious,
            selectionReason,
            activity: selected,
          };

          dayTimelineItems.push(timelineItem);

          dayScheduledItems.push({
            id: timelineItem.id,
            activity: selected,
            timeSlotLabel: `DAY ${dayIndex} · ${slot.label}`,
            startTime: timelineItem.startTime,
            endTime: timelineItem.endTime,
            durationMinutes: duration,
            costForGroup,
            selectionReason,
          });

          dayActiveMinutes += duration;
          prevActivity = selected;
          prevEndTimeMins = endMins;
        }

        // 2. Insert Meal Break after morning block (around 12:30 PM)
        if (sIdx === 0 && (request.includeMeals ?? true)) {
          const lunchStart = Math.max(12 * 60, (prevEndTimeMins || 11 * 60 + 30) + 15);
          const lunchDuration = pace === 'relaxed' ? 90 : pace === 'fast-paced' ? 45 : 75;
          const lunchEnd = lunchStart + lunchDuration;
          const estimatedMealCost = 18 * travelers;
          dailyCost += estimatedMealCost;

          const mealBreak: PlannedMealBreak = {
            id: `meal-lunch-day${dayIndex}`,
            mealType: 'lunch',
            name: `Midday Dining & Local Culinary Break in ${dest.name}`,
            description: `Leisurely lunch break sampling local ${dest.country} specialties with time to relax.`,
            startTime: formatMinutesToTime(lunchStart),
            endTime: formatMinutesToTime(lunchEnd),
            durationMinutes: lunchDuration,
            estimatedCostPerPerson: 18,
            costForGroup: estimatedMealCost,
            isEstimated: true,
            selectionReason: 'Scheduled midday rest break between morning and afternoon cultural stops.',
          };

          dayMealBreaks.push(mealBreak);

          dayTimelineItems.push({
            id: mealBreak.id,
            itemType: 'meal',
            title: mealBreak.name,
            description: mealBreak.description,
            startTime: mealBreak.startTime,
            endTime: mealBreak.endTime,
            durationMinutes: lunchDuration,
            category: 'food',
            costForGroup: estimatedMealCost,
            isAdmissionRecorded: true,
            isOpenHoursRecorded: true,
            openingHours: '12:00 PM - 03:00 PM standard dining window',
            selectionReason: mealBreak.selectionReason,
          });
        }
      }

      overallCost += dailyCost;

      dayPlans.push({
        dayNumber: dayIndex,
        date: dateStr,
        dayOfWeek: dayOfWeekName,
        title: `Day ${dayIndex} · ${dest.name} Exploration (${dayOfWeekName})`,
        items: dayScheduledItems,
        timelineItems: dayTimelineItems,
        mealBreaks: dayMealBreaks,
        estimatedDailyCost: dailyCost,
        activeTouringMinutes: dayActiveMinutes,
        transitMinutesTotal: dayTransitMinutes,
        weatherForecast: dayForecast,
        isWeatherAdapted: Boolean(dayForecast),
        weatherAdaptationNote: dayWeatherAdaptationNote,
      });

      legacyDayPlans.push(dayScheduledItems);
    }

    const isWithinBudget = overallCost <= budget;
    if (!isWithinBudget) {
      warnings.push(
        `Estimated activity and meal cost ($${overallCost}) exceeds your allocated budget ($${budget}) for ${travelers} traveller(s).`
      );
    }

    const hasWeatherForecast = Boolean(request.weatherForecast && request.weatherForecast.length > 0);
    const anyDayLiveVerified = request.weatherForecast?.some((f) => f.liveForecastVerified) ?? false;

    const hasAnyVerifiedRoute = dayPlans.some((d) =>
      d.timelineItems.some(
        (item) => item.transitFromPrevious && !item.transitFromPrevious.isEstimated && item.transitFromPrevious.liveTrafficVerified
      )
    );

    const unrecordedDataFlags: UnrecordedDataFlags = {
      admissionsUnrecordedCount,
      openingHoursUnrecordedCount,
      isWeatherEstimated: !anyDayLiveVerified,
      isTransitEstimated: !hasAnyVerifiedRoute,
      notes: [
        admissionsUnrecordedCount > 0
          ? `${admissionsUnrecordedCount} admission price(s) unrecorded in public catalog; marked as admission unrecorded.`
          : 'All scheduled attractions have recorded admission estimates.',
        openingHoursUnrecordedCount > 0
          ? `${openingHoursUnrecordedCount} venue opening hour(s) unrecorded; please verify operating hours locally.`
          : 'Opening hours checked for all scheduled attractions.',
        hasWeatherForecast
          ? `Weather-adapted: Itinerary schedule evaluated against ${anyDayLiveVerified ? 'live verified' : 'forecast'} meteorological conditions.`
          : 'Weather adaptation unavailable: standard schedule generated without live forecast.',
        hasAnyVerifiedRoute
          ? 'Routes verified: Real street navigation durations confirmed via Google Routes API.'
          : 'Transit estimated: Urban travel buffers calculated using geodesic transit model.',
      ],
    };

    const avgTransit = Math.round(
      dayPlans.reduce((sum, d) => sum + d.transitMinutesTotal, 0) / daysCount
    );

    return {
      id: `plan-${dest.id}-${daysCount}d-${pace}-${travelStyle}`,
      destinationId: dest.id,
      destinationName: dest.name,
      country: dest.country,
      startDate: request.startDate,
      endDate: request.endDate,
      pace,
      days: dayPlans,
      comprehensiveDays: dayPlans,
      totalDays: daysCount,
      travelersCount: travelers,
      travelStyle,
      totalEstimatedCost: overallCost,
      allocatedBudget: budget,
      isWithinBudget,
      warnings,
      unrecordedDataFlags,
      travelBuffersSummary: hasAnyVerifiedRoute
        ? `Planned for ${pace} pace with ~${avgTransit} min daily transit buffers (Google Routes verified).`
        : `Planned for ${pace} pace with ~${avgTransit} min daily estimated transit buffers between nearby attractions.`,
      disclaimerNote: hasVerified
        ? `Aan's deterministic planning engine: estimated costs ($${overallCost} total for ${travelers} traveller(s)) include admissions and dining allowances. Paced at ${pace} pace with realistic meal breaks & travel buffers. Opening hours verified against day-of-week where recorded.`
        : `No verified local activity data for ${dest.name}. Ryoko does not generate placeholder activities or guessed prices.`,
      hasVerifiedActivities: hasVerified,
      dataStatus: hasVerified ? 'curated' : 'insufficient_data',
      isWeatherAdapted: hasWeatherForecast,
      weatherSummary: hasWeatherForecast
        ? `Itinerary adapted for ${dest.name} forecast (${request.weatherForecast![0]?.conditionLabel || 'forecast conditions'}).`
        : 'Weather adaptation unavailable: forecast data offline.',
      isRoutesVerified: hasAnyVerifiedRoute,
    };
  }
}

export const itineraryPlanningEngine = new ItineraryPlanningEngine();
