import { describe, it, expect, vi } from 'vitest';
import {
  OpenTripMapProvider,
  mapOpenTripMapKindsToCategory,
  determineEnvironmentFromKinds,
} from '../services/openTripMapProvider';
import { DestinationDiscoveryService } from '../services/destinationDiscoveryService';
import { HybridPlanningService } from '../services/hybridPlanningService';
import { FallbackDeterministicAdapter } from '../services/aiPlanningAdapter';
import type {
  OpenTripMapPlaceSummary,
  OpenTripMapPlaceDetails,
  IPlacesProvider,
} from '../types/placesProvider';

describe('OpenTripMap Provider & External Places Integration Suite', () => {
  describe('1. Category & Environment Normalization', () => {
    it('correctly maps OpenTripMap kinds to Ryoko activity categories', () => {
      expect(mapOpenTripMapKindsToCategory('museums,cultural,historic')).toBe('art');
      expect(mapOpenTripMapKindsToCategory('art_galleries,exhibitions')).toBe('art');
      expect(mapOpenTripMapKindsToCategory('monuments_and_memorials,historic,towers')).toBe('landmark');
      expect(mapOpenTripMapKindsToCategory('foods,restaurants,cafes')).toBe('food');
      expect(mapOpenTripMapKindsToCategory('natural,gardens_and_parks,beaches')).toBe('nature');
      expect(mapOpenTripMapKindsToCategory('view_points,urban_environment,squares')).toBe('stroll');
      expect(mapOpenTripMapKindsToCategory('')).toBe('landmark'); // Safe default
    });

    it('correctly classifies environment as indoor, outdoor, or both', () => {
      expect(determineEnvironmentFromKinds('museums,art_galleries')).toBe('indoor');
      expect(determineEnvironmentFromKinds('natural,beaches,gardens_and_parks')).toBe('outdoor');
      expect(determineEnvironmentFromKinds('museums,gardens_and_parks')).toBe('both');
      expect(determineEnvironmentFromKinds('historic,architecture')).toBe('both');
    });
  });

  describe('2. Place Normalization & Genuine Data Preservation', () => {
    const provider = new OpenTripMapProvider();

    it('normalizes valid place summary with stable ID, coordinates, and verified provenance', () => {
      const samplePlace: OpenTripMapPlaceSummary = {
        xid: 'Q12345',
        name: 'Historic Opera House',
        rate: 3,
        kinds: 'theatres,opera,cultural',
        point: { lat: -33.8568, lon: 151.2153 },
      };

      const normalized = provider.normalizePlace(samplePlace, 'sydney');

      expect(normalized).toBeDefined();
      expect(normalized!.id).toBe('otm-Q12345');
      expect(normalized!.providerPlaceId).toBe('Q12345');
      expect(normalized!.name).toBe('Historic Opera House');
      expect(normalized!.destinationId).toBe('sydney');
      expect(normalized!.category).toBe('art');
      expect(normalized!.provenance).toBe('verified_provider');
      expect(normalized!.coordinates).toEqual({ lat: -33.8568, lng: 151.2153 });
      expect(normalized!.sourceAttribution).toContain('OpenTripMap');

      // CRITICAL: Unknown fields must NOT be fabricated!
      expect(normalized!.estimatedCostPerPerson).toBeUndefined();
      expect(normalized!.estimatedDurationMinutes).toBeUndefined();
      expect(normalized!.openingHours).toBeUndefined();
    });

    it('extracts genuine description from Wikipedia extracts when available', () => {
      const detailedPlace: OpenTripMapPlaceDetails = {
        xid: 'Q99999',
        name: 'National Maritime Museum',
        kinds: 'museums,cultural',
        point: { lat: 51.4811, lon: -0.0053 },
        wikipedia_extracts: {
          title: 'National Maritime Museum',
          text: 'The leading maritime museum of the United Kingdom, illustrating British naval history.',
        },
        rate: 3,
      };

      const normalized = provider.normalizePlace(detailedPlace, 'london');

      expect(normalized).toBeDefined();
      expect(normalized!.description).toBe(
        'The leading maritime museum of the United Kingdom, illustrating British naval history.'
      );
    });

    it('rejects unnamed places or places with invalid coordinates', () => {
      const unnamedPlace: OpenTripMapPlaceSummary = {
        xid: 'Q00001',
        name: '   ', // Blank
        kinds: 'historic',
        point: { lat: 40.7128, lon: -74.006 },
      };
      expect(provider.normalizePlace(unnamedPlace, 'nyc')).toBeNull();

      const invalidCoords: OpenTripMapPlaceSummary = {
        xid: 'Q00002',
        name: 'Broken Coords',
        kinds: 'historic',
        point: { lat: NaN, lon: -74.006 },
      };
      expect(provider.normalizePlace(invalidCoords, 'nyc')).toBeNull();
    });
  });

  describe('3. Deduplication & Distance Outlier Filtering', () => {
    const provider = new OpenTripMapProvider();

    it('filters out places situated too far from destination center', () => {
      const centerSydney = { lat: -33.8688, lng: 151.2093 };

      const places = [
        provider.normalizePlace(
          {
            xid: 'P1',
            name: 'Sydney Harbour Bridge',
            kinds: 'bridges,view_points',
            point: { lat: -33.8523, lon: 151.2108 }, // ~1.8 km from center
          },
          'sydney'
        )!,
        provider.normalizePlace(
          {
            xid: 'P2',
            name: 'Blue Mountains Lookout',
            kinds: 'view_points,natural',
            point: { lat: -33.7153, lon: 150.3117 }, // ~85 km away!
          },
          'sydney'
        )!,
      ];

      const filtered = provider.filterAndDeduplicate(places, centerSydney, 25);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('otm-P1');
    });

    it('deduplicates identical place IDs and closely situated duplicate names', () => {
      const placeA = provider.normalizePlace(
        {
          xid: 'P_LOUVRE_1',
          name: 'Louvre Museum',
          kinds: 'museums',
          point: { lat: 48.8606, lon: 2.3376 },
        },
        'paris'
      )!;

      const placeADuplicateId = provider.normalizePlace(
        {
          xid: 'P_LOUVRE_1', // Same ID
          name: 'Louvre Museum - Main Entry',
          kinds: 'museums',
          point: { lat: 48.8606, lon: 2.3376 },
        },
        'paris'
      )!;

      const placeANearbyDuplicateName = provider.normalizePlace(
        {
          xid: 'P_LOUVRE_2', // Different ID but same venue 100m away
          name: 'Louvre Museum',
          kinds: 'museums',
          point: { lat: 48.8609, lon: 2.3378 },
        },
        'paris'
      )!;

      const deduplicated = provider.filterAndDeduplicate([
        placeA,
        placeADuplicateId,
        placeANearbyDuplicateName,
      ]);

      expect(deduplicated.length).toBe(1);
      expect(deduplicated[0].id).toBe('otm-P_LOUVRE_1');
    });
  });

  describe('4. Network Responses & Error Handling', () => {
    it('successfully processes mocked proxy JSON response', async () => {
      const mockPlaces: OpenTripMapPlaceSummary[] = [
        {
          xid: 'XID_1',
          name: 'Colosseum Amphitheatre',
          kinds: 'historic,monuments_and_memorials',
          point: { lat: 41.8902, lon: 12.4922 },
        },
        {
          xid: 'XID_2',
          name: 'Vatican Museums',
          kinds: 'museums,cultural',
          point: { lat: 41.9067, lon: 12.4536 },
        },
      ];

      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPlaces,
      });

      const provider = new OpenTripMapProvider({ customFetch: customFetch as unknown as typeof fetch });
      const response = await provider.fetchPlaces({
        destinationId: 'rome',
        destinationName: 'Rome',
        coordinates: { lat: 41.9028, lng: 12.4964 },
      });

      expect(response.success).toBe(true);
      expect(response.status).toBe('ok');
      expect(response.activities.length).toBe(2);
      expect(response.activities[0].id).toBe('otm-XID_1');
      expect(response.activities[0].provenance).toBe('verified_provider');
    });

    it('gracefully handles empty places responses without crashing', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      });

      const provider = new OpenTripMapProvider({ customFetch: customFetch as unknown as typeof fetch });
      const response = await provider.fetchPlaces({
        destinationId: 'remote-desert',
        destinationName: 'Remote Desert',
      });

      expect(response.success).toBe(true);
      expect(response.status).toBe('empty');
      expect(response.activities).toEqual([]);
      expect(response.totalFound).toBe(0);
    });

    it('detects and handles HTTP 429 rate limiting with rateLimited flag', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const provider = new OpenTripMapProvider({ customFetch: customFetch as unknown as typeof fetch });
      const response = await provider.fetchPlaces({
        destinationId: 'tokyo',
        destinationName: 'Tokyo',
      });

      expect(response.success).toBe(false);
      expect(response.status).toBe('rate_limited');
      expect(response.rateLimited).toBe(true);
      expect(response.error).toContain('rate limit');
    });

    it('handles HTTP 500 server errors gracefully', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const provider = new OpenTripMapProvider({ customFetch: customFetch as unknown as typeof fetch });
      const response = await provider.fetchPlaces({
        destinationId: 'paris',
        destinationName: 'Paris',
      });

      expect(response.success).toBe(false);
      expect(response.status).toBe('network_error');
      expect(response.error).toContain('500');
    });

    it('handles malformed, non-JSON response payloads', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Unexpected token < in JSON at position 0');
        },
      });

      const provider = new OpenTripMapProvider({ customFetch: customFetch as unknown as typeof fetch });
      const response = await provider.fetchPlaces({
        destinationId: 'cairo',
        destinationName: 'Cairo',
      });

      expect(response.success).toBe(false);
      expect(response.status).toBe('malformed_data');
      expect(response.error).toContain('non-JSON');
    });

    it('handles network timeouts via AbortController', async () => {
      const customFetch = vi.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const provider = new OpenTripMapProvider({
        customFetch: customFetch as unknown as typeof fetch,
        timeoutMs: 100,
      });

      const response = await provider.fetchPlaces({
        destinationId: 'cairo',
        destinationName: 'Cairo',
      });

      expect(response.success).toBe(false);
      expect(response.status).toBe('network_error');
      expect(response.error).toContain('timed out');
    });
  });

  describe('5. Discovery Service & Curated Fallback Integration', () => {
    it('preserves curated catalog for curated destinations without querying external provider', async () => {
      const mockProvider: IPlacesProvider = {
        providerId: 'mock-provider',
        attribution: 'Mock Attribution',
        fetchPlaces: vi.fn(),
      };

      const discoveryService = new DestinationDiscoveryService(mockProvider);
      const candidates = await discoveryService.fetchActivityCandidates('paris');

      // Paris has 8 curated activities
      expect(candidates.length).toBe(8);
      candidates.forEach((c) => {
        expect(c.provenance).toBe('curated');
      });

      // Provider was NOT called because Paris is already curated!
      expect(mockProvider.fetchPlaces).not.toHaveBeenCalled();
    });

    it('queries external provider for uncurated resolved destinations', async () => {
      const mockProvider: IPlacesProvider = {
        providerId: 'mock-provider',
        attribution: 'Mock Attribution',
        fetchPlaces: vi.fn().mockResolvedValue({
          success: true,
          status: 'ok',
          provider: 'mock-provider',
          destinationId: 'australia',
          activities: [
            {
              id: 'otm-sydney-opera',
              name: 'Sydney Opera House',
              destinationId: 'australia',
              category: 'art',
              provenance: 'verified_provider',
              coordinates: { lat: -33.8568, lng: 151.2153 },
              tags: ['opera', 'art'],
              sourceAttribution: 'Mock Attribution',
            },
          ],
          totalFound: 1,
          sourceAttribution: 'Mock Attribution',
        }),
      };

      const discoveryService = new DestinationDiscoveryService(mockProvider);
      const candidates = await discoveryService.fetchActivityCandidates('australia');

      expect(mockProvider.fetchPlaces).toHaveBeenCalled();
      expect(candidates.length).toBe(1);
      expect(candidates[0].id).toBe('otm-sydney-opera');
      expect(candidates[0].provenance).toBe('verified_provider');
    });

    it('falls back to curated/empty when external provider fails', async () => {
      const failingProvider: IPlacesProvider = {
        providerId: 'failing-provider',
        attribution: 'Failing Attribution',
        fetchPlaces: vi.fn().mockRejectedValue(new Error('503 Service Unavailable')),
      };

      const discoveryService = new DestinationDiscoveryService(failingProvider);
      const candidates = await discoveryService.fetchActivityCandidates('atlantis');

      // Does not crash; returns empty array safely
      expect(candidates).toEqual([]);
    });
  });

  describe('6. Hybrid Planning Integration with External Provider', () => {
    it('incorporates provider activities into hybrid plan proposal for uncurated destinations', async () => {
      const mockProvider: IPlacesProvider = {
        providerId: 'test-places-provider',
        attribution: 'Test Attribution',
        fetchPlaces: vi.fn().mockResolvedValue({
          success: true,
          status: 'ok',
          provider: 'test-places-provider',
          destinationId: 'australia',
          activities: [
            {
              id: 'otm-opera-house',
              name: 'Sydney Opera House',
              destinationId: 'australia',
              category: 'art',
              provenance: 'verified_provider',
              coordinates: { lat: -33.8568, lng: 151.2153 },
              tags: ['art', 'opera'],
              sourceAttribution: 'Test Attribution',
            },
            {
              id: 'otm-harbour-bridge',
              name: 'Sydney Harbour Bridge',
              destinationId: 'australia',
              category: 'landmark',
              provenance: 'verified_provider',
              coordinates: { lat: -33.8523, lng: 151.2108 },
              tags: ['bridge', 'landmark'],
              sourceAttribution: 'Test Attribution',
            },
            {
              id: 'otm-botanic-gardens',
              name: 'Royal Botanic Garden',
              destinationId: 'australia',
              category: 'nature',
              provenance: 'verified_provider',
              coordinates: { lat: -33.8642, lng: 151.2166 },
              tags: ['gardens', 'nature'],
              sourceAttribution: 'Test Attribution',
            },
          ],
          totalFound: 3,
          sourceAttribution: 'Test Attribution',
        }),
      };

      const hybridService = new HybridPlanningService(new FallbackDeterministicAdapter());

      // Temporary set places provider on global discovery service
      const { destinationDiscoveryService } = await import('../services/destinationDiscoveryService');
      destinationDiscoveryService.setPlacesProvider(mockProvider);

      try {
        const plan = await hybridService.planTrip({
          destinationId: 'australia',
          days: 1,
          travelers: 1,
          budget: 200,
          travelStyle: 'culture',
        });

        expect(plan).toBeDefined();
        expect(plan.hasVerifiedActivities).toBe(true);
        expect(plan.dataStatus).toBe('curated');
        expect(plan.days[0].items.length).toBe(3);
        expect(plan.days[0].items[0].activity.id).toMatch(/^otm-/);
      } finally {
        destinationDiscoveryService.setPlacesProvider(null);
      }
    });
  });
});
