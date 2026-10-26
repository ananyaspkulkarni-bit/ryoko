import { describe, it, expect, vi } from 'vitest';
import { destinationDiscoveryService } from '../services/destinationDiscoveryService';
import { activityProviderCoordinator } from '../services/activityProviderCoordinator';
import { OpenTripMapProvider, openTripMapProvider } from '../services/openTripMapProvider';
import { HybridPlanningService } from '../services/hybridPlanningService';
import { FallbackDeterministicAdapter } from '../services/aiPlanningAdapter';

describe('OpenTripMap End-to-End Integration Suite', () => {
  describe('1. Destination Resolution & World Cities Integration', () => {
    it('resolves verified cities from worldCities.ts with genuine geographic coordinates', () => {
      const sydney = destinationDiscoveryService.resolveDestination('Sydney');
      expect(sydney.status).toBe('resolved');
      expect(sydney.provenance).toBe('city_catalog');
      expect(sydney.destination).toBeDefined();
      expect(sydney.destination!.name).toBe('Sydney');
      expect(sydney.destination!.country).toBe('Australia');
      expect(sydney.destination!.countryCode).toBe('AU');
      expect(sydney.destination!.coordinates.lat).toBeCloseTo(-33.8688, 3);
      expect(sydney.destination!.coordinates.lng).toBeCloseTo(151.2093, 3);
      expect(sydney.hasVerifiedActivities).toBe(false);

      const vancouver = destinationDiscoveryService.resolveDestination('Vancouver');
      expect(vancouver.status).toBe('resolved');
      expect(vancouver.provenance).toBe('city_catalog');
      expect(vancouver.destination!.name).toBe('Vancouver');
      expect(vancouver.destination!.coordinates.lat).toBeCloseTo(49.2827, 3);
      expect(vancouver.destination!.coordinates.lng).toBeCloseTo(-123.1207, 3);
    });

    it('preserves curated precedence for cities that are curated in Ryoko catalog', () => {
      // Kyoto is in both worldCities and MOCK_DESTINATIONS; curated takes full precedence
      const kyoto = destinationDiscoveryService.resolveDestination('Kyoto');
      expect(kyoto.status).toBe('curated');
      expect(kyoto.provenance).toBe('curated');
      expect(kyoto.destination!.id).toBe('kyoto');
      expect(kyoto.hasVerifiedActivities).toBe(true);

      const paris = destinationDiscoveryService.resolveDestination('Paris');
      expect(paris.status).toBe('curated');
      expect(paris.hasVerifiedActivities).toBe(true);
    });
  });

  describe('2. End-to-End Activity Fetching Through Server Proxy', () => {
    it('successfully queries OpenTripMap via proxy and returns normalized activities for uncurated city', async () => {
      const mockOtmPlaces = [
        {
          xid: 'Q35178',
          name: 'Sydney Opera House',
          rate: 3,
          kinds: 'theatres,cultural,architecture',
          point: { lat: -33.8568, lon: 151.2153 },
        },
        {
          xid: 'Q54495',
          name: 'Sydney Harbour Bridge',
          rate: 3,
          kinds: 'bridges,view_points,architecture',
          point: { lat: -33.8523, lon: 151.2108 },
        },
        {
          xid: 'Q112233',
          name: 'Royal Botanic Garden Sydney',
          rate: 2,
          kinds: 'natural,gardens_and_parks',
          point: { lat: -33.8642, lon: 151.2166 },
        },
      ];

      const customFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.startsWith('/api/places') || url.includes('/api/places')) {
          return {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({
              places: mockOtmPlaces,
              totalFound: mockOtmPlaces.length,
              sourceAttribution: 'OpenTripMap (Data © OpenStreetMap contributors)',
            }),
          };
        }

        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' }),
        };
      });

      const e2eProvider = new OpenTripMapProvider({
        customFetch: customFetch as unknown as typeof fetch,
      });

      activityProviderCoordinator.setExternalProvider(e2eProvider);

      try {
        const activities = await destinationDiscoveryService.fetchActivityCandidates('sydney');

        expect(activities.length).toBe(3);

        const operaHouse = activities.find((a) => a.name === 'Sydney Opera House');
        expect(operaHouse).toBeDefined();
        expect(operaHouse!.id).toBe('otm-Q35178');
        expect(operaHouse!.providerPlaceId).toBe('Q35178');
        expect(operaHouse!.provenance).toBe('verified_provider');
        expect(operaHouse!.category).toBe('art');
        expect(operaHouse!.coordinates).toEqual({ lat: -33.8568, lng: 151.2153 });
        expect(operaHouse!.sourceAttribution).toContain('OpenTripMap');

        // Verify no fabricated fields
        expect(operaHouse!.estimatedCostPerPerson).toBeUndefined();
        expect(operaHouse!.estimatedDurationMinutes).toBeUndefined();
        expect(operaHouse!.openingHours).toBeUndefined();
      } finally {
        activityProviderCoordinator.setExternalProvider(openTripMapProvider);
      }
    });

    it('strictly preserves curated catalog precedence for curated destinations (external provider never called)', async () => {
      const spyProxyFetch = vi.fn();
      const mockProvider = new OpenTripMapProvider({
        customFetch: spyProxyFetch as unknown as typeof fetch,
      });

      activityProviderCoordinator.setExternalProvider(mockProvider);

      try {
        const parisActivities = await destinationDiscoveryService.fetchActivityCandidates('paris');

        // Paris has 8 curated activities in Ryoko dataset
        expect(parisActivities.length).toBe(8);
        parisActivities.forEach((act) => {
          expect(act.provenance).toBe('curated');
          expect(act.sourceAttribution).toBe('Ryoko Curated Catalog');
        });

        // The external proxy was NEVER invoked because curated data exists
        expect(spyProxyFetch).not.toHaveBeenCalled();
      } finally {
        activityProviderCoordinator.setExternalProvider(openTripMapProvider);
      }
    });

    it('falls back gracefully without crashing when proxy reports upstream rate limiting (HTTP 429)', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({
          error: 'OpenTripMap rate limit reached. Fallback to curated activities active.',
          status: 'rate_limited',
          rateLimited: true,
        }),
      });

      const rateLimitedProvider = new OpenTripMapProvider({
        customFetch: customFetch as unknown as typeof fetch,
      });

      activityProviderCoordinator.setExternalProvider(rateLimitedProvider);

      try {
        const activities = await destinationDiscoveryService.fetchActivityCandidates('sydney');
        // Graceful fallback: returns empty array without throwing
        expect(activities).toEqual([]);
      } finally {
        activityProviderCoordinator.setExternalProvider(openTripMapProvider);
      }
    });
  });

  describe('3. Hybrid Planning Sourcing from Discovered Activities', () => {
    it('seamlessly plans an itinerary incorporating discovered verified activities for an uncurated city', async () => {
      const mockSydneyActivities = [
        {
          xid: 'PO1',
          name: 'Sydney Opera House',
          rate: 3,
          kinds: 'theatres,cultural',
          point: { lat: -33.8568, lon: 151.2153 },
        },
        {
          xid: 'PO2',
          name: 'Sydney Harbour Bridge',
          rate: 3,
          kinds: 'bridges,view_points',
          point: { lat: -33.8523, lon: 151.2108 },
        },
        {
          xid: 'PO3',
          name: 'Royal Botanic Garden',
          rate: 2,
          kinds: 'natural,gardens_and_parks',
          point: { lat: -33.8642, lon: 151.2166 },
        },
      ];

      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          places: mockSydneyActivities,
          totalFound: mockSydneyActivities.length,
          sourceAttribution: 'OpenTripMap (Data © OpenStreetMap contributors)',
        }),
      });

      const provider = new OpenTripMapProvider({
        customFetch: customFetch as unknown as typeof fetch,
      });

      activityProviderCoordinator.setExternalProvider(provider);
      destinationDiscoveryService.setPlacesProvider(provider);

      try {
        const hybridPlanner = new HybridPlanningService(new FallbackDeterministicAdapter());
        const plan = await hybridPlanner.planTrip({
          destinationId: 'sydney',
          days: 1,
          travelers: 1,
          budget: 200,
          travelStyle: 'culture',
        });

        expect(plan).toBeDefined();
        expect(plan.destinationName).toBe('Sydney');
        expect(plan.hasVerifiedActivities).toBe(true);
        expect(plan.dataStatus).toBe('curated');
        expect(plan.days[0].items.length).toBeGreaterThanOrEqual(1);

        const firstActivity = plan.days[0].items[0].activity;
        expect(firstActivity.id).toMatch(/^otm-/);
        expect(firstActivity.destinationId).toBe('sydney');
      } finally {
        activityProviderCoordinator.setExternalProvider(openTripMapProvider);
        destinationDiscoveryService.setPlacesProvider(openTripMapProvider);
      }
    });
  });
});
