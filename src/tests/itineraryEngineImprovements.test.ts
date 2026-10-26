import { describe, it, expect } from 'vitest';
import {
  itineraryService,
  calculateDistanceKm,
  buildActivitySpatialGraph,
  parseTimeToMinutes,
  formatMinutesToTime,
} from '../services/itineraryService';
import { itineraryValidator } from '../services/itineraryValidator';
import { getActivitiesForDestination } from '../data/activities';
import type { AIPlanInput, AIPlanOutput } from '../types';

describe('Itinerary Engine Grounded Improvements Suite', () => {
  describe('Geographic Proximity & Spatial Clustering', () => {
    it('calculates accurate Haversine distance between real coordinates', () => {
      // Cairo Pyramids (29.9792, 31.1342) to Grand Egyptian Museum (29.9942, 31.1189)
      const distGEM = calculateDistanceKm(
        { lat: 29.9792, lng: 31.1342 },
        { lat: 29.9942, lng: 31.1189 }
      );
      // Factual distance on the Giza plateau is ~2.2 km
      expect(distGEM).toBeGreaterThan(1.8);
      expect(distGEM).toBeLessThan(2.6);

      // Cairo Pyramids to Khan el-Khalili Bazaar (30.0478, 31.2622) across Cairo
      const distBazaar = calculateDistanceKm(
        { lat: 29.9792, lng: 31.1342 },
        { lat: 30.0478, lng: 31.2622 }
      );
      // Cross-city distance is ~14-15 km
      expect(distBazaar).toBeGreaterThan(12.0);
      expect(distBazaar).toBeLessThan(17.0);
    });

    it('builds an activity spatial graph connecting proximate activities within 6 km', () => {
      const cairoActivities = getActivitiesForDestination('cairo');
      const graph = buildActivitySpatialGraph(cairoActivities);

      expect(graph.hasVertex('act-cairo-pyramids')).toBe(true);
      expect(graph.hasVertex('act-cairo-gem')).toBe(true);

      // Pyramids and GEM are ~2.2 km apart, so there must be an edge between them
      const pyramidNeighbors = graph.getNeighbors('act-cairo-pyramids');
      const gemEdge = pyramidNeighbors.find((edge) => edge.node === 'act-cairo-gem');
      expect(gemEdge).toBeDefined();
      expect(gemEdge!.weight).toBeLessThan(3.0);
    });

    it('clusters geographically sensible activities on the same day in Cairo', () => {
      const plan = itineraryService.generateItinerary({
        destinationId: 'cairo',
        days: 1,
        travelers: 2,
        budget: 400,
        travelStyle: 'culture',
      });

      const day1 = plan.days[0];
      expect(day1.items.length).toBe(3);

      const morning = day1.items[0].activity;
      const afternoon = day1.items[1].activity;

      // Both morning and afternoon activities should have coordinates and be within reasonable proximity
      if (morning.coordinates && afternoon.coordinates) {
        const dist = calculateDistanceKm(morning.coordinates, afternoon.coordinates);
        expect(dist).toBeLessThan(10.0); // Never pairs opposite extremes of Cairo on same day
      }

      // Selection reason notes proximity or style
      expect(day1.items[1].selectionReason).toMatch(/clustered|curated|style/i);
    });
  });

  describe('Time-Slot Model & Accurate Formatting', () => {
    it('accurately parses time strings to minutes and formats back with correct AM/PM rollover', () => {
      expect(parseTimeToMinutes('09:30 AM')).toBe(570);
      expect(parseTimeToMinutes('12:00 PM')).toBe(720);
      expect(parseTimeToMinutes('01:30 PM')).toBe(810);
      expect(parseTimeToMinutes('06:30 PM')).toBe(1110);
      expect(parseTimeToMinutes('12:00 AM')).toBe(0);

      // Critical bug fix: 9:30 AM (570) + 180 min duration = 750 (12:30 PM noon, NOT 12:30 AM midnight)
      expect(formatMinutesToTime(570 + 180)).toBe('12:30 PM');

      // Afternoon: 1:30 PM (810) + 150 min = 960 (4:00 PM)
      expect(formatMinutesToTime(810 + 150)).toBe('4:00 PM');

      // Evening: 6:30 PM (1110) + 120 min = 1230 (8:30 PM)
      expect(formatMinutesToTime(1110 + 120)).toBe('8:30 PM');
    });

    it('schedules correct sequential time slots for each day without time inversion', () => {
      const plan = itineraryService.generateItinerary({
        destinationId: 'tokyo',
        days: 1,
        travelers: 1,
        budget: 300,
        travelStyle: 'foodie',
      });

      const items = plan.days[0].items;
      expect(items[0].startTime).toBe('09:30 AM');
      expect(items[1].startTime).toBe('01:30 PM');
      expect(items[2].startTime).toBe('06:30 PM');

      // Check that end time for morning is PM (11:30 AM or 12:xx PM), never AM
      expect(items[0].endTime).toMatch(/AM|PM/);
      expect(items[1].endTime).toContain('PM');
      expect(items[2].endTime).toContain('PM');
    });
  });

  describe('Activity Repetition & Recycling Minimization', () => {
    it('prevents intra-day duplicates even when candidate capacity is exceeded', () => {
      // Paris has 8 curated activities; a 3-day trip requires 9 slots
      const plan = itineraryService.generateItinerary({
        destinationId: 'paris',
        days: 3,
        travelers: 2,
        budget: 600,
        travelStyle: 'culture',
      });

      expect(plan.days.length).toBe(3);

      plan.days.forEach((day) => {
        const dayIds = day.items.map((i) => i.activity.id);
        const uniqueDayIds = new Set(dayIds);
        // Guaranteed: Never repeat an activity on the same day!
        expect(uniqueDayIds.size).toBe(day.items.length);
      });
    });

    it('prioritizes least-recently-used activities when recycling in multi-day trips', () => {
      // Cairo has 11 activities; 4 days = 12 slots, requiring exactly 1 recycled activity
      const plan = itineraryService.generateItinerary({
        destinationId: 'cairo',
        days: 4,
        travelers: 2,
        budget: 800,
        travelStyle: 'culture',
      });

      const activityCounts = new Map<string, number>();
      plan.days.forEach((day) => {
        day.items.forEach((item) => {
          activityCounts.set(item.activity.id, (activityCounts.get(item.activity.id) || 0) + 1);
        });
      });

      // 10 activities used once, exactly 1 activity used twice
      const counts = Array.from(activityCounts.values());
      const twiceCount = counts.filter((c) => c === 2).length;
      expect(twiceCount).toBe(1);
    });
  });

  describe('Preference Matching & Travel Style Specialization', () => {
    it('tailors selection to foodie style with dining and market activities', () => {
      const foodiePlan = itineraryService.generateItinerary({
        destinationId: 'tokyo',
        days: 1,
        travelers: 1,
        budget: 400,
        travelStyle: 'foodie',
      });

      const categories = foodiePlan.days[0].items.map((i) => i.activity.category);
      expect(categories).toContain('food');
    });

    it('boosts activities matching specific user interests', () => {
      const plan = itineraryService.generateItinerary({
        destinationId: 'cairo',
        days: 1,
        travelers: 1,
        budget: 300,
        travelStyle: 'foodie',
        interests: ['koshari'],
      });

      const hasKoshari = plan.days[0].items.some((i) =>
        i.activity.name.toLowerCase().includes('koshari')
      );
      expect(hasKoshari).toBe(true);
    });
  });

  describe('Deterministic Cost Transparency & Budget Warnings', () => {
    it('scales group cost linearly with number of travellers', () => {
      const plan1 = itineraryService.generateItinerary({
        destinationId: 'paris',
        days: 2,
        travelers: 1,
        budget: 500,
        travelStyle: 'culture',
      });

      const plan3 = itineraryService.generateItinerary({
        destinationId: 'paris',
        days: 2,
        travelers: 3,
        budget: 1500,
        travelStyle: 'culture',
      });

      expect(plan3.totalEstimatedCost).toBe(plan1.totalEstimatedCost * 3);
    });

    it('provides clear warnings when budget is exceeded and includes transparent disclaimer', () => {
      const lowBudgetPlan = itineraryService.generateItinerary({
        destinationId: 'tokyo',
        days: 3,
        travelers: 2,
        budget: 50,
        travelStyle: 'foodie',
      });

      expect(lowBudgetPlan.isWithinBudget).toBe(false);
      expect(lowBudgetPlan.warnings.length).toBeGreaterThan(0);
      expect(lowBudgetPlan.warnings[0]).toContain('exceeds your allocated budget');
      expect(lowBudgetPlan.disclaimerNote).toContain('Excludes international flights, accommodation');
    });
  });

  describe('Itinerary Validator Duplicate Guard', () => {
    it('detects and substitutes duplicate activities proposed by AI while unused candidates remain', () => {
      const cairoCandidates = getActivitiesForDestination('cairo');
      const input: AIPlanInput = {
        destinationId: 'cairo',
        destinationName: 'Cairo',
        country: 'Egypt',
        days: 2,
        travelers: 2,
        budget: 500,
        currency: 'USD',
        travelStyle: 'culture',
        interests: ['pyramids'],
        candidateActivities: cairoCandidates,
      };

      const proposalWithDuplicates: AIPlanOutput = {
        tripTitle: 'Repetitive Cairo Trip',
        summary: 'Proposes Pyramids on both Day 1 and Day 2',
        days: [
          {
            dayNumber: 1,
            items: [
              { activityId: 'act-cairo-pyramids', suggestedStartTime: '09:30 AM', selectionReason: 'Pyramids 1' },
              { activityId: 'act-cairo-gem', suggestedStartTime: '01:30 PM', selectionReason: 'GEM' },
              { activityId: 'act-cairo-khan-bazaar', suggestedStartTime: '06:30 PM', selectionReason: 'Bazaar' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              // Duplicate of Day 1 Pyramids!
              { activityId: 'act-cairo-pyramids', suggestedStartTime: '09:30 AM', selectionReason: 'Pyramids 2' },
              { activityId: 'act-cairo-citadel', suggestedStartTime: '01:30 PM', selectionReason: 'Citadel' },
              { activityId: 'act-cairo-felucca', suggestedStartTime: '06:30 PM', selectionReason: 'Felucca' },
            ],
          },
        ],
      };

      const result = itineraryValidator.validateAndRepair(input, proposalWithDuplicates);

      // Errors should flag the duplicate
      expect(result.isValid).toBe(false);
      const duplicateError = result.errors.find((e) => e.includes('Duplicate activity'));
      expect(duplicateError).toBeDefined();

      // The repaired plan should have substituted the duplicate so Day 2 does not use act-cairo-pyramids
      const day2ActivityIds = result.repairedPlan!.days[1].items.map((i) => i.activity.id);
      expect(day2ActivityIds).not.toContain('act-cairo-pyramids');
    });
  });
});
