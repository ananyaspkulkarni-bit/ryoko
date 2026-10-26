import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  handleRoutesProxyRequest,
  validateRouteParams,
  createRoutesProxyMiddleware,
  GOOGLE_ROUTES_ATTRIBUTION,
} from './routesProxyHandler.ts';

describe('Server-Side Routes Proxy Suite', () => {
  const originalEnv = process.env.GOOGLE_ROUTES_API_KEY;

  beforeEach(() => {
    process.env.GOOGLE_ROUTES_API_KEY = 'test-server-api-key';
  });

  afterEach(() => {
    process.env.GOOGLE_ROUTES_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  describe('1. Parameter Validation & Bounds Enforcement', () => {
    it('validates nested coordinate objects and transit mode', () => {
      const valid = validateRouteParams({
        origin: { lat: 48.8566, lng: 2.3522 },
        destination: { lat: 48.8606, lng: 2.3376 },
        originName: 'Notre-Dame',
        destinationName: 'Louvre',
        mode: 'walking',
      });

      expect(valid.valid).toBe(true);
      if (valid.valid) {
        expect(valid.params.origin.lat).toBe(48.8566);
        expect(valid.params.origin.lng).toBe(2.3522);
        expect(valid.params.destination.lat).toBe(48.8606);
        expect(valid.params.destination.lng).toBe(2.3376);
        expect(valid.params.mode).toBe('walking');
      }
    });

    it('supports flat query parameters (originLat, originLng, destLat, destLng)', () => {
      const valid = validateRouteParams({
        originLat: '13.7563',
        originLng: '100.5018',
        destLat: '13.7500',
        destLng: '100.4914',
      });

      expect(valid.valid).toBe(true);
      if (valid.valid) {
        expect(valid.params.origin.lat).toBe(13.7563);
        expect(valid.params.destination.lng).toBe(100.4914);
        expect(valid.params.mode).toBe('walking'); // Recommended for short distance
      }
    });

    it('rejects missing or blank coordinates', () => {
      const missingOrigin = validateRouteParams({
        destLat: '48.8606',
        destLng: '2.3376',
      });
      expect(missingOrigin.valid).toBe(false);
      if (!missingOrigin.valid) {
        expect(missingOrigin.statusCode).toBe(400);
        expect(missingOrigin.error).toContain('Missing required parameter');
      }

      const missingDest = validateRouteParams({
        originLat: '48.8566',
        originLng: '2.3522',
      });
      expect(missingDest.valid).toBe(false);
    });

    it('rejects non-numeric coordinates', () => {
      const badOrigin = validateRouteParams({
        originLat: 'invalid',
        originLng: '2.3522',
        destLat: '48.8606',
        destLng: '2.3376',
      });
      expect(badOrigin.valid).toBe(false);
      if (!badOrigin.valid) {
        expect(badOrigin.error).toContain('Invalid origin coordinates');
      }
    });

    it('rejects coordinates out of valid geographical bounds', () => {
      const badLat = validateRouteParams({
        originLat: '95',
        originLng: '2.3522',
        destLat: '48.8606',
        destLng: '2.3376',
      });
      expect(badLat.valid).toBe(false);

      const badLng = validateRouteParams({
        originLat: '48.8566',
        originLng: '190',
        destLat: '48.8606',
        destLng: '2.3376',
      });
      expect(badLng.valid).toBe(false);
    });

    it('rejects stops greater than 150km apart (cross-destination protection)', () => {
      // Paris (48.8566, 2.3522) to London (51.5074, -0.1278) is ~340km
      const crossCity = validateRouteParams({
        origin: { lat: 48.8566, lng: 2.3522 },
        destination: { lat: 51.5074, lng: -0.1278 },
      });
      expect(crossCity.valid).toBe(false);
      if (!crossCity.valid) {
        expect(crossCity.statusCode).toBe(400);
        expect(crossCity.error).toContain('cannot be routed as an intra-city itinerary stop');
      }
    });

    it('automatically recommends sensible transit mode based on distance', () => {
      // 0.8 km distance -> walking
      const shortWalk = validateRouteParams({
        origin: { lat: 48.8566, lng: 2.3522 },
        destination: { lat: 48.8606, lng: 2.3376 },
      });
      if (shortWalk.valid) {
        expect(shortWalk.params.mode).toBe('walking');
      }

      // 5.5 km distance -> transit
      const mediumDist = validateRouteParams({
        origin: { lat: 48.8566, lng: 2.3522 },
        destination: { lat: 48.8049, lng: 2.2900 },
      });
      if (mediumDist.valid) {
        expect(mediumDist.params.mode).toBe('transit');
      }
    });
  });

  describe('2. Unconfigured API Key & Secret Protection', () => {
    it('returns HTTP 503 unconfigured status when GOOGLE_ROUTES_API_KEY is missing', async () => {
      delete process.env.GOOGLE_ROUTES_API_KEY;
      delete process.env.GOOGLE_MAPS_API_KEY;

      const result = await handleRoutesProxyRequest(
        {
          origin: { lat: 48.8566, lng: 2.3522 },
          destination: { lat: 48.8606, lng: 2.3376 },
        },
        { apiKey: '', disableCache: true }
      );

      expect(result.statusCode).toBe(503);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.status).toBe('unconfigured');
      expect(body.isEstimated).toBe(true);
      expect(body.liveTrafficVerified).toBe(false);
      expect(body.warning).toContain('GOOGLE_ROUTES_API_KEY not configured');
      expect(body.distanceKm).toBeGreaterThan(0);
      expect(body.estimatedDurationMinutes).toBeGreaterThan(0);
    });

    it('returns HTTP 503 when API key is default placeholder', async () => {
      const result = await handleRoutesProxyRequest(
        {
          origin: { lat: 48.8566, lng: 2.3522 },
          destination: { lat: 48.8606, lng: 2.3376 },
        },
        { apiKey: 'your_google_routes_api_key_here', disableCache: true }
      );

      expect(result.statusCode).toBe(503);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('unconfigured');
    });

    it('never leaks API key in response headers or response body', async () => {
      const fakeSecretKey = 'AIzaSySecretGoogleRoutesKey999';
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      const result = await handleRoutesProxyRequest(
        {
          origin: { lat: 48.8566, lng: 2.3522 },
          destination: { lat: 48.8606, lng: 2.3376 },
        },
        { apiKey: fakeSecretKey, customFetch: mockFetch, disableCache: true }
      );

      expect(result.body).not.toContain(fakeSecretKey);
      for (const val of Object.values(result.headers)) {
        expect(val).not.toContain(fakeSecretKey);
      }
    });
  });

  describe('3. Upstream Error Handling', () => {
    it('handles 401 / 403 Invalid Credentials gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: 'Method doesn\'t allow unregistered callers' } }),
      });

      const result = await handleRoutesProxyRequest(
        {
          origin: { lat: 48.8566, lng: 2.3522 },
          destination: { lat: 48.8606, lng: 2.3376 },
        },
        { apiKey: 'bad-key', customFetch: mockFetch, disableCache: true }
      );

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Invalid Google Routes API credentials');
    });

    it('handles 429 Rate Limits gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Quota exceeded' } }),
      });

      const result = await handleRoutesProxyRequest(
        {
          origin: { lat: 48.8566, lng: 2.3522 },
          destination: { lat: 48.8606, lng: 2.3376 },
        },
        { apiKey: 'test-key', customFetch: mockFetch, disableCache: true }
      );

      expect(result.statusCode).toBe(429);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('rate_limited');
      expect(body.error).toContain('quota or rate limit exceeded');
    });

    it('handles upstream timeout via AbortController with HTTP 504', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      const mockFetch = vi.fn().mockRejectedValue(abortError);

      const result = await handleRoutesProxyRequest(
        {
          origin: { lat: 48.8566, lng: 2.3522 },
          destination: { lat: 48.8606, lng: 2.3376 },
        },
        { apiKey: 'test-key', customFetch: mockFetch, disableCache: true, timeoutMs: 100 }
      );

      expect(result.statusCode).toBe(504);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('network_error');
      expect(body.error).toContain('timed out');
    });
  });

  describe('4. Successful Route Normalization & Caching', () => {
    const mockGoogleRoutesResponse = {
      routes: [
        {
          duration: '720s', // 12 minutes
          distanceMeters: 1450,
          description: 'Via Rue de Rivoli and Quai des Tuileries',
          legs: [
            {
              duration: '720s',
              distanceMeters: 1450,
            },
          ],
        },
      ],
    };

    it('normalizes Google Routes response with liveTrafficVerified: true', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockGoogleRoutesResponse,
      });

      const result = await handleRoutesProxyRequest(
        {
          origin: { lat: 48.8566, lng: 2.3522 },
          destination: { lat: 48.8606, lng: 2.3376 },
          originName: 'Notre-Dame',
          destinationName: 'Louvre',
          mode: 'walking',
        },
        { apiKey: 'valid-test-key', customFetch: mockFetch, disableCache: true }
      );

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.status).toBe('ok');
      expect(body.provider).toBe('google_routes_live');
      expect(body.isEstimated).toBe(false);
      expect(body.liveTrafficVerified).toBe(true);
      expect(body.sourceAttribution).toBe(GOOGLE_ROUTES_ATTRIBUTION);
      expect(body.estimatedDurationMinutes).toBe(12);
      expect(body.distanceKm).toBe(1.45);
      expect(body.route.summary).toContain('Rue de Rivoli');
      expect(body.route.isEstimated).toBe(false);
      expect(body.route.liveTrafficVerified).toBe(true);
    });

    it('serves cached route response on subsequent requests without calling upstream fetch', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockGoogleRoutesResponse,
      });

      const params = {
        origin: { lat: 13.7563, lng: 100.5018 },
        destination: { lat: 13.7500, lng: 100.4914 },
        mode: 'walking',
      };

      // Call 1: Cache MISS
      const res1 = await handleRoutesProxyRequest(params, {
        apiKey: 'valid-test-key',
        customFetch: mockFetch,
      });
      expect(res1.statusCode).toBe(200);
      expect(res1.headers['X-Ryoko-Cache']).toBe('MISS');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Call 2: Cache HIT
      const res2 = await handleRoutesProxyRequest(params, {
        apiKey: 'valid-test-key',
        customFetch: mockFetch,
      });
      expect(res2.statusCode).toBe(200);
      expect(res2.headers['X-Ryoko-Cache']).toBe('HIT');
      expect(mockFetch).toHaveBeenCalledTimes(1); // No second upstream fetch!
    });
  });

  describe('5. HTTP Middleware', () => {
    it('sets CORS headers on OPTIONS preflight and returns 204', async () => {
      const middleware = createRoutesProxyMiddleware({ apiKey: 'key' });
      const req = { method: 'OPTIONS', url: '/api/routes', headers: {} } as IncomingMessage;
      const headers: Record<string, string> = {};
      const res = {
        statusCode: 0,
        setHeader: (name: string, val: string) => {
          headers[name] = val;
        },
        end: vi.fn(),
      } as unknown as ServerResponse;

      await middleware(req, res);
      expect(res.statusCode).toBe(204);
      expect(headers['Access-Control-Allow-Origin']).toBe('*');
      expect(res.end).toHaveBeenCalled();
    });

    it('rejects unsupported methods (PUT, DELETE) with 405 Method Not Allowed', async () => {
      const middleware = createRoutesProxyMiddleware({ apiKey: 'key' });
      const req = { method: 'DELETE', url: '/api/routes', headers: {} } as IncomingMessage;
      const headers: Record<string, string> = {};
      let responseBody = '';
      const res = {
        statusCode: 0,
        setHeader: (name: string, val: string) => {
          headers[name] = val;
        },
        end: (chunk: string) => {
          responseBody = chunk;
        },
      } as unknown as ServerResponse;

      await middleware(req, res);
      expect(res.statusCode).toBe(405);
      expect(responseBody).toContain('Only GET and POST are supported');
    });
  });
});
