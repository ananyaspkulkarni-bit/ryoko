import { describe, it, expect } from 'vitest';
import { getActivitiesForDestination, hasVerifiedActivitiesForDestination, DESTINATION_ACTIVITIES } from '../data/activities';
import { destinationDiscoveryService } from '../services/destinationDiscoveryService';
import { itineraryService } from '../services/itineraryService';
import { hybridPlanningService } from '../services/hybridPlanningService';
import { ActivityProviderCoordinator } from '../services/activityProviderCoordinator';
import { CuratedActivityProvider } from '../services/curatedActivityProvider';
import type { IActivityProvider, ActivityProviderQuery, ActivityProviderResponse } from '../types/placesProvider';

describe('No Synthetic Activities Suite — Curated Preservation & Honest Fallback', () => {
  const CURATED_DESTINATIONS = ['paris', 'cairo', 'tokyo', 'mumbai', 'rome'] as const;

  describe('1. Curated Destination Preservation', () => {
    it.each(CURATED_DESTINATIONS)('preserves curated activities for %s', (destId) => {
      const activities = getActivitiesForDestination(destId);
      expect(activities.length).toBeGreaterThan(0);
      expect(hasVerifiedActivitiesForDestination(destId)).toBe(true);

      // Verify each activity retains required factual properties
      activities.forEach((act) => {
        expect(act.destinationId).toBe(destId);
        expect(act.id).toMatch(new RegExp(`^act-${destId}-`));
        expect(act.name.length).toBeGreaterThan(0);
        expect(typeof act.estimatedCostPerPerson).toBe('number');
        expect(typeof act.estimatedDurationMinutes).toBe('number');
        expect(act.coordinates).toBeDefined();
        expect(typeof act.coordinates!.lat).toBe('number');
        expect(typeof act.coordinates!.lng).toBe('number');
      });
    });

    it('preserves the total 35 curated activities in DESTINATION_ACTIVITIES', () => {
      expect(DESTINATION_ACTIVITIES.length).toBe(35);
      const counts: Record<string, number> = {};
      DESTINATION_ACTIVITIES.forEach((a) => {
        counts[a.destinationId] = (counts[a.destinationId] || 0) + 1;
      });
      expect(counts.cairo).toBe(11);
      expect(counts.tokyo).toBe(8);
      expect(counts.paris).toBe(8);
      expect(counts.mumbai).toBe(4);
      expect(counts.rome).toBe(4);
    });
  });

  describe('2. Uncurated Destinations Return Empty List', () => {
    const UNCURATED_DESTINATIONS = ['atlantis', 'sydney', 'berlin', 'reykjavik', 'unknown-place-xyz'];

    it.each(UNCURATED_DESTINATIONS)('getActivitiesForDestination returns empty array for %s', (destId) => {
      const activities = getActivitiesForDestination(destId);
      expect(activities).toEqual([]);
      expect(hasVerifiedActivitiesForDestination(destId)).toBe(false);
    });

    it('returns empty array when destination ID is empty or undefined', () => {
      expect(getActivitiesForDestination('')).toEqual([]);
      // @ts-expect-error test undefined argument
      expect(getActivitiesForDestination(undefined)).toEqual([]);
    });

    it('never contains synthetic templates or guessed prices in uncurated destinations', () => {
      const candidates = getActivitiesForDestination('atlantis', 'Atlantis');
      expect(candidates).toEqual([]);
      // No synthetic activity IDs like act-atlantis-morning or fabricated $15/$20 prices
      expect(candidates.some((c) => c.id.includes('morning'))).toBe(false);
      expect(candidates.some((c) => (c.estimatedCostPerPerson ?? 0) > 0)).toBe(false);
    });
  });

  describe('3. External Provider Failure Does Not Trigger Synthetic Activities', () => {
    class FailingPlacesProvider implements IActivityProvider {
      public readonly providerId = 'failing-mock';
      public readonly attribution = 'Failing Mock Attribution';
      public async fetchPlaces(_query: ActivityProviderQuery): Promise<ActivityProviderResponse> {
        throw new Error('500 Internal Server Error: Provider outage');
      }
    }

    class EmptyPlacesProvider implements IActivityProvider {
      public readonly providerId = 'empty-mock';
      public readonly attribution = 'Empty Mock Attribution';
      public async fetchPlaces(query: ActivityProviderQuery): Promise<ActivityProviderResponse> {
        return {
          success: true,
          status: 'empty',
          provider: this.providerId,
          destinationId: query.destinationId,
          activities: [],
          totalFound: 0,
          sourceAttribution: this.attribution,
        };
      }
    }

    it('returns empty candidates when external provider throws an exception', async () => {
      const coordinator = new ActivityProviderCoordinator(
        new CuratedActivityProvider(),
        new FailingPlacesProvider()
      );

      const res = await coordinator.fetchActivities({
        destinationId: 'sydney',
        destinationName: 'Sydney',
      });

      expect(res.activities).toEqual([]);
      expect(res.totalFound).toBe(0);
      expect(res.success).toBe(false);
      // No synthetic activity IDs generated
      expect(res.activities.some((a) => a.id.includes('unverified'))).toBe(false);
    });

    it('returns empty candidates when external provider returns empty result', async () => {
      const coordinator = new ActivityProviderCoordinator(
        new CuratedActivityProvider(),
        new EmptyPlacesProvider()
      );

      const res = await coordinator.fetchActivities({
        destinationId: 'reykjavik',
        destinationName: 'Reykjavik',
      });

      expect(res.activities).toEqual([]);
      expect(res.totalFound).toBe(0);
      expect(res.status).toBe('empty');
    });
  });

  describe('4. Itinerary Planner Gracefully Handles Empty Candidates', () => {
    it('itineraryService does not crash on empty candidate list, producing $0 cost and 0 scheduled items', () => {
      const plan = itineraryService.generateItinerary({
        destinationId: 'sydney',
        days: 3,
        travelers: 2,
        budget: 600,
        travelStyle: 'culture',
      });

      expect(plan).toBeDefined();
      expect(plan.destinationId).toBe('sydney');
      expect(plan.totalDays).toBe(3);
      expect(plan.travelersCount).toBe(2);
      expect(plan.totalEstimatedCost).toBe(0);
      expect(plan.hasVerifiedActivities).toBe(false);
      expect(plan.dataStatus).toBe('insufficient_data');

      // Every day must have 0 scheduled items and $0 daily cost
      plan.days.forEach((day) => {
        expect(day.items).toEqual([]);
        expect(day.estimatedDailyCost).toBe(0);
      });

      // Clear honest disclaimer and notice warning
      expect(plan.warnings.some((w) => w.includes('No verified local activity data is currently available'))).toBe(true);
      expect(plan.disclaimerNote).toContain('No Verified Activities');
    });

    it('hybridPlanningService does not crash on empty candidate list', async () => {
      const plan = await hybridPlanningService.planTrip({
        destinationId: 'sydney',
        days: 2,
        travelers: 1,
        budget: 400,
        travelStyle: 'relaxed',
      });

      expect(plan).toBeDefined();
      expect(plan.destinationId).toBe('sydney');
      expect(plan.totalEstimatedCost).toBe(0);
      expect(plan.hasVerifiedActivities).toBe(false);
      expect(plan.dataStatus).toBe('insufficient_data');
      expect(plan.days.every((d) => d.items.length === 0)).toBe(true);
      expect(plan.warnings.some((w) => w.includes('No verified local activity data'))).toBe(true);
    });
  });

  describe('5. Destination Identity & Coordinates Are Kept Separate from Activity Availability', () => {
    it('accurately resolves real world city coordinates even when activities are unavailable', () => {
      const res = destinationDiscoveryService.resolveDestination('Sydney');
      expect(res.status).toBe('resolved');
      expect(res.provenance).toBe('city_catalog');
      expect(res.destination).toBeDefined();
      expect(res.destination!.name).toBe('Sydney');
      expect(res.destination!.country).toBe('Australia');

      // Real coordinates must be preserved
      expect(res.destination!.coordinates.lat).toBeCloseTo(-33.8688, 2);
      expect(res.destination!.coordinates.lng).toBeCloseTo(151.2093, 2);

      // Activities are uncurated without provider
      expect(res.hasVerifiedActivities).toBe(false);
      expect(destinationDiscoveryService.getActivityCandidates('sydney')).toEqual([]);
    });

    it('accurately resolves country boundary coordinates even when activities are unavailable', () => {
      const res = destinationDiscoveryService.resolveDestination('Iceland');
      expect(res.status).toBe('resolved');
      expect(res.provenance).toBe('country_geo');
      expect(res.destination!.coordinates).toBeDefined();
      expect(res.destination!.coordinates.lat).toBeCloseTo(64.9631, 2);
      expect(res.destination!.coordinates.lng).toBeCloseTo(-19.0208, 2);
    });
  });
});
