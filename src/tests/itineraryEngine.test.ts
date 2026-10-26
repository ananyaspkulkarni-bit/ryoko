import { describe, it, expect } from 'vitest';
import { itineraryService } from '../services/itineraryService';
import { getActivitiesForDestination } from '../data/activities';

describe('Ryoko Itinerary Planning Engine Suite', () => {
  it('Egypt produces ONLY Egypt activities', () => {
    const plan = itineraryService.generateItinerary({
      destinationId: 'cairo',
      days: 2,
      travelers: 2,
      budget: 500,
      travelStyle: 'culture',
    });

    expect(plan.destinationId).toBe('cairo');
    expect(plan.country).toBe('Egypt');
    expect(plan.days.length).toBe(2);

    plan.days.forEach((day) => {
      day.items.forEach((item) => {
        expect(item.activity.destinationId).toBe('cairo');
        expect(item.activity.description).not.toContain('Paris');
        expect(item.activity.description).not.toContain('Tokyo');
      });
    });
  });

  it('Tokyo produces ONLY Tokyo activities', () => {
    const plan = itineraryService.generateItinerary({
      destinationId: 'tokyo',
      days: 3,
      travelers: 1,
      budget: 600,
      travelStyle: 'foodie',
    });

    expect(plan.destinationId).toBe('tokyo');
    expect(plan.days.length).toBe(3);

    plan.days.forEach((day) => {
      day.items.forEach((item) => {
        expect(item.activity.destinationId).toBe('tokyo');
        expect(item.activity.description).not.toContain('Pyramids');
        expect(item.activity.description).not.toContain('Eiffel');
      });
    });
  });

  it('Paris continues to produce Paris activities', () => {
    const plan = itineraryService.generateItinerary({
      destinationId: 'paris',
      days: 1,
      travelers: 1,
      budget: 300,
      travelStyle: 'culture',
    });

    expect(plan.destinationId).toBe('paris');
    expect(plan.days.length).toBe(1);
    expect(plan.days[0].items.length).toBeGreaterThan(0);
    expect(plan.days[0].items[0].activity.destinationId).toBe('paris');
  });

  it('A one-day trip produces one day', () => {
    const plan = itineraryService.generateItinerary({
      destinationId: 'cairo',
      days: 1,
      travelers: 1,
      budget: 300,
      travelStyle: 'relaxed',
    });

    expect(plan.totalDays).toBe(1);
    expect(plan.days.length).toBe(1);
  });

  it('A three-day trip produces three days with no unnecessary repetitions', () => {
    const plan = itineraryService.generateItinerary({
      destinationId: 'cairo',
      days: 3,
      travelers: 2,
      budget: 500,
      travelStyle: 'culture',
    });

    expect(plan.totalDays).toBe(3);
    expect(plan.days.length).toBe(3);

    const activityIds = new Set<string>();
    plan.days.forEach((day) => {
      day.items.forEach((item) => {
        expect(activityIds.has(item.activity.id)).toBe(false);
        activityIds.add(item.activity.id);
      });
    });
  });

  it('Activities do not overlap in time within the same day', () => {
    const plan = itineraryService.generateItinerary({
      destinationId: 'tokyo',
      days: 2,
      travelers: 2,
      budget: 500,
      travelStyle: 'foodie',
    });

    plan.days.forEach((day) => {
      const slots = day.items.map((i) => i.startTime);
      const uniqueSlots = new Set(slots);
      expect(uniqueSlots.size).toBe(slots.length);
    });
  });

  it('Costs scale correctly with number of travellers', () => {
    const soloPlan = itineraryService.generateItinerary({
      destinationId: 'rome',
      days: 1,
      travelers: 1,
      budget: 500,
      travelStyle: 'culture',
    });

    const duoPlan = itineraryService.generateItinerary({
      destinationId: 'rome',
      days: 1,
      travelers: 2,
      budget: 500,
      travelStyle: 'culture',
    });

    expect(duoPlan.totalEstimatedCost).toBe(soloPlan.totalEstimatedCost * 2);
  });

  it('An infeasible budget produces a clear warning rather than silently claiming success', () => {
    const tightPlan = itineraryService.generateItinerary({
      destinationId: 'tokyo',
      days: 3,
      travelers: 4,
      budget: 50, // Unreasonably low budget for 4 people over 3 days
      travelStyle: 'foodie',
    });

    expect(tightPlan.isWithinBudget).toBe(false);
    expect(tightPlan.warnings.length).toBeGreaterThan(0);
    expect(tightPlan.warnings[0]).toContain('exceeds your allocated budget');
  });

  it('Missing activity data for unknown destinations is handled safely', () => {
    const unknownPlan = itineraryService.generateItinerary({
      destinationId: 'atlantis',
      days: 2,
      travelers: 1,
      budget: 300,
      travelStyle: 'relaxed',
    });

    expect(unknownPlan).toBeDefined();
    expect(unknownPlan.days.length).toBe(2);
    expect(unknownPlan.destinationId).toBe('atlantis');
    expect(unknownPlan.days.every((day) => day.items.length === 0)).toBe(true);
    expect(unknownPlan.totalEstimatedCost).toBe(0);
    expect(unknownPlan.hasVerifiedActivities).toBe(false);
    expect(unknownPlan.dataStatus).toBe('insufficient_data');
  });

  it('Identical inputs produce the exact same itinerary (determinism)', () => {
    const req = {
      destinationId: 'mumbai',
      days: 2,
      travelers: 2,
      budget: 400,
      travelStyle: 'culture' as const,
    };

    const plan1 = itineraryService.generateItinerary(req);
    const plan2 = itineraryService.generateItinerary(req);

    expect(JSON.stringify(plan1)).toBe(JSON.stringify(plan2));
  });

  it('Verifies getActivitiesForDestination helper function', () => {
    const cairoActs = getActivitiesForDestination('cairo');
    expect(cairoActs.length).toBeGreaterThan(0);
    expect(cairoActs.every((a) => a.destinationId === 'cairo')).toBe(true);
  });
});
