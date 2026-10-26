import { describe, it, expect, vi } from 'vitest';
import { CuratedActivityProvider } from '../services/curatedActivityProvider';
import { ActivityProviderCoordinator } from '../services/activityProviderCoordinator';
import type { Activity } from '../types';
import type { IActivityProvider } from '../types/placesProvider';

describe('Curated Activity Provider & Activity Data Layer Suite', () => {
  describe('1. Curated Activity Provider Implementation', () => {
    const provider = new CuratedActivityProvider();

    it('implements IActivityProvider contract with stable providerId and attribution', () => {
      expect(provider.providerId).toBe('curated');
      expect(provider.attribution).toBe('Ryoko Curated Catalog');
    });

    it('returns normalized activity candidates with stable IDs and destination association', async () => {
      const response = await provider.fetchPlaces({
        destinationId: 'cairo',
        destinationName: 'Cairo',
      });

      expect(response.success).toBe(true);
      expect(response.status).toBe('ok');
      expect(response.provider).toBe('curated');
      expect(response.destinationId).toBe('cairo');
      expect(response.totalFound).toBe(11);
      expect(response.activities.length).toBe(11);

      response.activities.forEach((candidate) => {
        expect(candidate.id).toMatch(/^act-cairo-/);
        expect(candidate.providerPlaceId).toBe(candidate.id);
        expect(candidate.destinationId).toBe('cairo');
        expect(candidate.name).toBeTruthy();
        expect(candidate.category).toBeTruthy();
        expect(candidate.provenance).toBe('curated');
        expect(candidate.sourceAttribution).toBe('Ryoko Curated Catalog');
      });
    });

    it('strictly preserves unrecorded optional fields as undefined without inventing values', async () => {
      const response = await provider.fetchPlaces({
        destinationId: 'tokyo',
        destinationName: 'Tokyo',
      });

      expect(response.success).toBe(true);
      response.activities.forEach((candidate) => {
        // In the curated catalogue, opening hours are unrecorded; must be undefined
        expect(candidate.openingHours).toBeUndefined();
      });
    });

    it('returns empty result with warning for uncurated destinations rather than fabricating data', async () => {
      const response = await provider.fetchPlaces({
        destinationId: 'atlantis',
        destinationName: 'Atlantis',
      });

      expect(response.success).toBe(true);
      expect(response.status).toBe('empty');
      expect(response.activities).toEqual([]);
      expect(response.totalFound).toBe(0);
      expect(response.warning).toContain("No curated activities catalogued for destination 'atlantis'");
    });

    it('returns clear error response when destinationId is missing or invalid', async () => {
      const response = await provider.fetchPlaces({
        destinationId: '   ',
        destinationName: '',
      });

      expect(response.success).toBe(false);
      expect(response.status).toBe('error');
      expect(response.activities).toEqual([]);
      expect(response.error).toContain('destinationId is required');
    });

    it('supports synchronous access through getCuratedActivitiesSync', () => {
      const parisCandidates = provider.getCuratedActivitiesSync('paris');
      expect(parisCandidates.length).toBe(8);
      parisCandidates.forEach((c) => {
        expect(c.destinationId).toBe('paris');
        expect(c.provenance).toBe('curated');
      });

      const unknownCandidates = provider.getCuratedActivitiesSync('unknown-city');
      expect(unknownCandidates).toEqual([]);
    });
  });

  describe('2. Duplicate Prevention and Cross-Destination Isolation', () => {
    it('prevents duplicate activities from entering the candidate list', () => {
      const mockRawWithDuplicates: Activity[] = [
        {
          id: 'act-sample-1',
          name: 'Scenic Viewpoint',
          description: 'A beautiful lookout.',
          destinationId: 'sample-city',
          category: 'stroll',
          estimatedDurationMinutes: 60,
          estimatedCostPerPerson: 0,
          tags: ['viewpoint'],
          timeOfDay: 'evening',
          environment: 'outdoor',
        },
        {
          id: 'act-sample-1', // Duplicate ID
          name: 'Scenic Viewpoint Duplicate ID',
          description: 'Duplicate entry.',
          destinationId: 'sample-city',
          category: 'stroll',
          estimatedDurationMinutes: 60,
          estimatedCostPerPerson: 0,
          tags: ['viewpoint'],
          timeOfDay: 'evening',
          environment: 'outdoor',
        },
        {
          id: 'act-sample-2',
          name: 'Scenic Viewpoint', // Duplicate Name
          description: 'Another duplicate entry.',
          destinationId: 'sample-city',
          category: 'stroll',
          estimatedDurationMinutes: 60,
          estimatedCostPerPerson: 0,
          tags: ['viewpoint'],
          timeOfDay: 'evening',
          environment: 'outdoor',
        },
        {
          id: 'act-sample-3',
          name: 'Unique Historic Museum',
          description: 'A genuine museum.',
          destinationId: 'sample-city',
          category: 'art',
          estimatedDurationMinutes: 120,
          estimatedCostPerPerson: 15,
          tags: ['museum'],
          timeOfDay: 'morning',
          environment: 'indoor',
        },
      ];

      const testProvider = new CuratedActivityProvider(mockRawWithDuplicates);
      const candidates = testProvider.getCuratedActivitiesSync('sample-city');

      // Out of 4 items with 2 duplicates, exactly 2 unique activities must survive
      expect(candidates.length).toBe(2);
      expect(candidates.map((c) => c.id)).toEqual(['act-sample-1', 'act-sample-3']);
    });

    it('isolates destinations strictly and never leaks activities across destination IDs', async () => {
      const provider = new CuratedActivityProvider();
      const romeRes = await provider.fetchPlaces({
        destinationId: 'rome',
        destinationName: 'Rome',
      });

      const hasNonRomeActivity = romeRes.activities.some((a) => a.destinationId !== 'rome');
      expect(hasNonRomeActivity).toBe(false);
    });
  });

  describe('3. Activity Provider Coordinator Hierarchy', () => {
    it('queries curated provider first and does not query external provider when curated data exists', async () => {
      const mockExternal: IActivityProvider = {
        providerId: 'external-provider',
        attribution: 'External Attribution',
        fetchPlaces: vi.fn(),
      };

      const coordinator = new ActivityProviderCoordinator(undefined, mockExternal);
      const response = await coordinator.fetchActivities({
        destinationId: 'paris',
        destinationName: 'Paris',
      });

      expect(response.success).toBe(true);
      expect(response.provider).toBe('curated');
      expect(response.activities.length).toBe(8);
      expect(mockExternal.fetchPlaces).not.toHaveBeenCalled();
    });

    it('delegates to external provider when destination has no curated activities', async () => {
      const mockExternal: IActivityProvider = {
        providerId: 'external-provider',
        attribution: 'External Attribution',
        fetchPlaces: vi.fn().mockResolvedValue({
          success: true,
          status: 'ok',
          provider: 'external-provider',
          destinationId: 'kyoto',
          activities: [
            {
              id: 'otm-fushimi-inari',
              name: 'Fushimi Inari Taisha',
              destinationId: 'kyoto',
              category: 'landmark',
              provenance: 'verified_provider',
              tags: ['shrine', 'torii'],
              sourceAttribution: 'External Attribution',
            },
          ],
          totalFound: 1,
          sourceAttribution: 'External Attribution',
        }),
      };

      const coordinator = new ActivityProviderCoordinator(undefined, mockExternal);
      const response = await coordinator.fetchActivities({
        destinationId: 'kyoto',
        destinationName: 'Kyoto',
      });

      expect(mockExternal.fetchPlaces).toHaveBeenCalled();
      expect(response.success).toBe(true);
      expect(response.provider).toBe('external-provider');
      expect(response.activities.length).toBe(1);
      expect(response.activities[0].id).toBe('otm-fushimi-inari');
      expect(response.activities[0].provenance).toBe('verified_provider');
    });

    it('handles external provider errors gracefully with typed metadata and fallback', async () => {
      const failingExternal: IActivityProvider = {
        providerId: 'failing-provider',
        attribution: 'Failing Attribution',
        fetchPlaces: vi.fn().mockRejectedValue(new Error('504 Gateway Timeout')),
      };

      const coordinator = new ActivityProviderCoordinator(undefined, failingExternal);
      const response = await coordinator.fetchActivities({
        destinationId: 'sydney',
        destinationName: 'Sydney',
      });

      // Does not throw; returns structured failure response
      expect(response.success).toBe(false);
      expect(response.status).toBe('network_error');
      expect(response.activities).toEqual([]);
      expect(response.error).toContain('504 Gateway Timeout');
    });

    it('separates data retrieval cleanly from itinerary scheduling', () => {
      const coordinator = new ActivityProviderCoordinator();
      const syncCandidates = coordinator.getActivitiesSync('mumbai');

      expect(syncCandidates.length).toBe(4);
      // Candidates have not been assigned to time slots or modified by budget heuristics
      syncCandidates.forEach((c) => {
        expect(c).not.toHaveProperty('timeSlotLabel');
        expect(c).not.toHaveProperty('costForGroup');
        expect(c).not.toHaveProperty('selectionReason');
      });
    });
  });
});
