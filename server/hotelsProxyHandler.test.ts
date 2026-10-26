import { describe, it, expect, vi } from 'vitest';
import {
  validateHotelParams,
  handleHotelsProxyRequest,
  createHotelsProxyMiddleware,
  HOTEL_PARTNER_ATTRIBUTION,
} from './hotelsProxyHandler.ts';

describe('Hotels Proxy Handler Suite', () => {
  describe('Parameter Validation', () => {
    it('rejects requests missing destinationId', () => {
      const res = validateHotelParams({});
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.statusCode).toBe(400);
        expect(res.error).toContain('Missing required parameter');
      }
    });

    it('maps Thailand to Bangkok canonical destination', () => {
      const res = validateHotelParams({ destinationId: 'thailand' });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.params.destinationId).toBe('bangkok');
      }
    });

    it('calculates total nights between checkIn and checkOut dates', () => {
      const res = validateHotelParams({
        destinationId: 'paris',
        checkIn: '2026-06-01',
        checkOut: '2026-06-05',
      });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.params.totalNights).toBe(4);
      }
    });

    it('falls back to days parameter if dates are omitted', () => {
      const res = validateHotelParams({ destinationId: 'paris', days: 5 });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.params.totalNights).toBe(5);
      }
    });

    it('clamps guests between 1 and 10 and rooms between 1 and 5', () => {
      const res = validateHotelParams({ destinationId: 'paris', guests: 20, rooms: 15 });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.params.guests).toBe(10);
        expect(res.params.rooms).toBe(5);
      }
    });
  });

  describe('Unconfigured Server Credentials (HTTP 503)', () => {
    it('returns HTTP 503 with curated accommodations and stay pricing calculation', async () => {
      const res = await handleHotelsProxyRequest(
        { destinationId: 'paris', days: 3, guests: 2 },
        { apiKey: '', disableCache: true }
      );

      expect(res.statusCode).toBe(503);
      const data = JSON.parse(res.body);
      expect(data.success).toBe(false);
      expect(data.status).toBe('unconfigured');
      expect(data.isMock).toBe(true);
      expect(data.liveAvailabilityVerified).toBe(false);
      expect(data.warning).toContain('HOTEL_PROVIDER_API_KEY not configured');
      expect(data.hotels.length).toBeGreaterThan(0);

      data.hotels.forEach((htl: any) => {
        expect(htl.destinationId).toBe('paris');
        expect(htl.totalNights).toBe(3);
        expect(htl.guests).toBe(2);
        expect(htl.totalStayPriceUsd).toBe(htl.estimatedPricePerNightUsd * 3);
      });
    });

    it('returns 503 with Bangkok hotels when querying Thailand with budget filter', async () => {
      const res = await handleHotelsProxyRequest(
        { destinationId: 'thailand', maxPricePerNightUsd: 150 },
        { apiKey: 'your_hotel_provider_api_key_here', disableCache: true }
      );

      expect(res.statusCode).toBe(503);
      const data = JSON.parse(res.body);
      expect(data.destinationId).toBe('bangkok');
      expect(data.hotels.length).toBeGreaterThan(0);
      data.hotels.forEach((htl: any) => {
        expect(htl.estimatedPricePerNightUsd).toBeLessThanOrEqual(150);
      });
    });
  });

  describe('Live Partner Query with Mocked Upstream', () => {
    it('queries partner hospitality endpoint and formats stay pricing', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          hotels: [
            {
              id: 'htl-live-101',
              name: 'Hôtel Le Grand Live',
              destinationId: 'paris',
              city: 'Paris',
              country: 'France',
              estimatedPricePerNightUsd: 220,
              currency: 'USD',
              starRating: 4,
              tier: 'boutique',
              neighborhood: 'Le Marais',
              address: '15 Rue de Bretagne, Paris',
              coordinates: { lat: 48.862, lng: 2.361 },
              amenities: ['Free WiFi', 'Breakfast Included'],
              checkInTime: '15:00',
              checkOutTime: '11:00',
              ratingScore: 4.8,
              reviewCount: 320,
            },
          ],
        }),
      });

      const res = await handleHotelsProxyRequest(
        { destinationId: 'paris', days: 4, guests: 2 },
        { apiKey: 'valid_hotel_key', customFetch, disableCache: true }
      );

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.success).toBe(true);
      expect(data.status).toBe('ok');
      expect(data.isMock).toBe(false);
      expect(data.liveAvailabilityVerified).toBe(true);
      expect(data.sourceAttribution).toBe(HOTEL_PARTNER_ATTRIBUTION);
      expect(data.hotels.length).toBe(1);

      const hotel = data.hotels[0];
      expect(hotel.name).toBe('Hôtel Le Grand Live');
      expect(hotel.totalNights).toBe(4);
      expect(hotel.guests).toBe(2);
      expect(hotel.totalStayPriceUsd).toBe(880); // 220 * 4
      expect(hotel.liveAvailabilityVerified).toBe(true);
    });

    it('returns HTTP 401 on partner auth failure', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      const res = await handleHotelsProxyRequest(
        { destinationId: 'paris' },
        { apiKey: 'invalid_key', customFetch, disableCache: true }
      );

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res.body);
      expect(data.error).toContain('Invalid Hotel API credentials');
    });

    it('returns HTTP 429 on partner rate limit', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      });

      const res = await handleHotelsProxyRequest(
        { destinationId: 'paris' },
        { apiKey: 'rate_limited_key', customFetch, disableCache: true }
      );

      expect(res.statusCode).toBe(429);
      const data = JSON.parse(res.body);
      expect(data.status).toBe('rate_limited');
    });
  });

  describe('HTTP Middleware Integration', () => {
    it('handles OPTIONS preflight with HTTP 204', async () => {
      const middleware = createHotelsProxyMiddleware({ apiKey: '' });
      const req: any = { method: 'OPTIONS', headers: { host: 'localhost:3000' }, url: '/api/hotels' };
      const headers: Record<string, string> = {};
      const res: any = {
        setHeader: (k: string, v: string) => {
          headers[k] = v;
        },
        end: vi.fn(),
      };

      await middleware(req, res);
      expect(res.statusCode).toBe(204);
    });

    it('rejects POST with 405 Method Not Allowed', async () => {
      const middleware = createHotelsProxyMiddleware({ apiKey: '' });
      const req: any = { method: 'POST', headers: { host: 'localhost:3000' }, url: '/api/hotels' };
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
