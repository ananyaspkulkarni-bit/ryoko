import type {
  AIPlanInput,
  AIPlanOutput,
  ValidationResult,
  GeneratedItineraryPlan,
  DayItineraryPlan,
  ScheduledActivityItem,
  Activity,
  TimeOfDay,
} from '../types';
import { HashMap } from '../ds/HashMap';
import { parseTimeToMinutes, formatMinutesToTime } from './itineraryService';

export class ItineraryValidator {
  /**
   * Validates AI-proposed itinerary against factual destination data,
   * performs deterministic arithmetic, checks budget constraints, and repairs invalid outputs.
   */
  public validateAndRepair(input: AIPlanInput, proposal: AIPlanOutput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // HashMap for fast O(1) candidate lookup
    const candidateMap = new HashMap<string, Activity>();
    input.candidateActivities.forEach((act) => candidateMap.set(act.id, act));

    if (!input.candidateActivities || input.candidateActivities.length === 0) {
      errors.push(
        `Unsupported destination: No candidate activities available for destination '${input.destinationId}'.`
      );
    }

    const usedActivityIds = new Set<string>();
    const repairedDays: DayItineraryPlan[] = [];
    let overallCost = 0;

    const daysCount = Math.max(1, input.days || 1);
    const travelers = Math.max(1, input.travelers || 1);

    const slotDefaults: Array<{ slot: TimeOfDay; label: string; start: string }> = [
      { slot: 'morning', label: 'MORNING · 09:30 AM', start: '09:30 AM' },
      { slot: 'afternoon', label: 'AFTERNOON · 01:30 PM', start: '01:30 PM' },
      { slot: 'evening', label: 'EVENING · 06:30 PM', start: '06:30 PM' },
    ];

    for (let dayIdx = 1; dayIdx <= daysCount; dayIdx++) {
      const proposedDay = proposal.days?.find((d) => d.dayNumber === dayIdx);
      const scheduledItems: ScheduledActivityItem[] = [];
      let dailyCost = 0;

      slotDefaults.forEach((slotInfo, slotIdx) => {
        let proposedItem = proposedDay?.items?.[slotIdx];
        let matchedActivity: Activity | undefined = undefined;

        if (proposedItem) {
          matchedActivity = candidateMap.get(proposedItem.activityId);
          if (!matchedActivity) {
            errors.push(
              `Day ${dayIdx} slot ${slotInfo.slot}: Invalid or unverified activity ID '${proposedItem.activityId}' proposed by AI. Safely substituted.`
            );
          } else if (matchedActivity.destinationId.toLowerCase() !== input.destinationId.toLowerCase()) {
            errors.push(
              `Day ${dayIdx}: Activity '${matchedActivity.name}' does not belong to destination '${input.destinationId}'. Safely substituted.`
            );
            matchedActivity = undefined;
          } else if (usedActivityIds.has(matchedActivity.id) && input.candidateActivities.length > usedActivityIds.size) {
            errors.push(
              `Day ${dayIdx}: Duplicate activity '${matchedActivity.name}' proposed by AI while unused candidates remain. Safely substituted.`
            );
            matchedActivity = undefined;
          }
        }

        // If activity was invalid or missing, pick an unused candidate
        if (!matchedActivity) {
          matchedActivity = input.candidateActivities.find((act) => !usedActivityIds.has(act.id));
          if (!matchedActivity && input.candidateActivities.length > 0) {
            matchedActivity = input.candidateActivities[slotIdx % input.candidateActivities.length];
          }
        }

        if (matchedActivity) {
          usedActivityIds.add(matchedActivity.id);
          
          // Deterministic Arithmetic: Cost = costPerPerson * travelers (if known)
          const costForGroup = typeof matchedActivity.estimatedCostPerPerson === 'number'
            ? matchedActivity.estimatedCostPerPerson * travelers
            : undefined;
          if (typeof costForGroup === 'number') {
            dailyCost += costForGroup;
          }

          const duration = matchedActivity.estimatedDurationMinutes || 120;
          const startTime = proposedItem?.suggestedStartTime || slotInfo.start;

          // Time formatting with accurate AM/PM rollover arithmetic
          const startMinutes = parseTimeToMinutes(startTime);
          const formattedEnd = formatMinutesToTime(startMinutes + duration);

          scheduledItems.push({
            id: `sch-ai-day${dayIdx}-${matchedActivity.id}`,
            activity: matchedActivity,
            timeSlotLabel: `DAY ${dayIdx} · ${slotInfo.label}`,
            startTime: startTime,
            endTime: formattedEnd,
            durationMinutes: duration,
            costForGroup,
            selectionReason: proposedItem?.selectionReason || `AI recommended for your ${input.travelStyle} preference.`,
          });
        }
      });

      overallCost += dailyCost;

      repairedDays.push({
        dayNumber: dayIdx,
        title: proposedDay?.theme || `Day ${dayIdx} · ${input.destinationName} Highlights`,
        items: scheduledItems,
        estimatedDailyCost: dailyCost,
      });
    }

    // Deterministic Budget Validation
    const isWithinBudget = overallCost <= input.budget;
    if (!isWithinBudget) {
      warnings.push(
        `Estimated activity cost ($${overallCost}) exceeds your allocated budget ($${input.budget}) for ${travelers} traveller(s).`
      );
    }

    if (proposal.warnings && proposal.warnings.length > 0) {
      warnings.push(...proposal.warnings);
    }

    const repairedPlan: GeneratedItineraryPlan = {
      id: `ai-plan-${input.destinationId}-${daysCount}d`,
      destinationId: input.destinationId,
      destinationName: input.destinationName,
      country: input.country,
      days: repairedDays,
      totalDays: daysCount,
      travelersCount: travelers,
      travelStyle: input.travelStyle,
      totalEstimatedCost: overallCost,
      allocatedBudget: input.budget,
      isWithinBudget,
      warnings,
      disclaimerNote: input.candidateActivities && input.candidateActivities.length > 0
        ? `Estimates based on known candidate activities ($${overallCost} total for ${travelers} travelers). Excludes long-distance flights, accommodation & personal shopping. Specific venue opening hours and seasonal availability are unrecorded in candidate records and should be confirmed locally before visiting.`
        : `No Verified Activities: Verified local activity data is not available for ${input.destinationName}. Ryoko does not generate placeholder activities or guessed prices. Excludes flights, accommodation & transit.`,
    };

    return {
      isValid: errors.length === 0,
      repairedPlan,
      errors,
      warnings,
      usedFallback: false,
    };
  }
}

export const itineraryValidator = new ItineraryValidator();
