import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Validated query parameters for server-side places proxy.
 */
export interface ValidatedPlacesParams {
  lat: number;
  lng: number;
  radius: number;
  limit: number;
  kinds?: string;
  rate?: number;
  destinationId?: string;
  destinationName?: string;
  country?: string;
}

/**
 * Configuration options for the places proxy handler.
 */
export interface PlacesProxyOptions {
  /**
   * OpenTripMap API key. Defaults to process.env.OPENTRIPMAP_API_KEY.
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
}

/**
 * HTTP response representation from places proxy.
 */
export interface PlacesProxyResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export const OPENTRIPMAP_ATTRIBUTION = 'OpenTripMap (Data © OpenStreetMap contributors)';
const OPENTRIPMAP_BASE_URL = 'https://api.opentripmap.com/0.1/en/places/radius';

/**
 * Validates raw query parameters for coordinates, radius, and limits.
 */
export function validatePlacesParams(
  rawParams: Record<string, string | undefined>
): { valid: true; params: ValidatedPlacesParams } | { valid: false; error: string; statusCode: number } {
  const latStr = rawParams.lat;
  const lngStr = rawParams.lng || rawParams.lon;

  if (latStr === undefined || latStr === null || latStr.trim() === '') {
    return {
      valid: false,
      error: 'Missing required query parameter "lat" (latitude).',
      statusCode: 400,
    };
  }

  if (lngStr === undefined || lngStr === null || lngStr.trim() === '') {
    return {
      valid: false,
      error: 'Missing required query parameter "lng" or "lon" (longitude).',
      statusCode: 400,
    };
  }

  const lat = Number(latStr);
  const lng = Number(lngStr);

  if (!Number.isFinite(lat) || isNaN(lat)) {
    return {
      valid: false,
      error: `Invalid latitude value "${latStr}". Must be a valid finite number.`,
      statusCode: 400,
    };
  }

  if (lat < -90 || lat > 90) {
    return {
      valid: false,
      error: `Latitude ${lat} is out of valid range [-90, 90].`,
      statusCode: 400,
    };
  }

  if (!Number.isFinite(lng) || isNaN(lng)) {
    return {
      valid: false,
      error: `Invalid longitude value "${lngStr}". Must be a valid finite number.`,
      statusCode: 400,
    };
  }

  if (lng < -180 || lng > 180) {
    return {
      valid: false,
      error: `Longitude ${lng} is out of valid range [-180, 180].`,
      statusCode: 400,
    };
  }

  // Validate Radius (meters): default 20000, bounds [100, 50000]
  let radius = 20000;
  if (rawParams.radius !== undefined && rawParams.radius.trim() !== '') {
    const parsedRadius = Number(rawParams.radius);
    if (!Number.isFinite(parsedRadius) || isNaN(parsedRadius) || parsedRadius < 100 || parsedRadius > 50000) {
      return {
        valid: false,
        error: `Invalid radius "${rawParams.radius}". Radius must be a number between 100 and 50,000 meters.`,
        statusCode: 400,
      };
    }
    radius = Math.round(parsedRadius);
  }

  // Validate Limit: default 15, bounds [1, 50]
  let limit = 15;
  if (rawParams.limit !== undefined && rawParams.limit.trim() !== '') {
    const parsedLimit = Number(rawParams.limit);
    if (!Number.isFinite(parsedLimit) || isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      return {
        valid: false,
        error: `Invalid limit "${rawParams.limit}". Limit must be an integer between 1 and 50.`,
        statusCode: 400,
      };
    }
    limit = Math.floor(parsedLimit);
  }

  // Validate Rate: default 2, bounds [1, 3]
  let rate = 2;
  if (rawParams.rate !== undefined && rawParams.rate.trim() !== '') {
    const parsedRate = Number(rawParams.rate);
    if (Number.isFinite(parsedRate) && parsedRate >= 1 && parsedRate <= 3) {
      rate = Math.floor(parsedRate);
    }
  }

  return {
    valid: true,
    params: {
      lat,
      lng,
      radius,
      limit,
      kinds: rawParams.kinds ? rawParams.kinds.trim() : 'interesting_places',
      rate,
      destinationId: rawParams.destinationId?.trim(),
      destinationName: rawParams.destinationName?.trim(),
      country: rawParams.country?.trim(),
    },
  };
}

/**
 * Executes a secure server-side proxy request to OpenTripMap.
 * Validates inputs, handles timeouts, rate limits, and returns normalized results.
 */
export async function handlePlacesProxyRequest(
  rawParams: Record<string, string | undefined>,
  options: PlacesProxyOptions = {}
): Promise<PlacesProxyResult> {
  const jsonHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, max-age=0',
    'Access-Control-Allow-Origin': '*',
  };

  // 1. Server-side validation of coordinates, radius, and limit
  const validation = validatePlacesParams(rawParams);
  if (!validation.valid) {
    return {
      statusCode: validation.statusCode,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: validation.error,
        status: 'invalid_params',
      }),
    };
  }

  const { lat, lng, radius, limit, kinds, rate } = validation.params;

  // 2. Secret API key verification from server-side environment
  const apiKey = (options.apiKey !== undefined ? options.apiKey : process.env.OPENTRIPMAP_API_KEY)?.trim();
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: 'OpenTripMap API key is not configured on the server. Set OPENTRIPMAP_API_KEY in server environment.',
        status: 'unconfigured',
      }),
    };
  }

  // 3. Upstream request with timeout via AbortController
  const timeoutMs = options.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const fetchFn = options.customFetch || fetch;

  try {
    const searchParams = new URLSearchParams({
      radius: String(radius),
      lon: String(lng),
      lat: String(lat),
      limit: String(limit),
      format: 'json',
      apikey: apiKey,
    });

    if (kinds) {
      searchParams.set('kinds', kinds);
    }
    if (rate !== undefined) {
      searchParams.set('rate', String(rate));
    }

    const upstreamUrl = `${OPENTRIPMAP_BASE_URL}?${searchParams.toString()}`;

    const upstreamResponse = await fetchFn(upstreamUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'RyokoTravelApp/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    // 4. Rate Limiting Handling (HTTP 429)
    if (upstreamResponse.status === 429) {
      return {
        statusCode: 429,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: 'OpenTripMap rate limit reached. Fallback to curated activities active.',
          status: 'rate_limited',
          rateLimited: true,
        }),
      };
    }

    // 5. Authentication Failure with Upstream (HTTP 401/403)
    if (upstreamResponse.status === 401 || upstreamResponse.status === 403) {
      return {
        statusCode: 502,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: 'OpenTripMap upstream authentication failed. Verify server OPENTRIPMAP_API_KEY.',
          status: 'auth_error',
        }),
      };
    }

    // 6. Upstream Non-OK Status
    if (!upstreamResponse.ok) {
      return {
        statusCode: 502,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: `Upstream OpenTripMap provider returned HTTP error ${upstreamResponse.status}.`,
          status: 'provider_error',
        }),
      };
    }

    // 7. Malformed / Non-JSON Payload Handling
    let rawData: unknown;
    try {
      rawData = await upstreamResponse.json();
    } catch {
      return {
        statusCode: 502,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: 'Upstream provider returned malformed, non-JSON response.',
          status: 'malformed_data',
        }),
      };
    }

    // 8. Upstream Error Object Handling (OpenTripMap sometimes returns { error: "..." })
    if (rawData && typeof rawData === 'object' && !Array.isArray(rawData) && 'error' in rawData) {
      const errObj = rawData as { error: unknown };
      return {
        statusCode: 502,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: `Upstream OpenTripMap error: ${String(errObj.error)}`,
          status: 'provider_error',
        }),
      };
    }

    // 9. Normalized Result Processing
    if (!Array.isArray(rawData)) {
      return {
        statusCode: 502,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: 'Expected array of places from OpenTripMap, received incompatible payload format.',
          status: 'malformed_data',
        }),
      };
    }

    // Preserve authentic OpenTripMap places data, source IDs, kinds, and coordinates
    // Strictly omit fabricating prices, opening hours, durations, or attractions
    interface RawOtmPlace {
      xid?: unknown;
      name?: unknown;
      rate?: unknown;
      osm?: unknown;
      dist?: unknown;
      kinds?: unknown;
      point?: {
        lat?: unknown;
        lon?: unknown;
      };
    }

    const verifiedPlaces = (rawData as RawOtmPlace[])
      .filter((p) => {
        if (!p || typeof p !== 'object') return false;
        if (typeof p.xid !== 'string' || !p.xid.trim()) return false;
        if (typeof p.name !== 'string' || !p.name.trim()) return false;
        if (!p.point || typeof p.point.lat !== 'number' || typeof p.point.lon !== 'number') return false;
        if (isNaN(p.point.lat) || isNaN(p.point.lon)) return false;
        return true;
      })
      .map((p) => ({
        xid: String(p.xid).trim(),
        name: String(p.name).trim(),
        rate: typeof p.rate === 'number' ? p.rate : undefined,
        osm: typeof p.osm === 'string' ? p.osm : undefined,
        dist: typeof p.dist === 'number' ? p.dist : undefined,
        kinds: typeof p.kinds === 'string' ? p.kinds : '',
        point: {
          lat: Number(p.point!.lat),
          lon: Number(p.point!.lon),
        },
      }));

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        places: verifiedPlaces,
        totalFound: verifiedPlaces.length,
        sourceAttribution: OPENTRIPMAP_ATTRIBUTION,
      }),
    };
  } catch (err) {
    clearTimeout(timer);

    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      statusCode: isAbort ? 504 : 502,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: isAbort
          ? `Places provider request timed out after ${timeoutMs}ms.`
          : `Places proxy error: ${err instanceof Error ? err.message : String(err)}`,
        status: isAbort ? 'timeout' : 'network_error',
      }),
    };
  }
}

/**
 * Creates a connect/express/vite compatible middleware for /api/places.
 */
export function createPlacesProxyMiddleware(options: PlacesProxyOptions = {}) {
  return async (req: IncomingMessage, res: ServerResponse, next?: (err?: unknown) => void): Promise<void> => {
    // Only accept GET and OPTIONS requests
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
      res.end();
      return;
    }

    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Method ${req.method} not allowed. Use GET.` }));
      return;
    }

    try {
      // Parse query string from req.url or req.originalUrl
      const rawUrl = req.url || '/';
      const searchIndex = rawUrl.indexOf('?');
      const queryString = searchIndex !== -1 ? rawUrl.slice(searchIndex + 1) : '';
      const searchParams = new URLSearchParams(queryString);

      const params: Record<string, string | undefined> = {};
      for (const [key, value] of searchParams.entries()) {
        params[key] = value;
      }

      // Fallback for serverless functions (e.g. Vercel) where req.query is pre-parsed
      if (Object.keys(params).length === 0 && (req as unknown as { query?: Record<string, unknown> }).query) {
        const preQuery = (req as unknown as { query: Record<string, unknown> }).query;
        if (preQuery && typeof preQuery === 'object') {
          for (const [key, value] of Object.entries(preQuery)) {
            params[key] = typeof value === 'string' ? value : Array.isArray(value) ? String(value[0]) : undefined;
          }
        }
      }

      const result = await handlePlacesProxyRequest(params, options);

      res.statusCode = result.statusCode;
      for (const [headerKey, headerVal] of Object.entries(result.headers)) {
        res.setHeader(headerKey, headerVal);
      }
      res.end(result.body);
    } catch (err) {
      if (next) {
        next(err);
      } else {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    }
  };
}
