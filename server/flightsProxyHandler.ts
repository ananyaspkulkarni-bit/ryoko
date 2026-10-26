import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CabinClass, FlightOption, FlightSearchResponse } from '../src/types/travel/flights.ts';
import { MOCK_FLIGHTS } from '../src/data/mock/mockFlights.ts';

export interface ValidatedFlightParams {
  destination: string;
  destinationCity: string;
  destinationAirport?: string;
  originAirport?: string;
  originCity?: string;
  date?: string;
  passengers: number;
  cabinClass?: CabinClass;
}

export interface FlightsProxyOptions {
  /**
   * Amadeus Client ID. Defaults to process.env.AMADEUS_CLIENT_ID.
   */
  clientId?: string;
  /**
   * Amadeus Client Secret. Defaults to process.env.AMADEUS_CLIENT_SECRET.
   */
  clientSecret?: string;
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

export interface FlightsProxyResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export const AMADEUS_ATTRIBUTION = 'Amadeus Global Travel Network';
const AMADEUS_OAUTH_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_FLIGHT_OFFERS_URL = 'https://test.api.amadeus.com/v2/shopping/flight-offers';

/**
 * In-memory cache for flight telemetry (15-minute TTL).
 */
interface CacheEntry {
  timestamp: number;
  data: FlightSearchResponse;
}
const flightsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Canonical destination airport lookup.
 */
const CANONICAL_AIRPORTS: Record<string, { city: string; airport: string }> = {
  paris: { city: 'Paris', airport: 'CDG' },
  bangkok: { city: 'Bangkok', airport: 'BKK' },
  thailand: { city: 'Bangkok', airport: 'BKK' },
  tokyo: { city: 'Tokyo', airport: 'HND' },
  kyoto: { city: 'Kyoto', airport: 'KIX' },
  cairo: { city: 'Cairo', airport: 'CAI' },
  rome: { city: 'Rome', airport: 'FCO' },
  mumbai: { city: 'Mumbai', airport: 'BOM' },
  london: { city: 'London', airport: 'LHR' },
};

export function validateFlightParams(
  raw: Record<string, any>
): { valid: true; params: ValidatedFlightParams } | { valid: false; error: string; statusCode: number } {
  const destRaw = (raw.destination || raw.destinationCity || raw.destinationId || '').trim();

  if (!destRaw) {
    return {
      valid: false,
      error: 'Missing required parameter "destination" (or "destinationCity").',
      statusCode: 400,
    };
  }

  const destKey = destRaw.toLowerCase();
  const canonical = CANONICAL_AIRPORTS[destKey];
  const destinationCity = canonical ? canonical.city : destRaw;
  const destinationAirport = raw.destinationAirport || (canonical ? canonical.airport : undefined);

  let passengers = 1;
  if (raw.passengers) {
    const parsed = parseInt(String(raw.passengers), 10);
    if (!isNaN(parsed) && parsed >= 1) {
      passengers = Math.min(9, parsed);
    }
  }

  let date = raw.date || raw.departureDate;
  if (date && typeof date === 'string') {
    date = date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        valid: false,
        error: `Invalid date format "${date}". Must be YYYY-MM-DD.`,
        statusCode: 400,
      };
    }
  }

  return {
    valid: true,
    params: {
      destination: destRaw,
      destinationCity,
      destinationAirport,
      originAirport: raw.origin || raw.originAirport,
      originCity: raw.originCity,
      date,
      passengers,
      cabinClass: raw.cabinClass,
    },
  };
}

/**
 * Executes server-side request to Amadeus or returns curated flight inventory fallback.
 */
export async function handleFlightsProxyRequest(
  rawParams: Record<string, any>,
  options: FlightsProxyOptions = {}
): Promise<FlightsProxyResult> {
  const validation = validateFlightParams(rawParams);
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

  const { destinationCity, destinationAirport, originAirport, date, passengers, cabinClass } =
    validation.params;

  // Check cache
  const cacheKey = `${destinationCity.toLowerCase()}:${originAirport || 'any'}:${date || 'any'}:${cabinClass || 'any'}`;
  if (!options.disableCache) {
    const cached = flightsCache.get(cacheKey);
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

  const clientId = (options.clientId || process.env.AMADEUS_CLIENT_ID || '').trim();
  const clientSecret = (options.clientSecret || process.env.AMADEUS_CLIENT_SECRET || '').trim();

  // If credentials missing or placeholder, provide graceful curated fallback
  if (
    !clientId ||
    !clientSecret ||
    clientId === 'your_amadeus_client_id_here' ||
    clientSecret === 'your_amadeus_client_secret_here'
  ) {
    const normCity = destinationCity.toLowerCase();
    const destKey = normCity === 'thailand' || normCity === 'th' ? 'bangkok' : normCity;

    const matches: FlightOption[] = MOCK_FLIGHTS.filter((f) => {
      const cityMatch = f.destinationCity.toLowerCase().includes(destKey);
      const airportMatch = destinationAirport
        ? f.destinationAirport.toLowerCase() === destinationAirport.toLowerCase()
        : false;
      const originMatch = originAirport
        ? f.originAirport.toLowerCase() === originAirport.toLowerCase()
        : true;
      const cabinMatch = cabinClass ? f.cabinClass === cabinClass : true;
      return (cityMatch || airportMatch) && originMatch && cabinMatch;
    });

    const unconfiguredPayload: FlightSearchResponse = {
      success: false,
      status: 'unconfigured',
      provider: 'amadeus_unconfigured',
      destinationCity,
      flights: matches,
      totalFound: matches.length,
      isMock: true,
      liveFareVerified: false,
      sourceAttribution: 'Ryoko Simulated Flight Network',
      disclaimer:
        'AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET unconfigured in server environment. Indicative flight schedules and rates active.',
      warning:
        'AMADEUS_CLIENT_ID not configured on server. Displaying simulated development flight schedules.',
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

    // 1. Obtain Amadeus OAuth Bearer Token
    const tokenRes = await fetchFn(AMADEUS_OAUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`,
      signal: controller.signal,
    });

    if (!tokenRes.ok) {
      clearTimeout(timeoutId);
      if (tokenRes.status === 401 || tokenRes.status === 403) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: false,
            status: 'error',
            error: 'Invalid Amadeus API credentials provided on server.',
          }),
        };
      }
      throw new Error(`Amadeus auth returned HTTP status ${tokenRes.status}`);
    }

    const tokenData = (await tokenRes.json()) as any;
    const accessToken = tokenData.access_token;

    // 2. Query Flight Offers
    const originIata = (originAirport || 'JFK').toUpperCase();
    const destIata = (destinationAirport || 'CDG').toUpperCase();
    const depDate = date || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0];

    const offersUrl = `${AMADEUS_FLIGHT_OFFERS_URL}?originLocationCode=${encodeURIComponent(originIata)}&destinationLocationCode=${encodeURIComponent(destIata)}&departureDate=${encodeURIComponent(depDate)}&adults=${passengers}&max=6&currencyCode=USD`;

    const offersRes = await fetchFn(offersUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!offersRes.ok) {
      if (offersRes.status === 429) {
        return {
          statusCode: 429,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: false,
            status: 'rate_limited',
            error: 'Amadeus flight search rate limit exceeded.',
          }),
        };
      }
      throw new Error(`Amadeus flight offers returned HTTP status ${offersRes.status}`);
    }

    const offersData = (await offersRes.json()) as any;
    const liveFlights: FlightOption[] = [];

    if (Array.isArray(offersData.data)) {
      offersData.data.forEach((offer: any, idx: number) => {
        const itinerary = offer.itineraries?.[0];
        const firstSegment = itinerary?.segments?.[0];
        const lastSegment = itinerary?.segments?.[itinerary.segments.length - 1] || firstSegment;
        const priceTotal = parseFloat(offer.price?.total || '450');

        let durationMins = 360;
        if (itinerary?.duration) {
          // Format like "PT8H30M"
          const matchH = itinerary.duration.match(/(\d+)H/);
          const matchM = itinerary.duration.match(/(\d+)M/);
          const hours = matchH ? parseInt(matchH[1], 10) : 0;
          const mins = matchM ? parseInt(matchM[1], 10) : 0;
          durationMins = hours * 60 + mins;
        }

        liveFlights.push({
          id: `flt-live-${offer.id || idx}`,
          carrier: firstSegment?.carrierCode || 'Live Air',
          carrierCode: firstSegment?.carrierCode || 'LA',
          flightNumber: `${firstSegment?.carrierCode || 'FL'} ${firstSegment?.number || '101'}`,
          originAirport: firstSegment?.departure?.iataCode || originIata,
          originCity: originAirport || 'Origin',
          destinationAirport: lastSegment?.arrival?.iataCode || destIata,
          destinationCity,
          departureTime: firstSegment?.departure?.at
            ? new Date(firstSegment.departure.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '08:00 AM',
          arrivalTime: lastSegment?.arrival?.at
            ? new Date(lastSegment.arrival.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '02:30 PM',
          durationMinutes: durationMins,
          stops: (itinerary?.segments?.length || 1) - 1,
          cabinClass: (offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin?.toLowerCase() as CabinClass) || 'economy',
          estimatedPriceUsd: Math.round(priceTotal),
          currency: 'USD',
          isMock: false,
          liveFareVerified: true,
          disclaimer: 'Live airline inventory retrieved via Amadeus Global Travel Network.',
        });
      });
    }

    const responsePayload: FlightSearchResponse = {
      success: true,
      status: liveFlights.length > 0 ? 'ok' : 'empty',
      provider: 'amadeus_live',
      destinationCity,
      flights: liveFlights,
      totalFound: liveFlights.length,
      isMock: false,
      liveFareVerified: true,
      sourceAttribution: AMADEUS_ATTRIBUTION,
      disclaimer: 'Verified live flight offers retrieved from Amadeus Global Travel Network.',
    };

    if (!options.disableCache) {
      flightsCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });
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
          error: `Amadeus request timed out after ${timeoutMs}ms.`,
        }),
      };
    }

    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        status: 'network_error',
        error: err instanceof Error ? err.message : 'Unknown upstream flight service error',
      }),
    };
  }
}

/**
 * Creates standard HTTP middleware for Express / Connect / Vite server for /api/flights.
 */
export function createFlightsProxyMiddleware(options: FlightsProxyOptions = {}) {
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

    const result = await handleFlightsProxyRequest(rawParams, options);

    res.statusCode = result.statusCode;
    for (const [headerName, headerVal] of Object.entries(result.headers)) {
      res.setHeader(headerName, headerVal);
    }
    res.end(result.body);
  };
}
