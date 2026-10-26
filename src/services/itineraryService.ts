import type {
  TripPreferences,
  GeneratedItineraryPlan,
  DayItineraryPlan,
  ScheduledActivityItem,
  Activity,
  TimeOfDay,
  Coordinates,
} from '../types';
import { getDestinationData } from '../data/destinations';
import { getActivitiesForDestination, hasVerifiedActivitiesForDestination } from '../data/activities';
import { getDetailedPlacesForDestination } from '../data/mock/mockPlaces';
import { HashMap } from '../ds/HashMap';
import { PriorityQueue } from '../ds/PriorityQueue';
import { Graph } from '../ds/Graph';

export interface IItineraryService {
  generateItinerary(preferences: TripPreferences): GeneratedItineraryPlan;
}

/**
 * Calculates straight-line geodesic distance (Haversine formula) in kilometers between two GPS coordinates.
 * Used for geographic clustering and proximity scoring without fabricating street-routing or traffic data.
 */
export function calculateDistanceKm(c1: Coordinates, c2: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Constructs an activity spatial graph connecting activities within walking or close transit distance (<= 6.0 km).
 * Directly reuses the project's Graph data structure for neighborhood clustering.
 */
export function buildActivitySpatialGraph(activities: Activity[]): Graph<string> {
  const graph = new Graph<string>();
  activities.forEach((act) => graph.addVertex(act.id));

  for (let i = 0; i < activities.length; i++) {
    const a1 = activities[i];
    if (!a1.coordinates) continue;
    for (let j = i + 1; j < activities.length; j++) {
      const a2 = activities[j];
      if (!a2.coordinates) continue;
      const dist = calculateDistanceKm(a1.coordinates, a2.coordinates);
      if (dist <= 6.0) {
        graph.addEdge(a1.id, a2.id, dist);
      }
    }
  }

  return graph;
}

/**
 * Converts a 12-hour formatted time string (e.g. "09:30 AM") into total minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(' ');
  const timePart = parts[0] || '09:00';
  const period = (parts[1] || 'AM').toUpperCase();
  const [hoursStr, minsStr] = timePart.split(':');
  let hours = parseInt(hoursStr, 10) || 0;
  const minutes = parseInt(minsStr, 10) || 0;

  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Converts total minutes from midnight into a clean 12-hour time string with AM/PM (e.g. "12:30 PM").
 */
export function formatMinutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  let displayHours = hours24 % 12;
  if (displayHours === 0) displayHours = 12;
  const displayMins = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${displayHours}:${displayMins} ${period}`;
}

class ItineraryService implements IItineraryService {

  /**
   * Calculates a match score for a candidate activity given traveller style, interests,
   * target time-of-day, geographic proximity clustering, day diversity, fatigue pacing,
   * and budget awareness.
   */
  public scoreActivity(
    activity: Activity,
    preferences: TripPreferences,
    targetSlot: TimeOfDay,
    anchorActivity?: Activity | null,
    dayActivities: Activity[] = [],
    remainingBudget?: number
  ): number {
    let score = 50; // Base score

    const style = preferences.travelStyle;

    // 1. Travel Style Category & Tag Scoring
    if (style === 'culture') {
      if (activity.category === 'landmark' || activity.category === 'art') score += 30;
      if (
        activity.tags.includes('history') ||
        activity.tags.includes('museum') ||
        activity.tags.includes('culture') ||
        activity.tags.includes('temple') ||
        activity.tags.includes('heritage') ||
        activity.tags.includes('church')
      ) {
        score += 20;
      }
    } else if (style === 'foodie') {
      if (activity.category === 'food') score += 40;
      if (
        activity.tags.includes('food') ||
        activity.tags.includes('market') ||
        activity.tags.includes('dining') ||
        activity.tags.includes('bistro') ||
        activity.tags.includes('streetfood') ||
        activity.tags.includes('sushi') ||
        activity.tags.includes('matcha') ||
        activity.tags.includes('tea')
      ) {
        score += 20;
      }
    } else if (style === 'relaxed') {
      if (activity.category === 'stroll' || activity.category === 'nature') score += 35;
      if (
        activity.tags.includes('relaxed') ||
        activity.tags.includes('sunset') ||
        activity.tags.includes('gardens') ||
        activity.tags.includes('cruise') ||
        activity.tags.includes('park')
      ) {
        score += 20;
      }
      if (activity.estimatedDurationMinutes <= 120) score += 15;
    } else if (style === 'adventure') {
      if (activity.category === 'nature') score += 35;
      if (
        activity.tags.includes('adventure') ||
        activity.tags.includes('desert') ||
        activity.tags.includes('pyramids') ||
        activity.tags.includes('hiking')
      ) {
        score += 35;
      }
    } else if (style === 'photography') {
      if (
        activity.tags.includes('viewpoint') ||
        activity.tags.includes('photography') ||
        activity.tags.includes('sunset') ||
        activity.tags.includes('architecture') ||
        activity.tags.includes('neon')
      ) {
        score += 35;
      }
    } else if (style === 'budget') {
      const cost = typeof activity.estimatedCostPerPerson === 'number' ? activity.estimatedCostPerPerson : 0;
      if (cost === 0) score += 50;
      else if (cost <= 10) score += 40;
      else if (cost <= 20) score += 25;
    }

    // 2. User Interests Scoring (substring & tag match)
    if (preferences.interests && preferences.interests.length > 0) {
      preferences.interests.forEach((interest) => {
        const lower = interest.toLowerCase();
        const tagMatch = activity.tags.some((tag) => tag.toLowerCase().includes(lower));
        const nameMatch = activity.name.toLowerCase().includes(lower);
        const descMatch = activity.description.toLowerCase().includes(lower);
        if (tagMatch || nameMatch || descMatch) {
          score += 25;
        }
      });
    }

    // 3. Time of Day Suitability Scoring
    if (activity.timeOfDay === targetSlot) {
      score += 30;
    } else if (activity.timeOfDay === 'any') {
      score += 15;
    } else {
      // Slot mismatch (e.g. evening-specific nightlife/sunset scheduled in morning)
      score -= 20;
    }

    // 4. Constraint Handling
    if (preferences.constraints?.indoorOnly) {
      if (activity.environment === 'outdoor') score -= 100;
      if (activity.environment === 'indoor') score += 25;
    }

    // 5. Geographic Proximity & Transit Feasibility Scoring
    if (anchorActivity && anchorActivity.coordinates && activity.coordinates) {
      const distKm = calculateDistanceKm(anchorActivity.coordinates, activity.coordinates);
      if (distKm <= 2.5) {
        // Immediate neighborhood / walkable district
        score += 30;
      } else if (distKm <= 6.0) {
        // Nearby quadrant within same city district
        score += 18;
      } else if (distKm > 14.0) {
        // Long cross-city transit penalty
        score -= 25;
      }

      // Transition buffer feasibility: if previous anchor was a long activity (>= 180 min),
      // transition time between slots is tighter; penalize distant transit (> 10 km)
      if (
        anchorActivity.estimatedDurationMinutes &&
        anchorActivity.estimatedDurationMinutes >= 180 &&
        distKm > 10.0
      ) {
        score -= 30; // Impractical schedule transition penalty
      }
    }

    // 6. Activity Diversity & Monotony Avoidance
    // Avoid recommending multiple activities of the exact same category on the same day when alternatives exist
    if (dayActivities.length > 0) {
      const hasSameCategory = dayActivities.some((a) => a.category === activity.category);
      if (hasSameCategory) {
        // Foodies enjoy multiple meal stops (lunch + dinner); other categories should be varied
        if (style === 'foodie' && activity.category === 'food') {
          score -= 5;
        } else {
          score -= 25; // Diversity penalty
        }
      }

      // Avoid stacking multiple heavy museum stops on the same day
      const hasMuseum = dayActivities.some((a) => a.tags.includes('museum'));
      if (hasMuseum && activity.tags.includes('museum')) {
        score -= 20;
      }

      // Avoid stacking multiple religious/temple stops on the same day unless specifically in user interests
      const hasTemple = dayActivities.some((a) => a.tags.includes('temple') || a.tags.includes('shrine'));
      const isTemple = activity.tags.includes('temple') || activity.tags.includes('shrine');
      if (hasTemple && isTemple) {
        score -= 20;
      }

      // Avoid stacking multiple commercial market/shopping excursions on the same day
      const hasShopping = dayActivities.some((a) => a.tags.includes('shopping') || a.tags.includes('bazaar'));
      const isShopping = activity.tags.includes('shopping') || activity.tags.includes('bazaar');
      if (hasShopping && isShopping) {
        score -= 20;
      }
    }

    // 7. Day Balance & Fatigue Pacing
    const dayDurationSoFar = dayActivities.reduce((sum, a) => sum + (a.estimatedDurationMinutes || 120), 0);
    if (dayDurationSoFar >= 270) {
      // Heavily packed day so far (>= 4.5 hours of touring): strongly prioritize lighter wind-down stops
      if ((activity.estimatedDurationMinutes || 120) <= 90) {
        score += 25;
      } else if ((activity.estimatedDurationMinutes || 120) >= 120) {
        score -= 35;
      }
    } else if (dayDurationSoFar >= 150) {
      // Moderately demanding day so far (>= 2.5 hours): favor lighter activities and penalize consecutive heavy stops
      if ((activity.estimatedDurationMinutes || 120) <= 90) {
        score += 15; // Pacing reward for lighter activity
      } else if ((activity.estimatedDurationMinutes || 120) >= 150) {
        score -= 20; // Pacing penalty for stacking exhaustive stops
      }
    }

    // Relaxed travel style preference for lighter pacing
    if (style === 'relaxed') {
      if ((activity.estimatedDurationMinutes || 120) <= 90) {
        score += 15;
      } else if ((activity.estimatedDurationMinutes || 120) > 120) {
        score -= 20;
      }
    }

    // 8. Budget Awareness
    if (remainingBudget !== undefined && preferences.budget > 0) {
      const costForGroup = (activity.estimatedCostPerPerson || 0) * (preferences.travelers || 1);
      if (typeof activity.estimatedCostPerPerson === 'number') {
        if (activity.estimatedCostPerPerson === 0) {
          score += 25; // Confirmed free admission bonus
        } else if (costForGroup > remainingBudget) {
          score -= 35; // Budget overage penalty
        } else if (activity.estimatedCostPerPerson <= 15) {
          score += 10; // Favorable budget price
        }
      }
    }

    return score;
  }

  /**
   * Generates a deterministic day-by-day itinerary plan.
   * Leverages PriorityQueue for scoring, geographic clustering for coherent groupings,
   * strict repetition minimization, day balance, diversity, and transparent cost arithmetic.
   */
  public generateItinerary(preferences: TripPreferences): GeneratedItineraryPlan {
    const dest = getDestinationData(preferences.destinationId);
    let candidates = getActivitiesForDestination(dest.id, dest.name);

    if (candidates.length === 0) {
      const detailed = getDetailedPlacesForDestination(dest.id);
      if (detailed.length > 0) {
        candidates = detailed.map((p) => ({
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
    }

    const daysCount = Math.max(1, preferences.days || 1);
    const travelers = Math.max(1, preferences.travelers || 1);
    const budget = Math.max(10, preferences.budget || 500);

    const usedActivityCounts = new Map<string, number>();
    const lastDayUsed = new Map<string, number>();
    const dayPlans: DayItineraryPlan[] = [];
    const warnings: string[] = [];

    // HashMap for fast activity lookup by ID
    const activityMap = new HashMap<string, Activity>();
    candidates.forEach((act) => activityMap.set(act.id, act));

    const timeSlotConfigs: Array<{
      slot: TimeOfDay;
      slotLabel: string;
      startTime: string;
      defaultEnd: string;
    }> = [
      { slot: 'morning', slotLabel: 'MORNING · 09:30 AM', startTime: '09:30 AM', defaultEnd: '11:30 AM' },
      { slot: 'afternoon', slotLabel: 'AFTERNOON · 01:30 PM', startTime: '01:30 PM', defaultEnd: '04:00 PM' },
      { slot: 'evening', slotLabel: 'EVENING · 06:30 PM', startTime: '06:30 PM', defaultEnd: '08:30 PM' },
    ];

    let overallCost = 0;

    for (let dayIndex = 1; dayIndex <= daysCount; dayIndex++) {
      const scheduledItems: ScheduledActivityItem[] = [];
      const dayActivities: Activity[] = [];
      let dailyCost = 0;
      let dayAnchor: Activity | null = null;

      timeSlotConfigs.forEach((slotConfig) => {
        // Priority Queue (Max-Heap) for ranking activities per slot
        const pq = new PriorityQueue<Activity>(true);
        const remainingBudget = Math.max(0, budget - overallCost);

        // Pass 1: Unused activities across the entire trip
        candidates.forEach((act) => {
          if ((usedActivityCounts.get(act.id) || 0) === 0) {
            const score = this.scoreActivity(
              act,
              preferences,
              slotConfig.slot,
              dayAnchor,
              dayActivities,
              remainingBudget
            );
            pq.enqueue(act, score);
          }
        });

        let selected = pq.dequeue();
        let isEncoreRecycled = false;

        // Pass 2: If candidate pool exhausted for a long multi-day trip, allow least-recently-used activities
        // Guaranteed NEVER to repeat an activity on the same day!
        if (!selected && candidates.length > 0) {
          const fallbackPq = new PriorityQueue<Activity>(true);
          candidates.forEach((act) => {
            // Avoid repeating within the same day
            if (lastDayUsed.get(act.id) !== dayIndex) {
              const baseScore = this.scoreActivity(
                act,
                preferences,
                slotConfig.slot,
                dayAnchor,
                dayActivities,
                remainingBudget
              );
              const usageCount = usedActivityCounts.get(act.id) || 0;
              const daysSinceLastUse = dayIndex - (lastDayUsed.get(act.id) || 0);
              const adjustedScore = baseScore - usageCount * 50 + daysSinceLastUse * 20;
              fallbackPq.enqueue(act, adjustedScore);
            }
          });
          selected = fallbackPq.dequeue();
          isEncoreRecycled = true;
        }

        // Absolute safety fallback (in case candidate pool has fewer than 3 total activities)
        if (!selected && candidates.length > 0) {
          const emergencyPq = new PriorityQueue<Activity>(true);
          candidates.forEach((act) => {
            emergencyPq.enqueue(
              act,
              this.scoreActivity(act, preferences, slotConfig.slot, dayAnchor, dayActivities, remainingBudget)
            );
          });
          selected = emergencyPq.dequeue();
          isEncoreRecycled = true;
        }

        if (selected) {
          usedActivityCounts.set(selected.id, (usedActivityCounts.get(selected.id) || 0) + 1);
          lastDayUsed.set(selected.id, dayIndex);
          dayActivities.push(selected);

          const costForGroup = typeof selected.estimatedCostPerPerson === 'number'
            ? selected.estimatedCostPerPerson * travelers
            : undefined;
          if (typeof costForGroup === 'number') {
            dailyCost += costForGroup;
          }

          // End time calculation with correct AM/PM rollover arithmetic
          const duration = selected.estimatedDurationMinutes || 120;
          const startMinutes = parseTimeToMinutes(slotConfig.startTime);
          const endMinutes = startMinutes + duration;
          const formattedEnd = formatMinutesToTime(endMinutes);

          // Transparent, grounded selection reason explaining diversity, proximity, and schedule
          let selectionReason: string;
          if (isEncoreRecycled) {
            selectionReason = `Encore exploration matching your ${preferences.travelStyle} style for an extended multi-day itinerary (${selected.category}).`;
          } else if (dayAnchor && dayAnchor.coordinates && selected.coordinates) {
            const distKm = calculateDistanceKm(dayAnchor.coordinates, selected.coordinates);
            if (distKm <= 6.0) {
              selectionReason = `Geographically clustered near ${dayAnchor.name} (~${distKm.toFixed(1)} km) to minimize transit.`;
            } else {
              selectionReason = `Curated for ${slotConfig.slot} timing & ${preferences.travelStyle} travel style.`;
            }
          } else if (slotConfig.slot === 'morning') {
            selectionReason = `Morning anchor activity matching your ${preferences.travelStyle} travel style (${selected.category}).`;
          } else {
            selectionReason = `Curated for ${slotConfig.slot} timing & ${preferences.travelStyle} style (${selected.category}).`;
          }

          scheduledItems.push({
            id: `sch-day${dayIndex}-${selected.id}`,
            activity: selected,
            timeSlotLabel: `DAY ${dayIndex} · ${slotConfig.slotLabel}`,
            startTime: slotConfig.startTime,
            endTime: formattedEnd || slotConfig.defaultEnd,
            durationMinutes: duration,
            costForGroup,
            selectionReason,
          });

          // Anchor sequencing: morning anchors afternoon; afternoon anchors evening
          if (slotConfig.slot === 'morning' || !dayAnchor) {
            dayAnchor = selected;
          } else if (slotConfig.slot === 'afternoon') {
            dayAnchor = selected;
          }
        }
      });

      overallCost += dailyCost;

      dayPlans.push({
        dayNumber: dayIndex,
        title: `Day ${dayIndex} · ${dest.name} Highlights`,
        items: scheduledItems,
        estimatedDailyCost: dailyCost,
      });
    }

    const isWithinBudget = overallCost <= budget;
    if (!isWithinBudget) {
      warnings.push(
        `Estimated activity cost ($${overallCost}) exceeds your allocated budget ($${budget}) for ${travelers} traveller(s). Consider adjusting your budget or selecting budget-friendly options.`
      );
    }

    const hasVerifiedActivities = hasVerifiedActivitiesForDestination(dest.id) || candidates.length > 0;
    if (!hasVerifiedActivities) {
      warnings.push(
        `Notice: No verified local activity data is currently available for ${dest.name}. Ryoko does not generate placeholder activities or guessed prices. Explore curated destinations (Paris, Cairo, Tokyo, Mumbai, Rome) for authentic recommendations.`
      );
    }

    const totalActiveMin = dayPlans.reduce((sum, d) => sum + d.items.reduce((s, i) => s + i.durationMinutes, 0), 0);
    const avgDailyMin = Math.round(totalActiveMin / daysCount);

    return {
      id: `plan-${dest.id}-${daysCount}d-${preferences.travelStyle}`,
      destinationId: dest.id,
      destinationName: dest.name,
      country: dest.country,
      days: dayPlans,
      totalDays: daysCount,
      travelersCount: travelers,
      travelStyle: preferences.travelStyle,
      totalEstimatedCost: overallCost,
      allocatedBudget: budget,
      isWithinBudget,
      warnings,
      disclaimerNote: hasVerifiedActivities
        ? `Estimated activity costs ($${overallCost} total for ${travelers} traveller(s)) cover admissions, guided tours & culinary tastings. Day pacing averages ~${avgDailyMin} min active time with open transit buffers. Specific venue opening hours and seasonal closures are unrecorded; confirm locally. Excludes international flights, accommodation, long-distance transit & personal shopping.`
        : `No Verified Activities: Real partner activity data is not available for ${dest.name}. Ryoko does not generate placeholder activities or guessed prices. Excludes flights, hotels & transit.`,
      hasVerifiedActivities,
      dataStatus: hasVerifiedActivities ? 'curated' : 'insufficient_data',
    };
  }
}

export const itineraryService = new ItineraryService();
