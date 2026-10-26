import { describe, it, expect } from 'vitest';
import { itineraryService, calculateDistanceKm } from '../services/itineraryService';
import { itineraryValidator } from '../services/itineraryValidator';
import { getActivitiesForDestination } from '../data/activities';
import type { AIPlanInput, AIPlanOutput, TripPreferences } from '../types';

describe('Itinerary Engine Realism & Practical Planning Suite', () => {
  describe('1. Practical Scheduling & Transit Buffers', () => {
    it('penalizes distant transit when the prior activity is long and window is tight', () => {
      const prefs: TripPreferences = {
        destinationId: 'cairo',
        days: 1,
        travelers: 1,
        budget: 400,
        travelStyle: 'culture',
      };

      const cairoActs = getActivitiesForDestination('cairo');
      const pyramids = cairoActs.find((a) => a.id === 'act-cairo-pyramids')!; // 180 min, at Giza (29.9792, 31.1342)
      const gem = cairoActs.find((a) => a.id === 'act-cairo-gem')!; // 2.2 km from pyramids
      const bazaar = cairoActs.find((a) => a.id === 'act-cairo-khan-bazaar')!; // ~14.5 km from pyramids

      // Distance calculation sanity check
      const distToGEM = calculateDistanceKm(pyramids.coordinates!, gem.coordinates!);
      const distToBazaar = calculateDistanceKm(pyramids.coordinates!, bazaar.coordinates!);
      expect(distToGEM).toBeLessThan(3.0);
      expect(distToBazaar).toBeGreaterThan(12.0);

      // Score for afternoon slot following the 180-min Pyramids anchor
      const scoreGEM = itineraryService.scoreActivity(gem, prefs, 'afternoon', pyramids, [pyramids]);
      const scoreBazaar = itineraryService.scoreActivity(bazaar, prefs, 'afternoon', pyramids, [pyramids]);

      // Proximate GEM must score significantly higher than distant Bazaar
      expect(scoreGEM).toBeGreaterThan(scoreBazaar + 25);
    });

    it('creates practical schedules without fabricating unverified transit times', () => {
      const plan = itineraryService.generateItinerary({
        destinationId: 'cairo',
        days: 1,
        travelers: 2,
        budget: 500,
        travelStyle: 'culture',
      });

      const day1 = plan.days[0];
      expect(day1.items.length).toBe(3);

      // Morning starts at 09:30 AM, afternoon at 01:30 PM, evening at 06:30 PM
      expect(day1.items[0].startTime).toBe('09:30 AM');
      expect(day1.items[1].startTime).toBe('01:30 PM');
      expect(day1.items[2].startTime).toBe('06:30 PM');

      // Check selection reasons note proximity or timing without claiming invented driving times
      day1.items.forEach((item) => {
        expect(item.selectionReason).not.toMatch(/minutes drive|transit time is|traffic is/i);
      });
    });
  });

  describe('2. Activity Diversity & Monotony Avoidance', () => {
    it('penalizes duplicate categories on the same day when alternatives exist', () => {
      const prefs: TripPreferences = {
        destinationId: 'paris',
        days: 1,
        travelers: 1,
        budget: 500,
        travelStyle: 'culture',
      };

      const parisActs = getActivitiesForDestination('paris');
      const louvre = parisActs.find((a) => a.id === 'act-paris-louvre')!; // category: art, tags: [museum]
      const orsay = parisActs.find((a) => a.id === 'act-paris-dorsay')!; // category: art, tags: [museum]

      // Score Orsay when Louvre is already scheduled on the same day
      const scoreOrsayWithLouvre = itineraryService.scoreActivity(orsay, prefs, 'afternoon', louvre, [louvre]);
      // Score Orsay on a clean day
      const scoreOrsayClean = itineraryService.scoreActivity(orsay, prefs, 'afternoon', null, []);

      // Scoring must penalize same-day duplicate category / museum fatigue (-25 category penalty, -20 museum penalty)
      expect(scoreOrsayClean).toBeGreaterThan(scoreOrsayWithLouvre + 30);

      // In Cairo, test that landmark duplicate (Saqqara) scores lower than diverse category (GEM) following Pyramids
      const cairoActs = getActivitiesForDestination('cairo');
      const pyramids = cairoActs.find((a) => a.id === 'act-cairo-pyramids')!; // landmark
      const saqqara = cairoActs.find((a) => a.id === 'act-cairo-saqqara')!; // landmark (duplicate)
      const gem = cairoActs.find((a) => a.id === 'act-cairo-gem')!; // art (diverse)
      const cairoPrefs: TripPreferences = { destinationId: 'cairo', days: 1, travelers: 1, budget: 400, travelStyle: 'culture' };

      const scoreSaqqaraWithPyramids = itineraryService.scoreActivity(saqqara, cairoPrefs, 'afternoon', pyramids, [pyramids]);
      const scoreGEMWithPyramids = itineraryService.scoreActivity(gem, cairoPrefs, 'afternoon', pyramids, [pyramids]);
      expect(scoreGEMWithPyramids).toBeGreaterThan(scoreSaqqaraWithPyramids + 30);
    });

    it('penalizes back-to-back shrine/temple visits on the same day', () => {
      const prefs: TripPreferences = {
        destinationId: 'tokyo',
        days: 1,
        travelers: 1,
        budget: 300,
        travelStyle: 'culture',
      };

      const tokyoActs = getActivitiesForDestination('tokyo');
      const meiji = tokyoActs.find((a) => a.id === 'act-tokyo-meiji')!; // shrine
      const sensoji = tokyoActs.find((a) => a.id === 'act-tokyo-sensoji')!; // temple

      const scoreSensojiWithMeiji = itineraryService.scoreActivity(sensoji, prefs, 'afternoon', meiji, [meiji]);
      const scoreSensojiClean = itineraryService.scoreActivity(sensoji, prefs, 'afternoon', null, []);

      expect(scoreSensojiClean).toBeGreaterThan(scoreSensojiWithMeiji + 15);
    });

    it('preserves and strongly boosts user-selected interests even with category penalties', () => {
      const prefsWithInterests: TripPreferences = {
        destinationId: 'paris',
        days: 1,
        travelers: 1,
        budget: 500,
        travelStyle: 'culture',
        interests: ['orsay', 'impressionist'],
      };

      const parisActs = getActivitiesForDestination('paris');
      const louvre = parisActs.find((a) => a.id === 'act-paris-louvre')!;
      const orsay = parisActs.find((a) => a.id === 'act-paris-dorsay')!;

      const scoreOrsayWithInterest = itineraryService.scoreActivity(orsay, prefsWithInterests, 'afternoon', louvre, [louvre]);
      const scoreOrsayNoInterest = itineraryService.scoreActivity(orsay, { ...prefsWithInterests, interests: [] }, 'afternoon', louvre, [louvre]);

      // User-selected interest provides a massive boost (+35)
      expect(scoreOrsayWithInterest).toBeGreaterThan(scoreOrsayNoInterest + 30);
    });
  });

  describe('3. Opening Hours & Schedule Transparency', () => {
    it('transparently disclaims unrecorded opening hours in disclaimer note', () => {
      const plan = itineraryService.generateItinerary({
        destinationId: 'tokyo',
        days: 2,
        travelers: 2,
        budget: 600,
        travelStyle: 'culture',
      });

      expect(plan.disclaimerNote).toContain('Specific venue opening hours and seasonal closures are unrecorded');
      expect(plan.disclaimerNote).toContain('confirm locally');
    });

    it('does not claim activities are verified open at the scheduled start time', () => {
      const plan = itineraryService.generateItinerary({
        destinationId: 'paris',
        days: 1,
        travelers: 1,
        budget: 400,
        travelStyle: 'culture',
      });

      plan.days[0].items.forEach((item) => {
        expect(item.selectionReason).not.toMatch(/verified open|confirmed open at/i);
      });
    });
  });

  describe('4. Budget Awareness & Honest Group Arithmetic', () => {
    it('rewards confirmed free admission activities ($0) under tight budget', () => {
      const prefs: TripPreferences = {
        destinationId: 'tokyo',
        days: 1,
        travelers: 2,
        budget: 30, // Extremely tight budget ($15/person)
        travelStyle: 'culture',
      };

      const tokyoActs = getActivitiesForDestination('tokyo');
      const meiji = tokyoActs.find((a) => a.id === 'act-tokyo-meiji')!; // Free ($0)
      const teamLab = tokyoActs.find((a) => a.id === 'act-tokyo-teamlab')!; // $35/person = $70 for group

      expect(meiji.estimatedCostPerPerson).toBe(0);
      expect(teamLab.estimatedCostPerPerson).toBe(30);

      // Remaining budget: $30
      const scoreMeiji = itineraryService.scoreActivity(meiji, prefs, 'morning', null, [], 30);
      const scoreTeamLab = itineraryService.scoreActivity(teamLab, prefs, 'morning', null, [], 30);

      // Free activity should score substantially higher than activity exceeding budget
      expect(scoreMeiji).toBeGreaterThan(scoreTeamLab + 50);
    });

    it('never silently modifies factual activity costs to fit an insufficient budget', () => {
      const plan = itineraryService.generateItinerary({
        destinationId: 'cairo',
        days: 2,
        travelers: 3,
        budget: 20, // Clearly impossible budget for 3 travelers over 2 days
        travelStyle: 'culture',
      });

      // Total cost must equal exact sum of (perPersonCost * travelers)
      let expectedTotal = 0;
      plan.days.forEach((day) => {
        day.items.forEach((item) => {
          expect(item.costForGroup).toBe((item.activity.estimatedCostPerPerson ?? 0) * 3);
          expectedTotal += item.costForGroup ?? 0;
        });
      });

      expect(plan.totalEstimatedCost).toBe(expectedTotal);
      expect(plan.isWithinBudget).toBe(false);
      expect(plan.warnings.length).toBeGreaterThan(0);
      expect(plan.warnings[0]).toContain('exceeds your allocated budget');
    });
  });

  describe('5. Day Balance & Fatigue Pacing', () => {
    it('rewards lighter activities and penalizes heavy stops after demanding morning tours', () => {
      const prefs: TripPreferences = {
        destinationId: 'cairo',
        days: 1,
        travelers: 1,
        budget: 500,
        travelStyle: 'culture',
      };

      const cairoActs = getActivitiesForDestination('cairo');
      const pyramids = cairoActs.find((a) => a.id === 'act-cairo-pyramids')!; // 180 min
      const felucca = cairoActs.find((a) => a.id === 'act-cairo-felucca')!; // 90 min (lighter)
      const saqqara = cairoActs.find((a) => a.id === 'act-cairo-saqqara')!; // 150 min (heavy)

      // Pyramids duration is 180 min (>= 150 min fatigue threshold)
      const scoreFeluccaAfterPyramids = itineraryService.scoreActivity(felucca, prefs, 'afternoon', pyramids, [pyramids]);
      const scoreSaqqaraAfterPyramids = itineraryService.scoreActivity(saqqara, prefs, 'afternoon', pyramids, [pyramids]);

      // Lighter 90-min activity receives pacing bonus while 150-min heavy stop is penalized
      expect(scoreFeluccaAfterPyramids).toBeGreaterThan(scoreSaqqaraAfterPyramids + 25);
    });

    it('favors shorter activities when travelStyle is relaxed', () => {
      const relaxedPrefs: TripPreferences = {
        destinationId: 'paris',
        days: 1,
        travelers: 1,
        budget: 500,
        travelStyle: 'relaxed',
      };

      const parisActs = getActivitiesForDestination('paris');
      const louvre = parisActs.find((a) => a.id === 'act-paris-louvre')!; // 180 min
      const seineCruise = parisActs.find((a) => a.id === 'act-paris-seine-cruise')!; // 90 min

      const scoreLouvre = itineraryService.scoreActivity(louvre, relaxedPrefs, 'morning', null, []);
      const scoreCruise = itineraryService.scoreActivity(seineCruise, relaxedPrefs, 'morning', null, []);

      // Cruise is short (<= 90 min); Louvre is long (> 120 min)
      expect(scoreCruise).toBeGreaterThan(scoreLouvre);
    });
  });

  describe('6. Validation & Fallback Integrity', () => {
    it('flags an error in the validator when candidate activities are empty', () => {
      const emptyInput: AIPlanInput = {
        destinationId: 'unknown-mars-colony',
        destinationName: 'Mars Colony',
        country: 'Space',
        days: 1,
        travelers: 1,
        budget: 500,
        currency: 'USD',
        travelStyle: 'adventure',
        interests: [],
        candidateActivities: [], // Empty!
      };

      const proposal: AIPlanOutput = {
        tripTitle: 'Mars Colony Trip',
        summary: 'Trip with no candidate activities',
        days: [],
      };

      const result = itineraryValidator.validateAndRepair(emptyInput, proposal);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Unsupported destination'))).toBe(true);
    });

    it('safely handles multi-day plans without duplicate activities on the same day', () => {
      const plan = itineraryService.generateItinerary({
        destinationId: 'rome',
        days: 3,
        travelers: 2,
        budget: 800,
        travelStyle: 'culture',
      });

      expect(plan.days.length).toBe(3);
      plan.days.forEach((day) => {
        const ids = day.items.map((i) => i.activity.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });
    });
  });
});
