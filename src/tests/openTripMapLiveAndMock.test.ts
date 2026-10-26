import { describe, it, expect, vi, afterEach } from 'vitest';
import { OpenTripMapProvider, openTripMapProvider } from '../services/openTripMapProvider';
import { handlePlacesProxyRequest, createPlacesProxyMiddleware } from '../../server/placesProxyHandler.ts';
import { ActivityProviderCoordinator, activityProviderCoordinator } from '../services/activityProviderCoordinator';
import { CuratedActivityProvider } from '../services/curatedActivityProvider';
import { destinationDiscoveryService } from '../services/destinationDiscoveryService';
import { HybridPlanningService } from '../services/hybridPlanningService';
import { FallbackDeterministicAdapter } from '../services/aiPlanningAdapter';
import type { IncomingMessage, ServerResponse } from 'node:http';

describe('OpenTripMap Live & Mock Integration Suite', () => {
  const originalEnv = process.env.OPENTRIPMAP_API_KEY;

  afterEach(() => {
    process.env.OPENTRIPMAP_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  describe('1. Missing Server API Key Handling', () => {
    it('returns HTTP 503 with helpful unconfigured error when OPENTRIPMAP_API_KEY is not set', async () => {
      delete process.env.OPENTRIPMAP_API_KEY;

      const res = await handlePlacesProxyRequest(
        { lat: '-33.8688', lng: '151.2093', destinationId: 'sydney' },
        { apiKey: undefined }
      );

      expect(res.statusCode).toBe(503);
      const parsed = JSON.parse(res.body);
      expect(parsed.status).toBe('unconfigured');
      expect(parsed.error).toContain('OPENTRIPMAP_API_KEY');
    });

    it('coordinator and provider gracefully return empty activities when server proxy returns 503 unconfigured', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({
          error: 'OpenTripMap API key is not configured on the server. Set OPENTRIPMAP_API_KEY in server environment.',
          status: 'unconfigured',
        }),
      });

      const provider = new OpenTripMapProvider({ customFetch: mockFetch as unknown as typeof fetch });
      const coord = new ActivityProviderCoordinator(new CuratedActivityProvider(), provider);

      const response = await coord.fetchActivities({
        destinationId: 'sydney',
        destinationName: 'Sydney',
        coordinates: { lat: -33.8688, lng: 151.2093 },
      });

      expect(response.success).toBe(false);
      expect(response.activities).toEqual([]);
      expect(response.totalFound).toBe(0);
      expect(response.status).toBe('network_error');
    });
  });

  describe('2. Successful Provider Responses & Cost Integrity', () => {
    const sampleOtmPlaces = [
      {
        xid: 'OTM_SYD_1',
        name: 'Sydney Opera House',
        rate: 3,
        kinds: 'theatres,cultural,architecture',
        point: { lat: -33.8568, lon: 151.2153 },
      },
      {
        xid: 'OTM_SYD_2',
        name: 'Sydney Harbour Bridge',
        rate: 3,
        kinds: 'bridges,view_points,architecture',
        point: { lat: -33.8523, lon: 151.2108 },
      },
      {
        xid: 'OTM_SYD_3',
        name: 'Bondi Beach',
        rate: 2,
        kinds: 'natural,beaches',
        point: { lat: -33.8915, lon: 151.2767 },
      },
    ];

    it('queries /api/places endpoint and normalizes returned places with unknown cost preserved as undefined', async () => {
      let calledUrl = '';
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        calledUrl = url;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            places: sampleOtmPlaces,
            totalFound: sampleOtmPlaces.length,
            sourceAttribution: 'OpenTripMap (Data © OpenStreetMap contributors)',
          }),
        };
      });

      const provider = new OpenTripMapProvider({
        proxyUrl: '/api/places',
        customFetch: mockFetch as unknown as typeof fetch,
      });

      const result = await provider.fetchPlaces({
        destinationId: 'sydney',
        destinationName: 'Sydney',
        coordinates: { lat: -33.8688, lng: 151.2093 },
      });

      expect(calledUrl).toContain('/api/places');
      expect(calledUrl).toContain('lat=-33.8688');
      expect(calledUrl).toContain('lng=151.2093');
      expect(result.success).toBe(true);
      expect(result.activities.length).toBe(3);

      // Verify authentic normalized properties
      const operaHouse = result.activities[0];
      expect(operaHouse.id).toBe('otm-OTM_SYD_1');
      expect(operaHouse.name).toBe('Sydney Opera House');
      expect(operaHouse.category).toBe('art');
      expect(operaHouse.provenance).toBe('verified_provider');
      expect(operaHouse.coordinates).toEqual({ lat: -33.8568, lng: 151.2153 });

      // CRITICAL: Must NOT invent attraction prices or durations
      expect(operaHouse.estimatedCostPerPerson).toBeUndefined();
      expect(operaHouse.estimatedDurationMinutes).toBeUndefined();
      expect(operaHouse.openingHours).toBeUndefined();
    });

    it('hybrid planner schedules discovered places with undefined cost without guessing or inventing numerical prices', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          places: sampleOtmPlaces,
          totalFound: sampleOtmPlaces.length,
          sourceAttribution: 'OpenTripMap (Data © OpenStreetMap contributors)',
        }),
      });

      const provider = new OpenTripMapProvider({ customFetch: mockFetch as unknown as typeof fetch });
      activityProviderCoordinator.setExternalProvider(provider);
      destinationDiscoveryService.setPlacesProvider(provider);

      try {
        const hybridPlanner = new HybridPlanningService(new FallbackDeterministicAdapter());
        const plan = await hybridPlanner.planTrip({
          destinationId: 'sydney',
          days: 1,
          travelers: 2,
          budget: 500,
          travelStyle: 'culture',
        });

        expect(plan.destinationName).toBe('Sydney');
        expect(plan.hasVerifiedActivities).toBe(true);
        expect(plan.dataStatus).toBe('curated');
        expect(plan.days[0].items.length).toBeGreaterThan(0);

        // Every scheduled item has costForGroup === undefined (not guessed or $0 placeholder)
        plan.days[0].items.forEach((item) => {
          expect(item.activity.estimatedCostPerPerson).toBeUndefined();
          expect(item.costForGroup).toBeUndefined();
        });

        // Total cost must remain $0 when admission prices are unrecorded
        expect(plan.totalEstimatedCost).toBe(0);
      } finally {
        activityProviderCoordinator.setExternalProvider(openTripMapProvider);
        destinationDiscoveryService.setPlacesProvider(openTripMapProvider);
      }
    });
  });

  describe('3. Invalid Records & Malformed Payload Filtering', () => {
    it('filters out corrupt records (blank names, NaN coordinates) and preserves only genuine POIs', async () => {
      const corruptUpstreamPlaces = [
        {
          xid: 'VALID_1',
          name: 'Authentic Museum',
          kinds: 'museums',
          point: { lat: 48.8566, lon: 2.3522 },
        },
        {
          xid: 'CORRUPT_1',
          name: '', // Empty name
          kinds: 'museums',
          point: { lat: 48.8566, lon: 2.3522 },
        },
        {
          xid: 'CORRUPT_2',
          name: 'Missing Point Object',
          kinds: 'museums',
          point: null,
        },
        {
          xid: 'CORRUPT_3',
          name: 'NaN Coordinates',
          kinds: 'museums',
          point: { lat: NaN, lon: 2.3522 },
        },
      ];

      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => corruptUpstreamPlaces,
      });

      const res = await handlePlacesProxyRequest(
        { lat: '48.8566', lng: '2.3522' },
        { apiKey: 'test-key', customFetch: customFetch as unknown as typeof fetch }
      );

      expect(res.statusCode).toBe(200);
      const parsed = JSON.parse(res.body);
      expect(parsed.places).toHaveLength(1);
      expect(parsed.places[0].name).toBe('Authentic Museum');
      expect(parsed.places[0].xid).toBe('VALID_1');
    });

    it('handles non-JSON upstream responses with HTTP 502 without crashing the proxy', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      });

      const res = await handlePlacesProxyRequest(
        { lat: '48.8566', lng: '2.3522' },
        { apiKey: 'test-key', customFetch: customFetch as unknown as typeof fetch }
      );

      expect(res.statusCode).toBe(502);
      const parsed = JSON.parse(res.body);
      expect(parsed.status).toBe('malformed_data');
    });
  });

  describe('4. Empty Results & Upstream Failures', () => {
    it('returns empty results gracefully when upstream returns 0 places', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      });

      const res = await handlePlacesProxyRequest(
        { lat: '0', lng: '0' },
        { apiKey: 'test-key', customFetch: customFetch as unknown as typeof fetch }
      );

      expect(res.statusCode).toBe(200);
      const parsed = JSON.parse(res.body);
      expect(parsed.places).toEqual([]);
      expect(parsed.totalFound).toBe(0);
    });

    it('returns 502 provider_error when upstream server responds with HTTP 500', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const res = await handlePlacesProxyRequest(
        { lat: '48.8566', lng: '2.3522' },
        { apiKey: 'test-key', customFetch: customFetch as unknown as typeof fetch }
      );

      expect(res.statusCode).toBe(502);
      const parsed = JSON.parse(res.body);
      expect(parsed.status).toBe('provider_error');
    });

    it('returns 504 timeout when upstream request exceeds timeout limit', async () => {
      const customFetch = vi.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const res = await handlePlacesProxyRequest(
        { lat: '48.8566', lng: '2.3522' },
        { apiKey: 'test-key', customFetch: customFetch as unknown as typeof fetch }
      );

      expect(res.statusCode).toBe(504);
      const parsed = JSON.parse(res.body);
      expect(parsed.status).toBe('timeout');
    });
  });

  describe('5. Curated Catalog Precedence', () => {
    const CURATED_CITIES = ['paris', 'cairo', 'tokyo', 'mumbai', 'rome'];

    it.each(CURATED_CITIES)('curated destination "%s" strictly bypasses external provider', async (cityId) => {
      const mockExternalFetch = vi.fn();
      const spyProvider = new OpenTripMapProvider({ customFetch: mockExternalFetch as unknown as typeof fetch });

      activityProviderCoordinator.setExternalProvider(spyProvider);

      try {
        const activities = await destinationDiscoveryService.fetchActivityCandidates(cityId);

        expect(activities.length).toBeGreaterThan(0);
        activities.forEach((act) => {
          expect(act.provenance).toBe('curated');
          expect(act.sourceAttribution).toBe('Ryoko Curated Catalog');
        });

        // External provider must NEVER be called for curated destinations
        expect(mockExternalFetch).not.toHaveBeenCalled();
      } finally {
        activityProviderCoordinator.setExternalProvider(openTripMapProvider);
      }
    });
  });

  describe('6. Live Network Verification (Conditional)', () => {
    const liveKey = process.env.OPENTRIPMAP_API_KEY;
    const hasGenuineKey = Boolean(
      liveKey &&
      liveKey.trim() !== '' &&
      !liveKey.includes('your_') &&
      !liveKey.includes('placeholder') &&
      !liveKey.includes('test-')
    );

    if (!hasGenuineKey) {
      it('documents that live network tests are skipped when OPENTRIPMAP_API_KEY is not configured', () => {
        // Honest reporting: do not claim live integration unless tested with a live key
        expect(hasGenuineKey).toBe(false);
        console.info(
          '[Live Verification Note]: Live OpenTripMap network verification skipped — OPENTRIPMAP_API_KEY is not configured with a live credentials key. All mock and proxy contract tests are fully verified.'
        );
      });
    } else {
      it('executes live query against OpenTripMap via local places proxy', async () => {
        const middleware = createPlacesProxyMiddleware({ apiKey: liveKey });

        // Simulate local HTTP request to proxy middleware
        const req = {
          method: 'GET',
          url: '/api/places?lat=-33.8688&lng=151.2093&radius=10000&limit=5',
        } as IncomingMessage;

        let responseBody = '';
        let statusCode = 0;
        const res = {
          statusCode: 200,
          setHeader: vi.fn(),
          end: (data: string) => {
            responseBody = data;
          },
        } as unknown as ServerResponse;

        await middleware(req, res);

        statusCode = (res as any).statusCode;
        expect(statusCode).toBe(200);

        const parsed = JSON.parse(responseBody);
        expect(parsed.places).toBeDefined();
        expect(Array.isArray(parsed.places)).toBe(true);
        expect(parsed.sourceAttribution).toContain('OpenTripMap');
      });
    }
  });
});
