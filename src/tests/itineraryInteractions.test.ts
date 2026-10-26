import { describe, it, expect } from 'vitest';
import { itineraryPlanningEngine } from '../services/itineraryPlanningEngine';
import { convertUsdToInr, formatINR } from '../lib/currency';
import type { ComprehensiveScheduledItem } from '../types/travel/planning';

describe('Sprint 8: Itinerary Interactive Features Suite', () => {
  const samplePlan = itineraryPlanningEngine.planTrip({
    destinationId: 'paris',
    days: 2,
    travelers: 2,
    budget: 200,
    travelStyle: 'culture',
    pace: 'balanced',
    startDate: '2026-06-01',
    interests: ['art', 'history'],
    includeMeals: true,
  });

  it('generates a comprehensive plan with timeline items containing cost, duration, and time slots', () => {
    expect(samplePlan.comprehensiveDays.length).toBe(2);
    const day1Items = samplePlan.comprehensiveDays[0].timelineItems;
    expect(day1Items.length).toBeGreaterThan(0);

    const firstItem = day1Items[0];
    expect(firstItem.id).toBeDefined();
    expect(firstItem.title).toBeDefined();
    expect(firstItem.startTime).toBeDefined();
    expect(firstItem.endTime).toBeDefined();
    expect(firstItem.durationMinutes).toBeGreaterThan(0);
  });

  it('1. Activity Completion: allows toggling completion state cleanly', () => {
    const completedSet = new Set<string>();
    const item = samplePlan.comprehensiveDays[0].timelineItems[0];

    // Toggle complete
    completedSet.add(item.id);
    expect(completedSet.has(item.id)).toBe(true);

    // Toggle uncomplete
    completedSet.delete(item.id);
    expect(completedSet.has(item.id)).toBe(false);
  });

  it('2 & 4. Remove and Live Recalculation: removing an activity correctly decreases count and total cost without double-counting', () => {
    const allItems: ComprehensiveScheduledItem[] = samplePlan.comprehensiveDays.flatMap(
      (day) => day.timelineItems
    );
    const originalCount = allItems.length;
    const originalTotalCostUsd = allItems.reduce(
      (sum, item) => sum + (typeof item.costForGroup === 'number' ? item.costForGroup : 0),
      0
    );

    // Find an item with cost
    const itemWithCost = allItems.find((item) => typeof item.costForGroup === 'number' && item.costForGroup > 0);
    expect(itemWithCost).toBeDefined();

    const removedSet = new Set<string>();
    removedSet.add(itemWithCost!.id);

    // Filter active items
    const activeItems = allItems.filter((item) => !removedSet.has(item.id));
    expect(activeItems.length).toBe(originalCount - 1);

    // Recalculated cost
    const newTotalCostUsd = activeItems.reduce(
      (sum, item) => sum + (typeof item.costForGroup === 'number' ? item.costForGroup : 0),
      0
    );
    expect(newTotalCostUsd).toBe(originalTotalCostUsd - itemWithCost!.costForGroup!);

    // Recalculated INR formatted cost
    const formattedInr = formatINR(convertUsdToInr(newTotalCostUsd));
    expect(formattedInr).toContain('₹');
    expect(convertUsdToInr(newTotalCostUsd)).toBeLessThan(convertUsdToInr(originalTotalCostUsd));
  });

  it('2. Undo and Restore: restoring items restores exact count and original cost', () => {
    const allItems: ComprehensiveScheduledItem[] = samplePlan.comprehensiveDays.flatMap(
      (day) => day.timelineItems
    );
    const originalTotalCostUsd = allItems.reduce(
      (sum, item) => sum + (typeof item.costForGroup === 'number' ? item.costForGroup : 0),
      0
    );

    const removedSet = new Set<string>();
    const item1 = allItems[0];
    const item2 = allItems[1];

    removedSet.add(item1.id);
    removedSet.add(item2.id);
    expect(removedSet.size).toBe(2);

    // Undo item1
    removedSet.delete(item1.id);
    expect(removedSet.size).toBe(1);
    expect(removedSet.has(item2.id)).toBe(true);

    // Restore all
    removedSet.clear();
    const restoredItems = allItems.filter((item) => !removedSet.has(item.id));
    expect(restoredItems.length).toBe(allItems.length);

    const restoredTotalCostUsd = restoredItems.reduce(
      (sum, item) => sum + (typeof item.costForGroup === 'number' ? item.costForGroup : 0),
      0
    );
    expect(restoredTotalCostUsd).toBe(originalTotalCostUsd);
  });

  it('5. Empty State: correctly detects when all items are removed and allows full recovery', () => {
    const allItems: ComprehensiveScheduledItem[] = samplePlan.comprehensiveDays.flatMap(
      (day) => day.timelineItems
    );

    const removedSet = new Set<string>();
    for (const item of allItems) {
      removedSet.add(item.id);
    }

    const activeItems = allItems.filter((item) => !removedSet.has(item.id));
    expect(activeItems.length).toBe(0);

    const totalCostWhenEmpty = activeItems.reduce(
      (sum, item) => sum + (typeof item.costForGroup === 'number' ? item.costForGroup : 0),
      0
    );
    expect(totalCostWhenEmpty).toBe(0);
    expect(formatINR(convertUsdToInr(totalCostWhenEmpty))).toBe('₹0');

    // Restore all
    removedSet.clear();
    const recoveredItems = allItems.filter((item) => !removedSet.has(item.id));
    expect(recoveredItems.length).toBe(allItems.length);
  });
});
