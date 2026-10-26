import { describe, it, expect } from 'vitest';
import { destinationDiscoveryService } from '../services/destinationDiscoveryService';
import { itineraryService } from '../services/itineraryService';
import { hybridPlanningService } from '../services/hybridPlanningService';
import { getDestinationData } from '../data/destinations';

describe('Destination Discovery Foundation Suite', () => {
  describe('Curated Destination Resolution & Alias Preservation', () => {
    it('resolves primary curated cities as curated with verified activities', () => {
      const cities = ['paris', 'cairo', 'tokyo', 'mumbai', 'rome'];

      cities.forEach((city) => {
        const result = destinationDiscoveryService.resolveDestination(city);
        expect(result.status).toBe('curated');
        expect(result.destination).toBeDefined();
        expect(result.destination!.id).toBe(city);
        expect(result.hasVerifiedActivities).toBe(true);
        expect(result.provenance).toBe('curated');
      });
    });

    it('resolves curated country aliases to their primary curated destination hubs', () => {
      const egypt = destinationDiscoveryService.resolveDestination('Egypt');
      expect(egypt.status).toBe('curated');
      expect(egypt.destination!.id).toBe('cairo');
      expect(egypt.hasVerifiedActivities).toBe(true);

      const japan = destinationDiscoveryService.resolveDestination('Japan');
      expect(japan.status).toBe('curated');
      expect(japan.destination!.id).toBe('tokyo');
      expect(japan.hasVerifiedActivities).toBe(true);

      const france = destinationDiscoveryService.resolveDestination('France');
      expect(france.status).toBe('curated');
      expect(france.destination!.id).toBe('paris');
      expect(france.hasVerifiedActivities).toBe(true);
    });
  });

  describe('Geographic Country Resolution Without Fabricated City Data', () => {
    it('resolves uncurated world countries using genuine boundary metadata', () => {
      // Australia is in WORLD_COUNTRIES, but has no curated city activities in Ryoko yet
      const australia = destinationDiscoveryService.resolveDestination('Australia');
      expect(australia.status).toBe('resolved');
      expect(australia.destination).toBeDefined();
      expect(australia.destination!.name).toBe('Australia');
      expect(australia.destination!.country).toBe('Australia');
      // Uses genuine boundary coordinates, not dummy { lat: 20, lng: 0 }
      expect(australia.destination!.coordinates.lat).not.toBe(20);
      expect(australia.provenance).toBe('country_geo');
      // Explicit: No city-level activities are verified
      expect(australia.hasVerifiedActivities).toBe(false);
      expect(australia.message).toContain('City-level activities are not yet curated');
    });

    it('resolves Iceland from world geographic data as uncurated', () => {
      const iceland = destinationDiscoveryService.resolveDestination('Iceland');
      expect(iceland.status).toBe('resolved');
      expect(iceland.destination!.name).toBe('Iceland');
      expect(iceland.hasVerifiedActivities).toBe(false);
    });
  });

  describe('Ambiguous and Unresolved Queries Handling', () => {
    it('detects ambiguous queries matching multiple plausible destinations', () => {
      // "United" matches United States, United Kingdom, United Arab Emirates
      const result = destinationDiscoveryService.resolveDestination('United');
      expect(result.status).toBe('ambiguous');
      expect(result.destination).toBeUndefined();
      expect(result.candidates).toBeDefined();
      expect(result.candidates!.length).toBeGreaterThanOrEqual(2);
      expect(result.hasVerifiedActivities).toBe(false);
      expect(result.message).toContain('Multiple destinations matched');
    });

    it('marks fictitious or unrecognized destinations as unresolved without inventing data', () => {
      const atlantis = destinationDiscoveryService.resolveDestination('Atlantis');
      expect(atlantis.status).toBe('unresolved');
      expect(atlantis.destination).toBeUndefined();
      expect(atlantis.hasVerifiedActivities).toBe(false);
      expect(atlantis.provenance).toBe('none');
      expect(atlantis.message).toContain('No verified geographical or tourist data found');

      const fake = destinationDiscoveryService.resolveDestination('NonExistentPlaceXYZ');
      expect(fake.status).toBe('unresolved');
      expect(fake.hasVerifiedActivities).toBe(false);
    });
  });

  describe('Activity Discovery & Provenance Integrity', () => {
    it('returns candidate activities with curated provenance for known destinations', () => {
      const cairoActivities = destinationDiscoveryService.getActivityCandidates('cairo');
      expect(cairoActivities.length).toBeGreaterThan(0);

      cairoActivities.forEach((act) => {
        expect(act.provenance).toBe('curated');
        expect(act.destinationId).toBe('cairo');
        expect(act.name).toBeTruthy();
        expect(act.category).toBeTruthy();
        expect(act.coordinates).toBeDefined();
      });
    });

    it('returns an empty array for unverified destinations rather than fabricating template activities', () => {
      const atlantisActivities = destinationDiscoveryService.getActivityCandidates('atlantis');
      expect(atlantisActivities).toEqual([]);

      const australiaActivities = destinationDiscoveryService.getActivityCandidates('australia');
      expect(australiaActivities).toEqual([]);
    });
  });

  describe('Pipeline Integration & Honest Insufficient-Data Fallback', () => {
    it('itineraryService tags curated plans with hasVerifiedActivities: true and curated dataStatus', () => {
      const cairoPlan = itineraryService.generateItinerary({
        destinationId: 'cairo',
        days: 2,
        travelers: 2,
        budget: 500,
        travelStyle: 'culture',
      });

      expect(cairoPlan.hasVerifiedActivities).toBe(true);
      expect(cairoPlan.dataStatus).toBe('curated');
    });

    it('itineraryService clearly identifies unverified destinations with insufficient-data status and warnings', () => {
      const atlantisPlan = itineraryService.generateItinerary({
        destinationId: 'atlantis',
        days: 2,
        travelers: 1,
        budget: 300,
        travelStyle: 'relaxed',
      });

      expect(atlantisPlan.hasVerifiedActivities).toBe(false);
      expect(atlantisPlan.dataStatus).toBe('insufficient_data');
      expect(atlantisPlan.warnings.length).toBeGreaterThan(0);
      expect(atlantisPlan.warnings.some((w) => w.includes('No verified local activity data'))).toBe(true);
      expect(atlantisPlan.disclaimerNote).toContain('No Verified Activities');
      expect(atlantisPlan.days.every((d) => d.items.length === 0)).toBe(true);
      expect(atlantisPlan.totalEstimatedCost).toBe(0);
    });

    it('hybridPlanningService propagates hasVerifiedActivities and unverified warnings', async () => {
      const plan = await hybridPlanningService.planTrip({
        destinationId: 'tokyo',
        days: 1,
        travelers: 1,
        budget: 300,
        travelStyle: 'foodie',
      });

      expect(plan.hasVerifiedActivities).toBe(true);
      expect(plan.dataStatus).toBe('curated');
    });

    it('preserves getDestinationData backward compatibility', () => {
      const paris = getDestinationData('Paris');
      expect(paris.id).toBe('paris');
      expect(paris.name).toBe('Paris');

      const egypt = getDestinationData('Egypt');
      expect(egypt.id).toBe('cairo');
      expect(egypt.name).toBe('Cairo');
    });
  });
});
