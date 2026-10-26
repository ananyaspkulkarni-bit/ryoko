import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  handleWeatherProxyRequest,
  validateWeatherParams,
  mapOpenWeatherCondition,
  createWeatherProxyMiddleware,
  OPENWEATHER_ATTRIBUTION,
} from './weatherProxyHandler.ts';

describe('Server-Side Weather Proxy Suite', () => {
  const originalEnv = process.env.OPENWEATHER_API_KEY;

  beforeEach(() => {
    process.env.OPENWEATHER_API_KEY = 'test-server-api-key';
  });

  afterEach(() => {
    process.env.OPENWEATHER_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  describe('1. Parameter Validation & Destination Coordinate Resolution', () => {
    it('validates explicit coordinates and days', () => {
      const valid = validateWeatherParams({
        lat: '48.8566',
        lng: '2.3522',
        destinationId: 'paris',
        days: '5',
      });

      expect(valid.valid).toBe(true);
      if (valid.valid) {
        expect(valid.params.lat).toBe(48.8566);
        expect(valid.params.lng).toBe(2.3522);
        expect(valid.params.destinationId).toBe('paris');
        expect(valid.params.days).toBe(5);
      }
    });

    it('resolves coordinates from canonical catalog when lat/lng are omitted', () => {
      const bangkok = validateWeatherParams({ destinationId: 'bangkok' });
      expect(bangkok.valid).toBe(true);
      if (bangkok.valid) {
        expect(bangkok.params.lat).toBeCloseTo(13.7563);
        expect(bangkok.params.lng).toBeCloseTo(100.5018);
        expect(bangkok.params.destinationName).toBe('Bangkok');
      }

      const thailand = validateWeatherParams({ destinationId: 'thailand' });
      expect(thailand.valid).toBe(true);
      if (thailand.valid) {
        expect(thailand.params.lat).toBeCloseTo(13.7563);
        expect(thailand.params.lng).toBeCloseTo(100.5018);
      }

      const paris = validateWeatherParams({ destinationId: 'paris' });
      expect(paris.valid).toBe(true);
      if (paris.valid) {
        expect(paris.params.lat).toBeCloseTo(48.8566);
        expect(paris.params.lng).toBeCloseTo(2.3522);
      }
    });

    it('supports "lon" as alias for "lng"', () => {
      const valid = validateWeatherParams({
        lat: '35.6762',
        lon: '139.6503',
      });

      expect(valid.valid).toBe(true);
      if (valid.valid) {
        expect(valid.params.lng).toBe(139.6503);
      }
    });

    it('rejects missing coordinates for unlisted destinations', () => {
      const invalid = validateWeatherParams({ destinationId: 'unknown-remote-island' });
      expect(invalid.valid).toBe(false);
      if (!invalid.valid) {
        expect(invalid.statusCode).toBe(400);
        expect(invalid.error).toContain('Missing required query parameter "lat"');
      }
    });

    it('rejects non-numeric coordinates', () => {
      const badLat = validateWeatherParams({ lat: 'abc', lng: '2.3522' });
      expect(badLat.valid).toBe(false);
      if (!badLat.valid) {
        expect(badLat.error).toContain('Invalid latitude');
      }

      const badLng = validateWeatherParams({ lat: '48.8566', lng: 'xyz' });
      expect(badLng.valid).toBe(false);
      if (!badLng.valid) {
        expect(badLng.error).toContain('Invalid longitude');
      }
    });

    it('rejects coordinates out of geographical range', () => {
      const badLat = validateWeatherParams({ lat: '95', lng: '2.3522' });
      expect(badLat.valid).toBe(false);

      const badLng = validateWeatherParams({ lat: '48.8566', lng: '200' });
      expect(badLng.valid).toBe(false);
    });

    it('clamps days between 1 and 7', () => {
      const zeroDays = validateWeatherParams({ lat: '48.8566', lng: '2.3522', days: '0' });
      if (zeroDays.valid) expect(zeroDays.params.days).toBe(1);

      const tenDays = validateWeatherParams({ lat: '48.8566', lng: '2.3522', days: '10' });
      if (tenDays.valid) expect(tenDays.params.days).toBe(7);
    });
  });

  describe('2. OpenWeather Condition Mapping', () => {
    it('maps thunderstorm codes (200-299)', () => {
      const mapped = mapOpenWeatherCondition(211, 'Thunderstorm', 'thunderstorm with heavy rain');
      expect(mapped.condition).toBe('thunderstorm');
      expect(mapped.conditionLabel).toBe('Thunderstorm with heavy rain');
    });

    it('maps drizzle codes (300-399)', () => {
      const mapped = mapOpenWeatherCondition(301, 'Drizzle', 'light intensity drizzle');
      expect(mapped.condition).toBe('showers');
    });

    it('maps light rain (500, 520) to showers and moderate/heavy rain to rainy', () => {
      const showers = mapOpenWeatherCondition(500, 'Rain', 'light rain');
      expect(showers.condition).toBe('showers');

      const heavyRain = mapOpenWeatherCondition(502, 'Rain', 'heavy intensity rain');
      expect(heavyRain.condition).toBe('rainy');
    });

    it('maps snow codes (600-699)', () => {
      const snow = mapOpenWeatherCondition(601, 'Snow', 'snow');
      expect(snow.condition).toBe('snowy');
    });

    it('maps clear sky (800) to sunny', () => {
      const clear = mapOpenWeatherCondition(800, 'Clear', 'clear sky');
      expect(clear.condition).toBe('sunny');
    });

    it('maps clouds (801-802 to partly_cloudy, >=803 to cloudy)', () => {
      const fewClouds = mapOpenWeatherCondition(801, 'Clouds', 'few clouds');
      expect(fewClouds.condition).toBe('partly_cloudy');

      const overcast = mapOpenWeatherCondition(804, 'Clouds', 'overcast clouds');
      expect(overcast.condition).toBe('cloudy');
    });
  });

  describe('3. Unconfigured API Key & Secret Protection', () => {
    it('returns HTTP 503 unconfigured status when OPENWEATHER_API_KEY is missing', async () => {
      delete process.env.OPENWEATHER_API_KEY;

      const result = await handleWeatherProxyRequest(
        { destinationId: 'paris' },
        { apiKey: '', disableCache: true }
      );

      expect(result.statusCode).toBe(503);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.status).toBe('unconfigured');
      expect(body.isMock).toBe(true);
      expect(body.liveForecastVerified).toBe(false);
      expect(body.warning).toContain('OPENWEATHER_API_KEY');
      expect(body.current.destinationId).toBe('paris');
      expect(body.current.isMock).toBe(true);
    });

    it('returns HTTP 503 when API key is default placeholder', async () => {
      const result = await handleWeatherProxyRequest(
        { destinationId: 'bangkok' },
        { apiKey: 'your_openweather_api_key_here', disableCache: true }
      );

      expect(result.statusCode).toBe(503);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('unconfigured');
    });

    it('never leaks apiKey in headers or body', async () => {
      const fakeSecret = 'ultra-secret-key-12345';
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      const result = await handleWeatherProxyRequest(
        { destinationId: 'paris' },
        { apiKey: fakeSecret, customFetch: mockFetch, disableCache: true }
      );

      expect(result.body).not.toContain(fakeSecret);
      for (const val of Object.values(result.headers)) {
        expect(val).not.toContain(fakeSecret);
      }
    });
  });

  describe('4. Upstream Error Handling', () => {
    it('handles 401 Unauthorized gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid API key' }),
      });

      const result = await handleWeatherProxyRequest(
        { destinationId: 'paris' },
        { apiKey: 'bad-key', customFetch: mockFetch, disableCache: true }
      );

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Invalid OpenWeatherMap API credentials');
    });

    it('handles 429 Rate Limit gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ message: 'Rate limit exceeded' }),
      });

      const result = await handleWeatherProxyRequest(
        { destinationId: 'paris' },
        { apiKey: 'test-key', customFetch: mockFetch, disableCache: true }
      );

      expect(result.statusCode).toBe(429);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('rate_limited');
      expect(body.error).toContain('rate limit reached');
    });

    it('handles timeouts via AbortController with HTTP 504', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      const mockFetch = vi.fn().mockRejectedValue(abortError);

      const result = await handleWeatherProxyRequest(
        { destinationId: 'paris' },
        { apiKey: 'test-key', customFetch: mockFetch, disableCache: true, timeoutMs: 100 }
      );

      expect(result.statusCode).toBe(504);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('network_error');
      expect(body.error).toContain('timed out');
    });
  });

  describe('5. Successful Weather Normalization & Caching', () => {
    const mockCurrentJson = {
      name: 'Paris',
      main: { temp: 21.4, feels_like: 21.0, humidity: 55 },
      wind: { speed: 3.5 },
      weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
    };

    const mockForecastJson = {
      list: [
        {
          dt_txt: '2026-06-01 12:00:00',
          main: { temp: 22.0, humidity: 50 },
          wind: { speed: 4.0 },
          pop: 0.1,
          weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
        },
        {
          dt_txt: '2026-06-02 12:00:00',
          main: { temp: 18.5, humidity: 80 },
          wind: { speed: 5.5 },
          pop: 0.75,
          weather: [{ id: 502, main: 'Rain', description: 'heavy intensity rain' }],
        },
      ],
    };

    it('normalizes live OpenWeather data into Ryoko WeatherResponse', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/weather?')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockCurrentJson,
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockForecastJson,
        });
      });

      const result = await handleWeatherProxyRequest(
        { destinationId: 'paris', lat: '48.8566', lng: '2.3522', days: '2' },
        { apiKey: 'valid-test-key', customFetch: mockFetch, disableCache: true }
      );

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.provider).toBe('openweather_live');
      expect(body.isMock).toBe(false);
      expect(body.liveForecastVerified).toBe(true);
      expect(body.sourceAttribution).toBe(OPENWEATHER_ATTRIBUTION);

      // Current Snapshot
      expect(body.current.cityName).toBe('Paris');
      expect(body.current.temperatureC).toBe(21);
      expect(body.current.condition).toBe('sunny');
      expect(body.current.isMock).toBe(false);
      expect(body.current.liveForecastVerified).toBe(true);

      // Forecast list
      expect(body.forecast.length).toBe(2);
      expect(body.forecast[0].condition).toBe('sunny');
      expect(body.forecast[0].isMock).toBe(false);
      expect(body.forecast[1].condition).toBe('rainy');
      expect(body.forecast[1].precipitationChancePercent).toBe(75);
      expect(body.forecast[1].advisory).toContain('Rain expected');
    });

    it('serves cached response on second call without repeating fetch', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/weather?')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockCurrentJson,
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockForecastJson,
        });
      });

      // Request 1: Cache MISS
      const res1 = await handleWeatherProxyRequest(
        { lat: '35.6762', lng: '139.6503', destinationId: 'tokyo' },
        { apiKey: 'valid-test-key', customFetch: mockFetch }
      );
      expect(res1.statusCode).toBe(200);
      expect(res1.headers['X-Ryoko-Cache']).toBe('MISS');
      expect(mockFetch).toHaveBeenCalledTimes(2); // 1 for weather, 1 for forecast

      // Request 2: Cache HIT
      const res2 = await handleWeatherProxyRequest(
        { lat: '35.6762', lng: '139.6503', destinationId: 'tokyo' },
        { apiKey: 'valid-test-key', customFetch: mockFetch }
      );
      expect(res2.statusCode).toBe(200);
      expect(res2.headers['X-Ryoko-Cache']).toBe('HIT');
      expect(mockFetch).toHaveBeenCalledTimes(2); // No extra network requests!
    });
  });

  describe('6. HTTP Middleware', () => {
    it('sets CORS headers on OPTIONS preflight and returns 204', async () => {
      const middleware = createWeatherProxyMiddleware({ apiKey: 'key' });
      const req = { method: 'OPTIONS', url: '/api/weather', headers: {} } as IncomingMessage;
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

    it('rejects POST or other methods with 405 Method Not Allowed', async () => {
      const middleware = createWeatherProxyMiddleware({ apiKey: 'key' });
      const req = { method: 'POST', url: '/api/weather', headers: {} } as IncomingMessage;
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
      expect(responseBody).toContain('Only GET is supported');
    });
  });
});
