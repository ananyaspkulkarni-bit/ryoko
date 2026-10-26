import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  handlePlacesProxyRequest,
  validatePlacesParams,
  createPlacesProxyMiddleware,
  OPENTRIPMAP_ATTRIBUTION,
} from './placesProxyHandler.ts';

describe('Server-Side Places Proxy Suite', () => {
  const originalEnv = process.env.OPENTRIPMAP_API_KEY;

  beforeEach(() => {
    process.env.OPENTRIPMAP_API_KEY = 'test-server-api-key';
  });

  afterEach(() => {
    process.env.OPENTRIPMAP_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  describe('1. Parameter Validation & Bounds Enforcement', () => {
    it('validates coordinates, radius, and limits within authentic geographical bounds', () => {
      const valid = validatePlacesParams({
        lat: '-33.8688',
        lng: '151.2093',
        radius: '10000',
        limit: '20',
      });

      expect(valid.valid).toBe(true);
      if (valid.valid) {
        expect(valid.params.lat).toBe(-33.8688);
        expect(valid.params.lng).toBe(151.2093);
        expect(valid.params.radius).toBe(10000);
        expect(valid.params.limit).toBe(20);
      }
    });

    it('supports "lon" as alias for "lng"', () => {
      const valid = validatePlacesParams({
        lat: '48.8566',
        lon: '2.3522',
      });

      expect(valid.valid).toBe(true);
      if (valid.valid) {
        expect(valid.params.lng).toBe(2.3522);
      }
    });

    it('rejects missing or blank latitude', () => {
      const missing = validatePlacesParams({ lng: '151.2093' });
      expect(missing.valid).toBe(false);
      if (!missing.valid) {
        expect(missing.statusCode).toBe(400);
        expect(missing.error).toContain('Missing required query parameter "lat"');
      }

      const blank = validatePlacesParams({ lat: '   ', lng: '151.2093' });
      expect(blank.valid).toBe(false);
    });

    it('rejects missing or blank longitude', () => {
      const missing = validatePlacesParams({ lat: '-33.8688' });
      expect(missing.valid).toBe(false);
      if (!missing.valid) {
        expect(missing.statusCode).toBe(400);
        expect(missing.error).toContain('Missing required query parameter "lng"');
      }
    });

    it('rejects non-numeric or NaN coordinates', () => {
      const badLat = validatePlacesParams({ lat: 'abc', lng: '151.2093' });
      expect(badLat.valid).toBe(false);
      if (!badLat.valid) {
        expect(badLat.error).toContain('Invalid latitude');
      }

      const badLng = validatePlacesParams({ lat: '-33.8688', lng: 'not-a-number' });
      expect(badLng.valid).toBe(false);
      if (!badLng.valid) {
        expect(badLng.error).toContain('Invalid longitude');
      }
    });

    it('rejects out-of-range latitude (beyond [-90, 90])', () => {
      const tooHigh = validatePlacesParams({ lat: '95', lng: '0' });
      expect(tooHigh.valid).toBe(false);

      const tooLow = validatePlacesParams({ lat: '-120', lng: '0' });
      expect(tooLow.valid).toBe(false);
    });

    it('rejects out-of-range longitude (beyond [-180, 180])', () => {
      const tooHigh = validatePlacesParams({ lat: '0', lng: '190' });
      expect(tooHigh.valid).toBe(false);

      const tooLow = validatePlacesParams({ lat: '0', lng: '-200' });
      expect(tooLow.valid).toBe(false);
    });

    it('enforces radius bounds between 100m and 50,000m', () => {
      const tooSmall = validatePlacesParams({ lat: '0', lng: '0', radius: '50' });
      expect(tooSmall.valid).toBe(false);
      if (!tooSmall.valid) expect(tooSmall.error).toContain('Radius');

      const tooLarge = validatePlacesParams({ lat: '0', lng: '0', radius: '60000' });
      expect(tooLarge.valid).toBe(false);

      const notNumber = validatePlacesParams({ lat: '0', lng: '0', radius: 'five-km' });
      expect(notNumber.valid).toBe(false);
    });

    it('enforces limit bounds between 1 and 50', () => {
      const zero = validatePlacesParams({ lat: '0', lng: '0', limit: '0' });
      expect(zero.valid).toBe(false);

      const over50 = validatePlacesParams({ lat: '0', lng: '0', limit: '100' });
      expect(over50.valid).toBe(false);

      const negative = validatePlacesParams({ lat: '0', lng: '0', limit: '-5' });
      expect(negative.valid).toBe(false);
    });
  });

  describe('2. Secret Environment Key Protection', () => {
    it('returns HTTP 503 when OPENTRIPMAP_API_KEY is not configured on server', async () => {
      delete process.env.OPENTRIPMAP_API_KEY;

      const result = await handlePlacesProxyRequest(
        { lat: '48.8566', lng: '2.3522' },
        { apiKey: undefined }
      );

      expect(result.statusCode).toBe(503);
      const parsed = JSON.parse(result.body);
      expect(parsed.error).toContain('OPENTRIPMAP_API_KEY in server environment');
      expect(parsed.status).toBe('unconfigured');
    });

    it('never leaks the API key in client responses or error messages', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      });

      const secretKey = 'super-secret-production-key-998877';
      const result = await handlePlacesProxyRequest(
        { lat: '35.6762', lng: '139.6503' },
        { apiKey: secretKey, customFetch: customFetch as unknown as typeof fetch }
      );

      expect(result.body).not.toContain(secretKey);
      // But verify that the upstream call properly used the key
      expect(customFetch).toHaveBeenCalled();
      const calledUrl = customFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain(`apikey=${secretKey}`);
    });
  });

  describe('3. Upstream Provider Communication & Error Handling', () => {
    it('successfully proxies authentic POIs with source IDs and required attribution', async () => {
      const mockOtmPlaces = [
        {
          xid: 'R123456',
          name: 'Sydney Opera House',
          dist: 120.5,
          rate: 3,
          kinds: 'theatres,cultural,architecture,interesting_places',
          point: { lat: -33.8568, lon: 151.2153 },
          osm: 'relation/123456',
        },
        {
          xid: 'W789012',
          name: 'Sydney Harbour Bridge',
          dist: 640.2,
          rate: 3,
          kinds: 'bridges,view_points,architecture,interesting_places',
          point: { lat: -33.8523, lon: 151.2108 },
          osm: 'way/789012',
        },
      ];

      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockOtmPlaces,
      });

      const result = await handlePlacesProxyRequest(
        { lat: '-33.8688', lng: '151.2093', radius: '15000', limit: '10' },
        { customFetch: customFetch as unknown as typeof fetch }
      );

      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toContain('application/json');

      const parsed = JSON.parse(result.body);
      expect(parsed.totalFound).toBe(2);
      expect(parsed.sourceAttribution).toBe(OPENTRIPMAP_ATTRIBUTION);
      expect(parsed.places).toHaveLength(2);

      // Verify authentic fields preserved
      expect(parsed.places[0].xid).toBe('R123456');
      expect(parsed.places[0].name).toBe('Sydney Opera House');
      expect(parsed.places[0].point).toEqual({ lat: -33.8568, lon: 151.2153 });
      expect(parsed.places[0].kinds).toContain('theatres');
      expect(parsed.places[0].rate).toBe(3);

      // Verify no fabricated fields
      expect(parsed.places[0]).not.toHaveProperty('price');
      expect(parsed.places[0]).not.toHaveProperty('openingHours');
      expect(parsed.places[0]).not.toHaveProperty('duration');
    });

    it('filters out corrupt or unnamed entries from upstream response without crashing', async () => {
      const mixedOtmPlaces = [
        {
          xid: 'OK_1',
          name: 'Valid Botanical Garden',
          kinds: 'natural,gardens_and_parks',
          point: { lat: -33.8642, lon: 151.2166 },
        },
        {
          xid: 'BAD_1',
          name: '   ', // Blank name
          kinds: 'natural',
          point: { lat: -33.8642, lon: 151.2166 },
        },
        {
          xid: 'BAD_2',
          name: 'Missing Coords',
          kinds: 'natural',
          point: null,
        },
        {
          xid: 'BAD_3',
          name: 'NaN Coords',
          kinds: 'natural',
          point: { lat: NaN, lon: 151.2166 },
        },
      ];

      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mixedOtmPlaces,
      });

      const result = await handlePlacesProxyRequest(
        { lat: '-33.8688', lng: '151.2093' },
        { customFetch: customFetch as unknown as typeof fetch }
      );

      expect(result.statusCode).toBe(200);
      const parsed = JSON.parse(result.body);
      expect(parsed.places).toHaveLength(1);
      expect(parsed.places[0].xid).toBe('OK_1');
    });

    it('handles HTTP 429 rate limit from OpenTripMap', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const result = await handlePlacesProxyRequest(
        { lat: '51.5074', lng: '-0.1278' },
        { customFetch: customFetch as unknown as typeof fetch }
      );

      expect(result.statusCode).toBe(429);
      const parsed = JSON.parse(result.body);
      expect(parsed.rateLimited).toBe(true);
      expect(parsed.status).toBe('rate_limited');
      expect(parsed.error).toContain('rate limit');
    });

    it('handles HTTP 401/403 authentication failures gracefully', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await handlePlacesProxyRequest(
        { lat: '51.5074', lng: '-0.1278' },
        { customFetch: customFetch as unknown as typeof fetch }
      );

      expect(result.statusCode).toBe(502);
      const parsed = JSON.parse(result.body);
      expect(parsed.status).toBe('auth_error');
      expect(parsed.error).toContain('authentication failed');
    });

    it('handles upstream HTTP 500 error from provider', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await handlePlacesProxyRequest(
        { lat: '51.5074', lng: '-0.1278' },
        { customFetch: customFetch as unknown as typeof fetch }
      );

      expect(result.statusCode).toBe(502);
      const parsed = JSON.parse(result.body);
      expect(parsed.status).toBe('provider_error');
      expect(parsed.error).toContain('HTTP error 500');
    });

    it('handles upstream error object payload (e.g. { error: "invalid_key" })', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ error: 'Invalid API key or quota exceeded' }),
      });

      const result = await handlePlacesProxyRequest(
        { lat: '51.5074', lng: '-0.1278' },
        { customFetch: customFetch as unknown as typeof fetch }
      );

      expect(result.statusCode).toBe(502);
      const parsed = JSON.parse(result.body);
      expect(parsed.status).toBe('provider_error');
      expect(parsed.error).toContain('Invalid API key or quota exceeded');
    });

    it('handles malformed non-JSON upstream response', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      });

      const result = await handlePlacesProxyRequest(
        { lat: '51.5074', lng: '-0.1278' },
        { customFetch: customFetch as unknown as typeof fetch }
      );

      expect(result.statusCode).toBe(502);
      const parsed = JSON.parse(result.body);
      expect(parsed.status).toBe('malformed_data');
      expect(parsed.error).toContain('non-JSON response');
    });

    it('handles upstream timeout via AbortController', async () => {
      const customFetch = vi.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const result = await handlePlacesProxyRequest(
        { lat: '51.5074', lng: '-0.1278' },
        { timeoutMs: 50, customFetch: customFetch as unknown as typeof fetch }
      );

      expect(result.statusCode).toBe(504);
      const parsed = JSON.parse(result.body);
      expect(parsed.status).toBe('timeout');
      expect(parsed.error).toContain('timed out');
    });
  });

  describe('4. Connect / Vite Middleware Integration', () => {
    it('handles OPTIONS preflight request with 204 and CORS headers', async () => {
      const middleware = createPlacesProxyMiddleware();

      const headersSet: Record<string, string> = {};
      let ended = false;

      const mockReq = {
        method: 'OPTIONS',
        url: '/api/places',
      } as unknown as IncomingMessage;

      const mockRes = {
        statusCode: 0,
        setHeader: (k: string, v: string) => {
          headersSet[k] = v;
        },
        end: () => {
          ended = true;
        },
      } as unknown as ServerResponse;

      await middleware(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(204);
      expect(headersSet['Access-Control-Allow-Origin']).toBe('*');
      expect(headersSet['Access-Control-Allow-Methods']).toContain('GET');
      expect(ended).toBe(true);
    });

    it('rejects POST method with 405 Method Not Allowed', async () => {
      const middleware = createPlacesProxyMiddleware();

      let body = '';
      const mockReq = {
        method: 'POST',
        url: '/api/places',
      } as unknown as IncomingMessage;

      const mockRes = {
        statusCode: 0,
        setHeader: vi.fn(),
        end: (data?: string) => {
          if (data) body = data;
        },
      } as unknown as ServerResponse;

      await middleware(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(405);
      expect(body).toContain('Method POST not allowed');
    });

    it('processes GET request via middleware and writes JSON response', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {
            xid: 'PARIS_1',
            name: 'Louvre Pyramid',
            point: { lat: 48.8606, lon: 2.3376 },
            kinds: 'museums',
          },
        ],
      });

      const middleware = createPlacesProxyMiddleware({
        customFetch: customFetch as unknown as typeof fetch,
      });

      let responseBody = '';
      const headersSet: Record<string, string> = {};

      const mockReq = {
        method: 'GET',
        url: '/api/places?lat=48.8566&lng=2.3522&radius=5000&limit=5',
      } as unknown as IncomingMessage;

      const mockRes = {
        statusCode: 0,
        setHeader: (k: string, v: string) => {
          headersSet[k] = v;
        },
        end: (data?: string) => {
          if (data) responseBody = data;
        },
      } as unknown as ServerResponse;

      await middleware(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(headersSet['Content-Type']).toBe('application/json');

      const parsed = JSON.parse(responseBody);
      expect(parsed.totalFound).toBe(1);
      expect(parsed.places[0].name).toBe('Louvre Pyramid');
    });
  });
});
