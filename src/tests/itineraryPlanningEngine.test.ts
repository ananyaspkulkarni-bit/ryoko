import { describe, it, expect } from 'vitest';
import { itineraryPlanningEngine } from '../services/itineraryPlanningEngine';

describe('Itinerary Planning Engine Comprehensive Suite', () => {
  describe('1. Destination Selection & Multi-City Support', () => {
    it('plans successfully for all 5 core destinations: Paris, Tokyo, Cairo, Mumbai, Rome', () => {
      const cities = ['paris', 'tokyo', 'cairo', 'mumbai', 'rome'];

      for (const city of cities) {
        const plan = itineraryPlanningEngine.planTrip({
          destinationId: city,
          days: 2,
          travelers: 2,
          budget: 500,
          travelStyle: 'culture',
        });

        expect(plan.destinationId).toBe(city);
        expect(plan.days.length).toBe(2);
        expect(plan.hasVerifiedActivities).toBe(true);
        expect(plan.dataStatus).toBe('curated');
        expect(plan.comprehensiveDays.length).toBe(2);

        // Verify scheduled items belong solely to that destination
        plan.days.forEach((day) => {
          day.items.forEach((item) => {
            expect(item.activity.destinationId).toBe(city);
          });
        });
      }
    });

    it('handles unresolved/unknown destinations honestly without inventing synthetic venues', () => {
      const plan = itineraryPlanningEngine.planTrip({
        destinationId: 'atlantis-fantasy-city',
        days: 1,
        travelers: 1,
        budget: 300,
      });

      expect(plan.destinationId).toBe('atlantis-fantasy-city');
      expect(plan.hasVerifiedActivities).toBe(false);
      expect(plan.dataStatus).toBe('insufficient_data');
      expect(plan.warnings.some((w) => w.includes('No verified local activity data'))).toBe(true);
      expect(plan.days[0].items.length).toBe(0);
    });
  });

  describe('2. Attraction Interest Matching & Pacing', () => {
    it('matches user interests when scoring and scheduling attractions', () => {
      const artPlan = itineraryPlanningEngine.planTrip({
        destinationId: 'paris',
        days: 1,
        travelers: 1,
        budget: 300,
        travelStyle: 'culture',
        interests: ['museum', 'art', 'mona-lisa'],
      });

      const day1Titles = artPlan.days[0].items.map((i) => i.activity.name);
      expect(day1Titles.some((t) => t.includes('Louvre') || t.includes("d'Orsay"))).toBe(true);

      const foodiePlan = itineraryPlanningEngine.planTrip({
        destinationId: 'tokyo',
        days: 1,
        travelers: 1,
        budget: 300,
        travelStyle: 'foodie',
        interests: ['sushi', 'market', 'yakitori'],
      });

      const tokyoDay1Titles = foodiePlan.days[0].items.map((i) => i.activity.name);
      expect(tokyoDay1Titles.some((t) => t.includes('Tsukiji') || t.includes('Yokocho'))).toBe(true);
    });

    it('respects pace level: relaxed schedules 2 activities, balanced 3, fast-paced 4', () => {
      const relaxed = itineraryPlanningEngine.planTrip({
        destinationId: 'cairo',
        days: 1,
        travelers: 1,
        budget: 400,
        pace: 'relaxed',
      });
      expect(relaxed.days[0].items.length).toBe(2);

      const balanced = itineraryPlanningEngine.planTrip({
        destinationId: 'cairo',
        days: 1,
        travelers: 1,
        budget: 400,
        pace: 'balanced',
      });
      expect(balanced.days[0].items.length).toBe(3);

      const fastPaced = itineraryPlanningEngine.planTrip({
        destinationId: 'cairo',
        days: 1,
        travelers: 1,
        budget: 400,
        pace: 'fast-paced',
      });
      expect(fastPaced.days[0].items.length).toBe(4);
    });
  });

  describe('3. Attraction Proximity Grouping (Geographic Clustering)', () => {
    it('groups nearby attractions together to minimize cross-city transit', () => {
      // In Cairo: Pyramids and Grand Egyptian Museum (GEM) are on the Giza plateau (~2.2 km apart)
      const plan = itineraryPlanningEngine.planTrip({
        destinationId: 'cairo',
        days: 1,
        travelers: 2,
        budget: 400,
        travelStyle: 'culture',
        pace: 'relaxed',
      });

      const dayItems = plan.days[0].items;
      expect(dayItems.length).toBe(2);

      const act1 = dayItems[0].activity;
      const act2 = dayItems[1].activity;

      // Both should be on the Giza quadrant
      expect(act1.coordinates).toBeDefined();
      expect(act2.coordinates).toBeDefined();

      const timelineDay = plan.comprehensiveDays[0];
      const secondItem = timelineDay.timelineItems.find((i) => i.id === dayItems[1].id);
      expect(secondItem?.transitFromPrevious).toBeDefined();
      expect(secondItem?.transitFromPrevious?.distanceKm).toBeLessThan(8.0);
    });
  });

  describe('4. Opening Hours & Visit Duration Constraints', () => {
    it('avoids scheduling Musée du Louvre on Tuesdays when it is known to be closed', () => {
      // 2026-06-02 is a Tuesday!
      const tuesdayPlan = itineraryPlanningEngine.planTrip({
        destinationId: 'paris',
        startDate: '2026-06-02', // Tuesday
        days: 1,
        travelers: 1,
        budget: 300,
        travelStyle: 'culture',
        interests: ['museum', 'art'],
      });

      const day1Names = tuesdayPlan.days[0].items.map((i) => i.activity.name);
      // Louvre is closed Tuesdays, so it must NOT be scheduled on Tuesday!
      expect(day1Names.some((n) => n.includes('Louvre'))).toBe(false);

      // 2026-06-03 is a Wednesday (Louvre is open!)
      const wednesdayPlan = itineraryPlanningEngine.planTrip({
        destinationId: 'paris',
        startDate: '2026-06-03', // Wednesday
        days: 1,
        travelers: 1,
        budget: 300,
        travelStyle: 'culture',
        interests: ['museum', 'art', 'louvre'],
      });

      const wedNames = wednesdayPlan.days[0].items.map((i) => i.activity.name);
      expect(wedNames.some((n) => n.includes('Louvre'))).toBe(true);
    });

    it('avoids scheduling Vatican Museums on Sundays when closed', () => {
      // 2026-06-07 is a Sunday!
      const sundayPlan = itineraryPlanningEngine.planTrip({
        destinationId: 'rome',
        startDate: '2026-06-07', // Sunday
        days: 1,
        travelers: 1,
        budget: 300,
        travelStyle: 'culture',
        interests: ['museum', 'vatican'],
      });

      const dayNames = sundayPlan.days[0].items.map((i) => i.activity.name);
      expect(dayNames.some((n) => n.includes('Vatican'))).toBe(false);
    });
  });

  describe('5. Meal Breaks & Travel Buffers', () => {
    it('includes reasonable midday meal breaks with estimated costs', () => {
      const plan = itineraryPlanningEngine.planTrip({
        destinationId: 'paris',
        days: 2,
        travelers: 2,
        budget: 500,
        includeMeals: true,
      });

      plan.comprehensiveDays.forEach((day) => {
        expect(day.mealBreaks.length).toBeGreaterThan(0);
        const lunch = day.mealBreaks[0];
        expect(lunch.mealType).toBe('lunch');
        expect(lunch.durationMinutes).toBeGreaterThanOrEqual(45);
        expect(lunch.costForGroup).toBe(18 * 2); // $18 * 2 travelers
      });
    });

    it('records transit buffers between consecutive stops based on geodesic distance', () => {
      const plan = itineraryPlanningEngine.planTrip({
        destinationId: 'tokyo',
        days: 1,
        travelers: 1,
        budget: 400,
        pace: 'balanced',
      });

      const day = plan.comprehensiveDays[0];
      expect(day.transitMinutesTotal).toBeGreaterThan(0);

      // Find the afternoon activity (which follows morning activity)
      const activityItems = day.timelineItems.filter((i) => i.itemType === 'activity');
      if (activityItems.length >= 2) {
        const secondAct = activityItems[1];
        expect(secondAct.transitFromPrevious).toBeDefined();
        expect(secondAct.transitFromPrevious?.estimatedMinutes).toBeGreaterThan(0);
      }
    });
  });

  describe('6. Missing & Estimated Data Handling', () => {
    it('flags unrecorded admission prices and unrecorded opening hours honestly without inventing facts', () => {
      const plan = itineraryPlanningEngine.planTrip({
        destinationId: 'cairo',
        days: 1,
        travelers: 2,
        budget: 400,
      });

      expect(plan.unrecordedDataFlags).toBeDefined();
      expect(plan.unrecordedDataFlags.notes.length).toBeGreaterThan(0);
      expect(plan.unrecordedDataFlags.isTransitEstimated).toBe(true);
      expect(plan.unrecordedDataFlags.isWeatherEstimated).toBe(true);

      // Verify disclaimer note is present
      expect(plan.disclaimerNote).toBeDefined();
      expect(plan.disclaimerNote.length).toBeGreaterThan(20);
    });
  });

  describe('7. Invalid Trip Inputs Handling', () => {
    it('validates and rejects empty destination, negative budget, negative days, and inverted dates', () => {
      // 1. Empty destination
      const v1 = itineraryPlanningEngine.validateRequest({
        destinationId: '   ',
        days: 2,
      });
      expect(v1.isValid).toBe(false);
      expect(v1.errors.some((e) => e.includes('Destination is required'))).toBe(true);

      // 2. Negative days
      const v2 = itineraryPlanningEngine.validateRequest({
        destinationId: 'paris',
        days: -3,
      });
      expect(v2.isValid).toBe(false);
      expect(v2.errors.some((e) => e.includes('must be at least 1'))).toBe(true);

      // 3. Negative budget
      const v3 = itineraryPlanningEngine.validateRequest({
        destinationId: 'paris',
        budget: -50,
      });
      expect(v3.isValid).toBe(false);
      expect(v3.errors.some((e) => e.includes('cannot be negative'))).toBe(true);

      // 4. Inverted dates (startDate > endDate)
      const v4 = itineraryPlanningEngine.validateRequest({
        destinationId: 'paris',
        startDate: '2026-06-10',
        endDate: '2026-06-02',
      });
      expect(v4.isValid).toBe(false);
      expect(v4.errors.some((e) => e.includes('cannot be after endDate'))).toBe(true);
    });

    it('safely handles invalid inputs during planTrip execution without throwing unhandled exceptions', () => {
      // Safely executes even on garbage input by normalizing and populating warnings
      const plan = itineraryPlanningEngine.planTrip({
        destinationId: '',
        days: -5,
        budget: -100,
        startDate: '2026-06-10',
        endDate: '2026-06-02',
      });

      expect(plan).toBeDefined();
      expect(plan.warnings.length).toBeGreaterThan(0);
      expect(plan.totalDays).toBeGreaterThanOrEqual(1);
    });
  });
});
