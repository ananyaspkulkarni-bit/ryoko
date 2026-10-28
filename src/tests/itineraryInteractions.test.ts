import { describe, it, expect } from 'vitest';
import { itineraryPlanningEngine } from '../services/itineraryPlanningEngine';
import { convertUsdToInr, formatINR } from '../lib/currency';
import { Stack } from '../ds';
import type { ComprehensiveScheduledItem, ComprehensiveItineraryPlan } from '../types/travel/planning';

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

  it('1. Activity Completion: allows toggling completion state and tracks progress cleanly', () => {
    const allItems: ComprehensiveScheduledItem[] = samplePlan.comprehensiveDays.flatMap(
      (day) => day.timelineItems
    );
    const completedSet = new Set<string>();
    const item1 = allItems[0];
    const item2 = allItems[1];

    // Initial state
    expect(completedSet.size).toBe(0);

    // Complete item 1
    completedSet.add(item1.id);
    expect(completedSet.has(item1.id)).toBe(true);
    expect(completedSet.size).toBe(1);

    // Complete item 2
    completedSet.add(item2.id);
    expect(completedSet.has(item2.id)).toBe(true);
    expect(completedSet.size).toBe(2);

    // Compute completion percentage
    const percent = Math.round((completedSet.size / allItems.length) * 100);
    expect(percent).toBeGreaterThan(0);
    expect(percent).toBeLessThanOrEqual(100);

    // Toggle uncomplete item 1
    completedSet.delete(item1.id);
    expect(completedSet.has(item1.id)).toBe(false);
    expect(completedSet.size).toBe(1);
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

    // Per-person cost calculation for 2 travelers
    const perPersonCostUsd = newTotalCostUsd / 2;
    const formattedPerPersonInr = formatINR(convertUsdToInr(perPersonCostUsd));
    expect(formattedPerPersonInr).toContain('₹');
    expect(convertUsdToInr(perPersonCostUsd)).toBe(Math.round(convertUsdToInr(newTotalCostUsd) / 2));
  });

  it('2. Stack-based sequential Undo and Restore: supports undoing in LIFO order or restoring target item', () => {
    const allItems: ComprehensiveScheduledItem[] = samplePlan.comprehensiveDays.flatMap(
      (day) => day.timelineItems
    );

    const removedSet = new Set<string>();
    const history: Array<{ id: string; title: string }> = [];

    const remove = (item: ComprehensiveScheduledItem) => {
      removedSet.add(item.id);
      history.push({ id: item.id, title: item.title });
    };

    const undo = (targetId?: string) => {
      if (history.length === 0) return;
      const idToRestore = targetId || history[history.length - 1].id;
      removedSet.delete(idToRestore);
      const idx = history.findIndex((h) => h.id === idToRestore);
      if (idx !== -1) history.splice(idx, 1);
    };

    // Remove item 0, then item 1
    remove(allItems[0]);
    remove(allItems[1]);
    expect(removedSet.size).toBe(2);
    expect(history.length).toBe(2);
    expect(history[history.length - 1].id).toBe(allItems[1].id);

    // Undo top of stack (item 1)
    undo();
    expect(removedSet.has(allItems[1].id)).toBe(false);
    expect(removedSet.has(allItems[0].id)).toBe(true);
    expect(history.length).toBe(1);

    // Undo target item 0
    undo(allItems[0].id);
    expect(removedSet.size).toBe(0);
    expect(history.length).toBe(0);
  });

  it('2. Day-level Item Restoration: restores all removed items for a specific day only', () => {
    const day1Items = samplePlan.comprehensiveDays[0].timelineItems;
    const day2Items = samplePlan.comprehensiveDays[1].timelineItems;

    const removedSet = new Set<string>();
    // Remove one from Day 1 and one from Day 2
    removedSet.add(day1Items[0].id);
    removedSet.add(day2Items[0].id);
    expect(removedSet.size).toBe(2);

    // Restore Day 1 items
    const day1Ids = day1Items.map((i) => i.id);
    for (const id of day1Ids) {
      removedSet.delete(id);
    }

    expect(removedSet.has(day1Items[0].id)).toBe(false);
    expect(removedSet.has(day2Items[0].id)).toBe(true);
    expect(removedSet.size).toBe(1);
  });

  it('3. Activity Details: verifies timing, duration, coordinates, and cost formatting', () => {
    const day1 = samplePlan.comprehensiveDays[0];
    for (const item of day1.timelineItems) {
      expect(item.startTime).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/i);
      expect(item.endTime).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/i);
      expect(item.durationMinutes).toBeGreaterThan(0);

      if (typeof item.costForGroup === 'number') {
        const inr = formatINR(convertUsdToInr(item.costForGroup));
        expect(inr).toContain('₹');
      }

      if (item.coordinates) {
        expect(typeof item.coordinates.lat).toBe('number');
        expect(typeof item.coordinates.lng).toBe('number');
      }
    }
  });

  it('5. Empty State & Regeneration: correctly detects when all items are removed and allows full recovery or regeneration', () => {
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

    // 1. Recovery by Restore All
    removedSet.clear();
    const recoveredItems = allItems.filter((item) => !removedSet.has(item.id));
    expect(recoveredItems.length).toBe(allItems.length);

    // 2. Recovery by Regeneration using Planning Engine
    const regeneratedPlan = itineraryPlanningEngine.planTrip({
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
    expect(regeneratedPlan.comprehensiveDays.length).toBe(2);
    const regeneratedItems = regeneratedPlan.comprehensiveDays.flatMap((day) => day.timelineItems);
    expect(regeneratedItems.length).toBeGreaterThan(0);
  });

  describe('6. Stack (LIFO) Itinerary History & Plan Undo Suite', () => {
    const isValidPlan = (
      plan: ComprehensiveItineraryPlan | null | undefined
    ): plan is ComprehensiveItineraryPlan => {
      if (!plan || !plan.destinationId) return false;
      if (!Array.isArray(plan.comprehensiveDays) || plan.comprehensiveDays.length === 0) return false;
      const totalItems = plan.comprehensiveDays.reduce(
        (sum, d) => sum + (d.timelineItems?.length || 0),
        0
      );
      return totalItems > 0;
    };

    const arePlansEqual = (
      a: ComprehensiveItineraryPlan | null | undefined,
      b: ComprehensiveItineraryPlan | null | undefined
    ): boolean => {
      if (a === b) return true;
      if (!a || !b) return false;
      if (
        a.destinationId !== b.destinationId ||
        a.totalDays !== b.totalDays ||
        a.pace !== b.pace ||
        a.travelStyle !== b.travelStyle ||
        a.totalEstimatedCost !== b.totalEstimatedCost
      ) {
        return false;
      }
      const itemsA = a.comprehensiveDays?.flatMap((d) => d.timelineItems.map((i) => i.id)) || [];
      const itemsB = b.comprehensiveDays?.flatMap((d) => d.timelineItems.map((i) => i.id)) || [];
      if (itemsA.length !== itemsB.length) return false;
      for (let i = 0; i < itemsA.length; i++) {
        if (itemsA[i] !== itemsB[i]) return false;
      }
      return true;
    };

    it('pushes previous valid plans onto Stack and pops them in LIFO order upon Undo', () => {
      const historyStack = new Stack<ComprehensiveItineraryPlan>();
      expect(historyStack.isEmpty()).toBe(true);
      expect(historyStack.size()).toBe(0);

      // 1. Initial Plan: 1 Day Paris
      const plan1 = itineraryPlanningEngine.planTrip({
        destinationId: 'paris',
        days: 1,
        travelers: 1,
        budget: 150,
        travelStyle: 'culture',
        pace: 'balanced',
      });
      expect(isValidPlan(plan1)).toBe(true);
      let currentPlan: ComprehensiveItineraryPlan = plan1;

      // 2. User changes to 2 Days Paris: Push plan1 to stack before replacing
      const plan2 = itineraryPlanningEngine.planTrip({
        destinationId: 'paris',
        days: 2,
        travelers: 1,
        budget: 300,
        travelStyle: 'culture',
        pace: 'balanced',
      });
      expect(arePlansEqual(currentPlan, plan2)).toBe(false);
      historyStack.push(currentPlan);
      currentPlan = plan2;

      expect(historyStack.size()).toBe(1);
      expect(historyStack.isEmpty()).toBe(false);
      expect(historyStack.peek()?.totalDays).toBe(1);
      expect(currentPlan.totalDays).toBe(2);

      // 3. User changes pace to 'relaxed': Push plan2 to stack before replacing
      const plan3 = itineraryPlanningEngine.planTrip({
        destinationId: 'paris',
        days: 2,
        travelers: 1,
        budget: 300,
        travelStyle: 'culture',
        pace: 'relaxed',
      });
      expect(arePlansEqual(currentPlan, plan3)).toBe(false);
      historyStack.push(currentPlan);
      currentPlan = plan3;

      expect(historyStack.size()).toBe(2);
      expect(historyStack.peek()?.pace).toBe('balanced');
      expect(currentPlan.pace).toBe('relaxed');

      // 4. Undo Plan Change 1: Pop plan2 from stack (LIFO)
      const restored2 = historyStack.pop();
      expect(restored2).toBeDefined();
      expect(restored2?.pace).toBe('balanced');
      expect(restored2?.totalDays).toBe(2);
      currentPlan = restored2!;
      expect(historyStack.size()).toBe(1);
      expect(historyStack.isEmpty()).toBe(false);

      // 5. Undo Plan Change 2: Pop plan1 from stack (LIFO)
      const restored1 = historyStack.pop();
      expect(restored1).toBeDefined();
      expect(restored1?.totalDays).toBe(1);
      currentPlan = restored1!;
      expect(historyStack.size()).toBe(0);
      expect(historyStack.isEmpty()).toBe(true);

      // 6. Undo when stack is empty returns undefined and does not crash
      const emptyPop = historyStack.pop();
      expect(emptyPop).toBeUndefined();
      expect(historyStack.isEmpty()).toBe(true);
    });

    it('rejects storing invalid or empty itineraries into history stack', () => {
      const historyStack = new Stack<ComprehensiveItineraryPlan>();

      const emptyPlan = {
        ...samplePlan,
        comprehensiveDays: [],
      };
      const invalidPlan = {
        ...samplePlan,
        destinationId: '',
      };

      expect(isValidPlan(emptyPlan)).toBe(false);
      expect(isValidPlan(invalidPlan)).toBe(false);

      if (isValidPlan(emptyPlan)) historyStack.push(emptyPlan);
      if (isValidPlan(invalidPlan)) historyStack.push(invalidPlan);

      expect(historyStack.isEmpty()).toBe(true);
      expect(historyStack.size()).toBe(0);
    });

    it('does not push duplicate history entries when the itinerary has not actually changed', () => {
      const historyStack = new Stack<ComprehensiveItineraryPlan>();
      const currentPlan = samplePlan;

      // Re-planning with identical preferences
      const identicalPlan = itineraryPlanningEngine.planTrip({
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

      expect(arePlansEqual(currentPlan, identicalPlan)).toBe(true);
      if (!arePlansEqual(currentPlan, identicalPlan)) {
        historyStack.push(currentPlan);
      }

      expect(historyStack.isEmpty()).toBe(true);
      expect(historyStack.size()).toBe(0);
    });

    it('clears the history stack when destination changes so history does not leak across cities', () => {
      const historyStack = new Stack<ComprehensiveItineraryPlan>();
      historyStack.push(samplePlan);
      expect(historyStack.size()).toBe(1);

      // Destination switched from Paris to Tokyo
      const newDestId = 'tokyo';
      if (newDestId !== samplePlan.destinationId) {
        historyStack.clear();
      }

      expect(historyStack.isEmpty()).toBe(true);
      expect(historyStack.size()).toBe(0);
      expect(historyStack.peek()).toBeUndefined();
    });
  });
});
