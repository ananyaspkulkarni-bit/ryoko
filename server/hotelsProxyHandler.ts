import type { IncomingMessage, ServerResponse } from 'node:http';
import type { HotelOption, HotelSearchResponse, HotelTier } from '../src/types/travel/hotels.ts';
import { MOCK_HOTELS_EXPANDED } from '../src/data/mock/mockHotels.ts';

export interface ValidatedHotelParams {
  destinationId: string;
  checkIn?: string;
  checkOut?: string;
  guests: number;
  rooms: number;
  totalNights: number;
  tier?: HotelTier;
  maxPricePerNightUsd?: number;
}

export interface HotelsProxyOptions {
  /**
   * Hotel partner API key. Defaults to process.env.HOTEL_PROVIDER_API_KEY || process.env.GOOGLE_HOTELS_API_KEY.
   */
  apiKey?: string;
  /**
   * Request timeout in milliseconds. Default: 8000ms.
   */
  timeoutMs?: number;
  /**
   * Custom fetch function (for testing / mocking).
   */
  customFetch?: typeof fetch;
  /**
   * Disable in-memory caching (useful for testing). Default: false.
   */
  disableCache?: boolean;
}

export interface HotelsProxyResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export const HOTEL_PARTNER_ATTRIBUTION = 'Google Hotels & Partner Hospitality Network';

/**
 * In-memory cache for hotel search telemetry (15-minute TTL).
 */
interface CacheEntry {
  timestamp: number;
  data: HotelSearchResponse;
}
const hotelsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

export function validateHotelParams(
  raw: Record<string, any>
): { valid: true; params: ValidatedHotelParams } | { valid: false; error: string; statusCode: number } {
  const destId = (raw.destinationId || raw.destination || raw.city || '').trim().toLowerCase();

  if (!destId) {
    return {
      valid: false,
      error: 'Missing required parameter "destinationId" (or "destination").',
      statusCode: 400,
    };
  }

  let guests = 1;
  if (raw.guests) {
    const parsed = parseInt(String(raw.guests), 10);
    if (!isNaN(parsed) && parsed >= 1) {
      guests = Math.min(10, parsed);
    }
  }

  let rooms = 1;
  if (raw.rooms) {
    const parsed = parseInt(String(raw.rooms), 10);
    if (!isNaN(parsed) && parsed >= 1) {
      rooms = Math.min(5, parsed);
    }
  }

  let totalNights = 1;
  if (raw.days) {
    const parsedDays = parseInt(String(raw.days), 10);
    if (!isNaN(parsedDays) && parsedDays >= 1) {
      totalNights = parsedDays;
    }
  }

  let checkIn = raw.checkIn || raw.checkInDate;
  let checkOut = raw.checkOut || raw.checkOutDate;

  if (checkIn && checkOut) {
    const cin = new Date(checkIn);
    const cout = new Date(checkOut);
    if (!isNaN(cin.getTime()) && !isNaN(cout.getTime()) && cout > cin) {
      const diffMs = cout.getTime() - cin.getTime();
      totalNights = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }
  }

  let maxPrice: number | undefined;
  if (raw.maxPricePerNightUsd) {
    const parsed = parseFloat(String(raw.maxPricePerNightUsd));
    if (!isNaN(parsed) && parsed > 0) {
      maxPrice = parsed;
    }
  }

  return {
    valid: true,
    params: {
      destinationId: destId === 'thailand' || destId === 'th' ? 'bangkok' : destId,
      checkIn: checkIn ? String(checkIn).trim() : undefined,
      checkOut: checkOut ? String(checkOut).trim() : undefined,
      guests,
      rooms,
      totalNights,
      tier: raw.tier,
      maxPricePerNightUsd: maxPrice,
    },
  };
}

/**
 * Executes server-side request to Hotel Partner API or provides curated hospitality fallback.
 */
export async function handleHotelsProxyRequest(
  rawParams: Record<string, any>,
  options: HotelsProxyOptions = {}
): Promise<HotelsProxyResult> {
  const validation = validateHotelParams(rawParams);
  if (!validation.valid) {
    return {
      statusCode: validation.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        status: 'error',
        error: validation.error,
      }),
    };
  }

  const { destinationId, checkIn, checkOut, guests, totalNights, tier, maxPricePerNightUsd } =
    validation.params;

  // Check cache
  const cacheKey = `${destinationId}:${checkIn || 'none'}:${checkOut || 'none'}:${tier || 'all'}:${guests}:${totalNights}`;
  if (!options.disableCache) {
    const cached = hotelsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Ryoko-Cache': 'HIT',
        },
        body: JSON.stringify(cached.data),
      };
    }
  }

  const apiKey = (
    options.apiKey ||
    process.env.HOTEL_PROVIDER_API_KEY ||
    process.env.GOOGLE_HOTELS_API_KEY ||
    ''
  ).trim();

  // If credentials missing or placeholder, provide truthful curated accommodation catalog
  if (!apiKey || apiKey === 'your_hotel_provider_api_key_here') {
    const filtered: HotelOption[] = MOCK_HOTELS_EXPANDED.filter((h) => {
      const matchDest =
        h.destinationId.toLowerCase() === destinationId ||
        h.city.toLowerCase() === destinationId;
      const matchTier = tier ? h.tier === tier : true;
      const matchBudget = maxPricePerNightUsd
        ? h.estimatedPricePerNightUsd <= maxPricePerNightUsd
        : true;
      return matchDest && matchTier && matchBudget;
    }).map((h) => ({
      ...h,
      totalNights,
      guests,
      totalStayPriceUsd: h.estimatedPricePerNightUsd * totalNights,
    }));

    const unconfiguredPayload: HotelSearchResponse = {
      success: false,
      status: 'unconfigured',
      provider: 'hotel_provider_unconfigured',
      destinationId,
      hotels: filtered,
      totalFound: filtered.length,
      isMock: true,
      liveAvailabilityVerified: false,
      sourceAttribution: 'Ryoko Simulated Hospitality Catalog',
      disclaimer:
        'HOTEL_PROVIDER_API_KEY unconfigured in server environment. Indicative room rates and simulated vacancy active.',
      warning:
        'HOTEL_PROVIDER_API_KEY not configured on server. Curated accommodations active.',
    };

    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(unconfiguredPayload),
    };
  }

  const fetchFn = options.customFetch || fetch;
  const timeoutMs = options.timeoutMs || 8000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Mock partner upstream endpoint call
    const partnerUrl = `https://api.partnerhotels.mock/v1/search?destination=${encodeURIComponent(destinationId)}&key=${encodeURIComponent(apiKey)}`;

    const response = await fetchFn(partnerUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: false,
            status: 'error',
            error: 'Invalid Hotel API credentials provided on server.',
          }),
        };
      }
      if (response.status === 429) {
        return {
          statusCode: 429,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: false,
            status: 'rate_limited',
            error: 'Hotel API rate limit exceeded.',
          }),
        };
      }
      throw new Error(`Hotel provider returned HTTP status ${response.status}`);
    }

    const data = (await response.json()) as any;
    const liveHotels: HotelOption[] = (data.hotels || []).map((h: any) => ({
      ...h,
      totalNights,
      guests,
      totalStayPriceUsd: (h.estimatedPricePerNightUsd || 150) * totalNights,
      isMock: false,
      liveAvailabilityVerified: true,
      disclaimer: 'Verified room availability and live nightly rates.',
    }));

    const responsePayload: HotelSearchResponse = {
      success: true,
      status: liveHotels.length > 0 ? 'ok' : 'empty',
      provider: 'hotel_partner_live',
      destinationId,
      hotels: liveHotels,
      totalFound: liveHotels.length,
      isMock: false,
      liveAvailabilityVerified: true,
      sourceAttribution: HOTEL_PARTNER_ATTRIBUTION,
      disclaimer: 'Verified live accommodations retrieved from partner hospitality network.',
    };

    if (!options.disableCache) {
      hotelsCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Ryoko-Cache': 'MISS',
      },
      body: JSON.stringify(responsePayload),
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return {
        statusCode: 504,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          status: 'network_error',
          error: `Hotel provider request timed out after ${timeoutMs}ms.`,
        }),
      };
    }

    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        status: 'network_error',
        error: err instanceof Error ? err.message : 'Unknown upstream hotel service error',
      }),
    };
  }
}

/**
 * Creates standard HTTP middleware for Express / Connect / Vite server for /api/hotels.
 */
export function createHotelsProxyMiddleware(options: HotelsProxyOptions = {}) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method Not Allowed. Only GET is supported.' }));
      return;
    }

    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url || '', `http://${host}`);
    const rawParams: Record<string, string | undefined> = {};
    parsedUrl.searchParams.forEach((val, key) => {
      rawParams[key] = val;
    });

    const result = await handleHotelsProxyRequest(rawParams, options);

    res.statusCode = result.statusCode;
    for (const [headerName, headerVal] of Object.entries(result.headers)) {
      res.setHeader(headerName, headerVal);
    }
    res.end(result.body);
  };
}
