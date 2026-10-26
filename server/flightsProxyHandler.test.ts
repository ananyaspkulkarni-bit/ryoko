import { describe, it, expect, vi } from 'vitest';

import {
  validateFlightParams,
  handleFlightsProxyRequest,
  createFlightsProxyMiddleware,
  AMADEUS_ATTRIBUTION,
} from './flightsProxyHandler.ts';

describe('Flights Proxy Handler Suite', () => {
  describe('Parameter Validation', () => {
    it('rejects requests missing destination parameter', () => {
      const result = validateFlightParams({});
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.statusCode).toBe(400);
        expect(result.error).toContain('Missing required parameter');
      }
    });

    it('resolves canonical airport CDG for Paris', () => {
      const result = validateFlightParams({ destination: 'Paris' });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.params.destinationCity).toBe('Paris');
        expect(result.params.destinationAirport).toBe('CDG');
      }
    });

    it('resolves canonical airport BKK for Thailand', () => {
      const result = validateFlightParams({ destination: 'Thailand' });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.params.destinationCity).toBe('Bangkok');
        expect(result.params.destinationAirport).toBe('BKK');
      }
    });

    it('validates date format YYYY-MM-DD and rejects invalid formats', () => {
      const invalid = validateFlightParams({ destination: 'Paris', date: '21/10/2026' });
      expect(invalid.valid).toBe(false);
      if (!invalid.valid) {
        expect(invalid.statusCode).toBe(400);
        expect(invalid.error).toContain('YYYY-MM-DD');
      }

      const valid = validateFlightParams({ destination: 'Paris', date: '2026-10-21' });
      expect(valid.valid).toBe(true);
      if (valid.valid) {
        expect(valid.params.date).toBe('2026-10-21');
      }
    });

    it('clamps passenger counts between 1 and 9', () => {
      const resHigh = validateFlightParams({ destination: 'Paris', passengers: 99 });
      if (resHigh.valid) {
        expect(resHigh.params.passengers).toBe(9);
      }

      const resZero = validateFlightParams({ destination: 'Paris', passengers: 0 });
      if (resZero.valid) {
        expect(resZero.params.passengers).toBe(1);
      }
    });
  });

  describe('Unconfigured Server Credentials (HTTP 503)', () => {
    it('returns HTTP 503 with curated mock flights and clear warning when credentials missing', async () => {
      const res = await handleFlightsProxyRequest(
        { destination: 'Paris', origin: 'JFK' },
        { clientId: '', clientSecret: '', disableCache: true }
      );

      expect(res.statusCode).toBe(503);
      const data = JSON.parse(res.body);
      expect(data.success).toBe(false);
      expect(data.status).toBe('unconfigured');
      expect(data.isMock).toBe(true);
      expect(data.liveFareVerified).toBe(false);
      expect(data.warning).toContain('AMADEUS_CLIENT_ID not configured');
      expect(data.flights.length).toBeGreaterThan(0);
      data.flights.forEach((flt: any) => {
        expect(flt.destinationCity.toLowerCase()).toContain('paris');
      });
    });

    it('returns 503 with Thailand mock flights mapped to Bangkok', async () => {
      const res = await handleFlightsProxyRequest(
        { destination: 'Thailand' },
        { clientId: 'your_amadeus_client_id_here', clientSecret: 'your_amadeus_client_secret_here', disableCache: true }
      );

      expect(res.statusCode).toBe(503);
      const data = JSON.parse(res.body);
      expect(data.flights.length).toBeGreaterThan(0);
      expect(data.destinationCity).toBe('Bangkok');
    });
  });

  describe('Live Amadeus Query with Mocked Upstream', () => {
    it('exchanges OAuth token and queries live flight offers successfully', async () => {
      const customFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/security/oauth2/token')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: 'mock_test_token_123', expires_in: 1799 }),
          };
        }
        if (url.includes('/shopping/flight-offers')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: [
                {
                  id: '1',
                  price: { total: '520.50' },
                  itineraries: [
                    {
                      duration: 'PT8H15M',
                      segments: [
                        {
                          carrierCode: 'AF',
                          number: '007',
                          departure: { iataCode: 'JFK', at: '2026-11-01T19:30:00' },
                          arrival: { iataCode: 'CDG', at: '2026-11-02T08:45:00' },
                        },
                      ],
                    },
                  ],
                  travelerPricings: [{ fareDetailsBySegment: [{ cabin: 'ECONOMY' }] }],
                },
              ],
            }),
          };
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const res = await handleFlightsProxyRequest(
        { destination: 'Paris', origin: 'JFK', date: '2026-11-01' },
        { clientId: 'test_client_id', clientSecret: 'test_client_secret', customFetch, disableCache: true }
      );

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.success).toBe(true);
      expect(data.status).toBe('ok');
      expect(data.isMock).toBe(false);
      expect(data.liveFareVerified).toBe(true);
      expect(data.sourceAttribution).toBe(AMADEUS_ATTRIBUTION);
      expect(data.flights.length).toBe(1);

      const flight = data.flights[0];
      expect(flight.carrier).toBe('AF');
      expect(flight.flightNumber).toBe('AF 007');
      expect(flight.durationMinutes).toBe(495); // 8h * 60 + 15m
      expect(flight.estimatedPriceUsd).toBe(521); // rounded
      expect(flight.liveFareVerified).toBe(true);
      expect(flight.isMock).toBe(false);
    });

    it('returns HTTP 401 when Amadeus rejects OAuth credentials', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      const res = await handleFlightsProxyRequest(
        { destination: 'Paris' },
        { clientId: 'bad_id', clientSecret: 'bad_secret', customFetch, disableCache: true }
      );

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res.body);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid Amadeus API credentials');
    });

    it('returns HTTP 429 on Amadeus rate limits', async () => {
      const customFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/security/oauth2/token')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: 'mock_token' }),
          };
        }
        return {
          ok: false,
          status: 429,
        };
      });

      const res = await handleFlightsProxyRequest(
        { destination: 'Paris' },
        { clientId: 'valid_id', clientSecret: 'valid_secret', customFetch, disableCache: true }
      );

      expect(res.statusCode).toBe(429);
      const data = JSON.parse(res.body);
      expect(data.status).toBe('rate_limited');
    });
  });

  describe('HTTP Middleware Integration', () => {
    it('handles OPTIONS preflight with HTTP 204', async () => {
      const middleware = createFlightsProxyMiddleware({ clientId: '', clientSecret: '' });
      const req: any = { method: 'OPTIONS', headers: { host: 'localhost:3000' }, url: '/api/flights' };
      const headers: Record<string, string> = {};
      const res: any = {
        setHeader: (k: string, v: string) => {
          headers[k] = v;
        },
        end: vi.fn(),
      };

      await middleware(req, res);
      expect(res.statusCode).toBe(204);
      expect(res.end).toHaveBeenCalled();
    });

    it('rejects POST with 405 Method Not Allowed', async () => {
      const middleware = createFlightsProxyMiddleware({ clientId: '', clientSecret: '' });
      const req: any = { method: 'POST', headers: { host: 'localhost:3000' }, url: '/api/flights' };
      const headers: Record<string, string> = {};
      const res: any = {
        setHeader: (k: string, v: string) => {
          headers[k] = v;
        },
        end: vi.fn(),
      };

      await middleware(req, res);
      expect(res.statusCode).toBe(405);
    });
  });
});
