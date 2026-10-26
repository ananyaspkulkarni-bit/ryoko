import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Coordinates } from '../src/types/destination.ts';
import type { TransitMode, RouteOption, RouteResponse, RouteSegment } from '../src/types/travel/routes.ts';
import { calculateGeodesicDistanceKm, estimateTravelTimeMinutes, recommendTransitMode } from '../src/data/mock/mockRoutes.ts';

/**
 * Validated parameters for server-side routes proxy.
 */
export interface ValidatedRouteParams {
  origin: Coordinates;
  destination: Coordinates;
  originName?: string;
  destinationName?: string;
  mode: TransitMode;
}

export interface RoutesProxyOptions {
  /**
   * Google Routes or Maps API key. Defaults to process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY.
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

export interface RoutesProxyResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export const GOOGLE_ROUTES_ATTRIBUTION = 'Google Maps Platform (Routes API)';
const GOOGLE_ROUTES_V2_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

/**
 * In-memory cache for live route durations (30-minute TTL to protect quotas and speed up requests).
 */
interface CacheEntry {
  timestamp: number;
  data: RouteResponse;
}
const routesCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Validates raw route query/body parameters and ensures valid geographical coordinates.
 */
export function validateRouteParams(
  raw: Record<string, any>
): { valid: true; params: ValidatedRouteParams } | { valid: false; error: string; statusCode: number } {
  // Support nested objects { origin: { lat, lng } } or flat params originLat, originLng
  let oLat = raw.origin?.lat ?? raw.originLat ?? raw.origin_lat;
  let oLng = raw.origin?.lng ?? raw.origin?.lon ?? raw.originLng ?? raw.origin_lng ?? raw.originLon;
  let dLat = raw.destination?.lat ?? raw.destLat ?? raw.destinationLat ?? raw.dest_lat;
  let dLng = raw.destination?.lng ?? raw.destination?.lon ?? raw.destLng ?? raw.destinationLng ?? raw.dest_lng ?? raw.destLon;

  if (oLat === undefined || oLat === null || String(oLat).trim() === '') {
    return {
      valid: false,
      error: 'Missing required parameter "origin.lat" (or "originLat").',
      statusCode: 400,
    };
  }

  if (oLng === undefined || oLng === null || String(oLng).trim() === '') {
    return {
      valid: false,
      error: 'Missing required parameter "origin.lng" (or "originLng").',
      statusCode: 400,
    };
  }

  if (dLat === undefined || dLat === null || String(dLat).trim() === '') {
    return {
      valid: false,
      error: 'Missing required parameter "destination.lat" (or "destLat").',
      statusCode: 400,
    };
  }

  if (dLng === undefined || dLng === null || String(dLng).trim() === '') {
    return {
      valid: false,
      error: 'Missing required parameter "destination.lng" (or "destLng").',
      statusCode: 400,
    };
  }

  const originLat = Number(oLat);
  const originLng = Number(oLng);
  const destLat = Number(dLat);
  const destLng = Number(dLng);

  if (!Number.isFinite(originLat) || !Number.isFinite(originLng)) {
    return {
      valid: false,
      error: `Invalid origin coordinates (${oLat}, ${oLng}). Must be valid finite numbers.`,
      statusCode: 400,
    };
  }

  if (!Number.isFinite(destLat) || !Number.isFinite(destLng)) {
    return {
      valid: false,
      error: `Invalid destination coordinates (${dLat}, ${dLng}). Must be valid finite numbers.`,
      statusCode: 400,
    };
  }

  if (originLat < -90 || originLat > 90 || destLat < -90 || destLat > 90) {
    return {
      valid: false,
      error: 'Latitude values must be within the authentic range [-90, 90].',
      statusCode: 400,
    };
  }

  if (originLng < -180 || originLng > 180 || destLng < -180 || destLng > 180) {
    return {
      valid: false,
      error: 'Longitude values must be within the authentic range [-180, 180].',
      statusCode: 400,
    };
  }

  const origin: Coordinates = { lat: originLat, lng: originLng };
  const destination: Coordinates = { lat: destLat, lng: destLng };

  // Cross-destination sanity check: cities do not have intra-itinerary stops > 150km apart
  const geodesicDistance = calculateGeodesicDistanceKm(origin, destination);
  if (geodesicDistance > 150) {
    return {
      valid: false,
      error: `Origin and destination are ${geodesicDistance.toFixed(1)} km apart; cannot be routed as an intra-city itinerary stop.`,
      statusCode: 400,
    };
  }

  // Validate or recommend transit mode
  let mode: TransitMode = raw.mode;
  const validModes: TransitMode[] = ['walking', 'transit', 'driving', 'bicycling'];
  if (!mode || !validModes.includes(mode)) {
    mode = recommendTransitMode(geodesicDistance);
  }

  return {
    valid: true,
    params: {
      origin,
      destination,
      originName: raw.originName || raw.origin?.name || 'Origin',
      destinationName: raw.destinationName || raw.destination?.name || 'Destination',
      mode,
    },
  };
}

/**
 * Executes server-side request to Google Routes API and normalizes output into Ryoko RouteResponse.
 */
export async function handleRoutesProxyRequest(
  rawParams: Record<string, any>,
  options: RoutesProxyOptions = {}
): Promise<RoutesProxyResult> {
  const validation = validateRouteParams(rawParams);
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

  const { origin, destination, originName, destinationName, mode } = validation.params;
  const geodesicDist = calculateGeodesicDistanceKm(origin, destination);

  // Check cache
  const cacheKey = `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}->${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}:${mode}`;
  if (!options.disableCache) {
    const cached = routesCache.get(cacheKey);
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

  // Check server-side API Key
  const apiKey = (
    options.apiKey ||
    process.env.GOOGLE_ROUTES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();

  if (!apiKey || apiKey === 'your_google_routes_api_key_here' || apiKey === 'your_google_maps_api_key_here') {
    const estimatedMins = estimateTravelTimeMinutes(geodesicDist, mode);
    const mockRoute: RouteOption = {
      origin,
      destination,
      originName,
      destinationName,
      mode,
      distanceKm: geodesicDist,
      estimatedDurationMinutes: estimatedMins,
      summary: `Estimated ${mode} buffer (~${geodesicDist.toFixed(1)} km, ~${estimatedMins} min)`,
      segments: [
        {
          mode,
          instruction: `Transit from ${originName} to ${destinationName} via ${mode}`,
          distanceKm: geodesicDist,
          durationMinutes: estimatedMins,
        },
      ],
      isEstimated: true,
      liveTrafficVerified: false,
      disclaimer: 'GOOGLE_ROUTES_API_KEY not configured on server. Displaying urban transit estimates.',
    };

    const unconfiguredPayload: RouteResponse = {
      success: false,
      status: 'unconfigured',
      provider: 'google_routes_unconfigured',
      route: mockRoute,
      distanceKm: geodesicDist,
      estimatedDurationMinutes: estimatedMins,
      mode,
      isEstimated: true,
      liveTrafficVerified: false,
      sourceAttribution: 'Ryoko Urban Transit Engine',
      disclaimer: 'GOOGLE_ROUTES_API_KEY not configured in server environment. Geodesic estimates active.',
      warning: 'GOOGLE_ROUTES_API_KEY not configured on server. Fallback transit calculation active.',
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

    // Map Ryoko TransitMode to Google Routes travelMode
    const travelModeMap: Record<TransitMode, string> = {
      walking: 'WALK',
      bicycling: 'BICYCLE',
      transit: 'TRANSIT',
      driving: 'DRIVE',
    };
    const googleTravelMode = travelModeMap[mode] || 'TRANSIT';

    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng,
          },
        },
      },
      travelMode: googleTravelMode,
      routingPreference: googleTravelMode === 'DRIVE' ? 'TRAFFIC_AWARE' : undefined,
      computeAlternativeRoutes: false,
    };

    const response = await fetchFn(GOOGLE_ROUTES_V2_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.description,routes.legs',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: false,
            status: 'error',
            error: 'Invalid Google Routes API credentials provided on server.',
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
            error: 'Google Routes API quota or rate limit exceeded.',
          }),
        };
      }
      throw new Error(`Google Routes API returned HTTP status ${response.status}`);
    }

    const data = (await response.json()) as any;
    const routeItem = data.routes?.[0];

    if (!routeItem) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          status: 'empty',
          provider: 'google_routes_live',
          distanceKm: geodesicDist,
          estimatedDurationMinutes: estimateTravelTimeMinutes(geodesicDist, mode),
          mode,
          isEstimated: true,
          liveTrafficVerified: false,
          sourceAttribution: GOOGLE_ROUTES_ATTRIBUTION,
          disclaimer: 'No direct navigation route returned by provider. Geodesic estimate used.',
          warning: 'No route found between given coordinates.',
        }),
      };
    }

    // Duration is in string format like "950s"
    let durationSeconds = 0;
    if (typeof routeItem.duration === 'string') {
      durationSeconds = parseInt(routeItem.duration.replace('s', ''), 10) || 0;
    }
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

    // Distance is in meters
    const distanceMeters = Number(routeItem.distanceMeters) || Math.round(geodesicDist * 1000);
    const distanceKm = Math.round((distanceMeters / 1000) * 100) / 100;

    const segments: RouteSegment[] = [];
    if (Array.isArray(routeItem.legs)) {
      for (const leg of routeItem.legs) {
        const legSecs = parseInt((leg.duration || '').replace('s', ''), 10) || durationSeconds;
        segments.push({
          mode,
          instruction: `Travel from ${originName} to ${destinationName} via ${mode}`,
          distanceKm: Math.round(((leg.distanceMeters || distanceMeters) / 1000) * 100) / 100,
          durationMinutes: Math.max(1, Math.round(legSecs / 60)),
        });
      }
    } else {
      segments.push({
        mode,
        instruction: `Travel from ${originName} to ${destinationName} via ${mode}`,
        distanceKm,
        durationMinutes,
      });
    }

    const verifiedRoute: RouteOption = {
      origin,
      destination,
      originName,
      destinationName,
      mode,
      distanceKm,
      estimatedDurationMinutes: durationMinutes,
      summary: routeItem.description || `Verified ${mode} route (~${distanceKm} km, ~${durationMinutes} min)`,
      segments,
      isEstimated: false,
      liveTrafficVerified: true,
      disclaimer: 'Verified navigation duration provided by Google Routes API.',
    };

    const payload: RouteResponse = {
      success: true,
      status: 'ok',
      provider: 'google_routes_live',
      route: verifiedRoute,
      distanceKm,
      estimatedDurationMinutes: durationMinutes,
      mode,
      isEstimated: false,
      liveTrafficVerified: true,
      sourceAttribution: GOOGLE_ROUTES_ATTRIBUTION,
      disclaimer: 'Verified route durations and road distances confirmed by Google Routes API.',
    };

    if (!options.disableCache) {
      routesCache.set(cacheKey, { timestamp: Date.now(), data: payload });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Ryoko-Cache': 'MISS',
      },
      body: JSON.stringify(payload),
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return {
        statusCode: 504,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          status: 'network_error',
          error: `Google Routes API request timed out after ${timeoutMs}ms.`,
        }),
      };
    }

    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        status: 'network_error',
        error: err instanceof Error ? err.message : 'Unknown upstream route service error',
      }),
    };
  }
}

/**
 * Creates standard HTTP middleware for Express / Connect / Vite server for /api/routes.
 */
export function createRoutesProxyMiddleware(options: RoutesProxyOptions = {}) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    // Enable CORS preflight
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method Not Allowed. Only GET and POST are supported.' }));
      return;
    }

    let rawParams: Record<string, any> = {};

    if (req.method === 'POST') {
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => {
          try {
            const rawBody = Buffer.concat(chunks).toString('utf8');
            if (rawBody.trim()) {
              rawParams = JSON.parse(rawBody);
            }
            resolve();
          } catch (e) {
            reject(e);
          }
        });
        req.on('error', reject);
      }).catch(() => {
        rawParams = {};
      });
    } else {
      // GET query parameters
      const host = req.headers.host || 'localhost';
      const parsedUrl = new URL(req.url || '', `http://${host}`);
      parsedUrl.searchParams.forEach((val, key) => {
        rawParams[key] = val;
      });
    }

    const result = await handleRoutesProxyRequest(rawParams, options);

    res.statusCode = result.statusCode;
    for (const [headerName, headerVal] of Object.entries(result.headers)) {
      res.setHeader(headerName, headerVal);
    }
    res.end(result.body);
  };
}
