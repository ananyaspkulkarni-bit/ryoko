import type { IncomingMessage, ServerResponse } from 'node:http';
import type { WeatherCondition, WeatherResponse, WeatherDayForecast, WeatherCurrentSnapshot } from '../src/types/travel/weather.ts';

/**
 * Validated query parameters for server-side weather proxy.
 */
export interface ValidatedWeatherParams {
  lat: number;
  lng: number;
  destinationId: string;
  destinationName?: string;
  days: number;
}

export interface WeatherProxyOptions {
  /**
   * OpenWeather API key. Defaults to process.env.OPENWEATHER_API_KEY.
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

export interface WeatherProxyResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export const OPENWEATHER_ATTRIBUTION = 'OpenWeatherMap (Live Global Telemetry)';
const OPENWEATHER_WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
const OPENWEATHER_FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

/**
 * Fallback destination coordinate catalog for canonical Ryoko hubs.
 */
const CANONICAL_COORDINATES: Record<string, { lat: number; lng: number; name: string }> = {
  paris: { lat: 48.8566, lng: 2.3522, name: 'Paris' },
  bangkok: { lat: 13.7563, lng: 100.5018, name: 'Bangkok' },
  thailand: { lat: 13.7563, lng: 100.5018, name: 'Bangkok' },
  tokyo: { lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
  cairo: { lat: 30.0444, lng: 31.2357, name: 'Cairo' },
  rome: { lat: 41.9028, lng: 12.4964, name: 'Rome' },
  mumbai: { lat: 19.076, lng: 72.8777, name: 'Mumbai' },
  london: { lat: 51.5074, lng: -0.1278, name: 'London' },
  kyoto: { lat: 35.0116, lng: 135.7681, name: 'Kyoto' },
};

/**
 * In-memory cache for live weather telemetry (10-minute TTL to prevent rate limits).
 */
interface CacheEntry {
  timestamp: number;
  data: WeatherResponse;
}
const weatherCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Validates raw query parameters and resolves destination coordinates.
 */
export function validateWeatherParams(
  rawParams: Record<string, string | undefined>
): { valid: true; params: ValidatedWeatherParams } | { valid: false; error: string; statusCode: number } {
  const destId = (rawParams.destinationId || '').trim().toLowerCase();
  let latStr = rawParams.lat;
  let lngStr = rawParams.lng || rawParams.lon;

  // If coordinates not explicitly passed, attempt resolution from destination catalog
  if ((!latStr || !lngStr) && destId && CANONICAL_COORDINATES[destId]) {
    const canonical = CANONICAL_COORDINATES[destId];
    latStr = String(canonical.lat);
    lngStr = String(canonical.lng);
  }

  if (latStr === undefined || latStr === null || latStr.trim() === '') {
    return {
      valid: false,
      error: 'Missing required query parameter "lat" (or recognizable "destinationId").',
      statusCode: 400,
    };
  }

  if (lngStr === undefined || lngStr === null || lngStr.trim() === '') {
    return {
      valid: false,
      error: 'Missing required query parameter "lng" or "lon".',
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

  let days = 5;
  if (rawParams.days) {
    const parsedDays = parseInt(rawParams.days, 10);
    if (!isNaN(parsedDays)) {
      days = Math.max(1, Math.min(7, parsedDays));
    }
  }

  return {
    valid: true,
    params: {
      lat,
      lng,
      destinationId: destId || 'destination',
      destinationName: rawParams.destinationName || CANONICAL_COORDINATES[destId]?.name,
      days,
    },
  };
}

/**
 * Maps OpenWeather condition code and description into Ryoko's WeatherCondition.
 */
export function mapOpenWeatherCondition(
  weatherId: number,
  main: string,
  description = ''
): { condition: WeatherCondition; conditionLabel: string } {
  const capDesc = description
    ? description.charAt(0).toUpperCase() + description.slice(1)
    : main;

  // Thunderstorm: 200 - 232
  if (weatherId >= 200 && weatherId < 300) {
    return { condition: 'thunderstorm', conditionLabel: capDesc || 'Thunderstorm' };
  }
  // Drizzle: 300 - 321
  if (weatherId >= 300 && weatherId < 400) {
    return { condition: 'showers', conditionLabel: capDesc || 'Scattered Showers' };
  }
  // Rain: 500 - 531
  if (weatherId >= 500 && weatherId < 600) {
    if (weatherId === 500 || weatherId === 520) {
      return { condition: 'showers', conditionLabel: capDesc || 'Light Rain Showers' };
    }
    return { condition: 'rainy', conditionLabel: capDesc || 'Rainy' };
  }
  // Snow: 600 - 622
  if (weatherId >= 600 && weatherId < 700) {
    return { condition: 'snowy', conditionLabel: capDesc || 'Snow' };
  }
  // Atmosphere (Mist, Smoke, Haze, Fog): 700 - 781
  if (weatherId >= 700 && weatherId < 800) {
    return { condition: 'cloudy', conditionLabel: capDesc || 'Hazy / Foggy' };
  }
  // Clear: 800
  if (weatherId === 800) {
    return { condition: 'sunny', conditionLabel: capDesc || 'Clear & Sunny' };
  }
  // Clouds: 801 - 804
  if (weatherId === 801 || weatherId === 802) {
    return { condition: 'partly_cloudy', conditionLabel: capDesc || 'Partly Cloudy' };
  }
  if (weatherId >= 803) {
    return { condition: 'cloudy', conditionLabel: capDesc || 'Overcast Clouds' };
  }

  return { condition: 'partly_cloudy', conditionLabel: capDesc || 'Mild & Variable' };
}

/**
 * Executes server-side request to OpenWeatherMap and normalizes output into Ryoko WeatherResponse.
 */
export async function handleWeatherProxyRequest(
  rawParams: Record<string, string | undefined>,
  options: WeatherProxyOptions = {}
): Promise<WeatherProxyResult> {
  const validation = validateWeatherParams(rawParams);
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

  const { lat, lng, destinationId, destinationName, days } = validation.params;

  // Check cache
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (!options.disableCache) {
    const cached = weatherCache.get(cacheKey);
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

  // Verify server-side secret API Key
  const apiKey = (options.apiKey || process.env.OPENWEATHER_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_openweather_api_key_here') {
    const unconfiguredResponse: WeatherResponse = {
      success: false,
      status: 'unconfigured',
      provider: 'openweather_unconfigured',
      destinationId,
      current: {
        destinationId,
        cityName: destinationName || destinationId,
        temperatureC: 22,
        temperatureF: 72,
        feelsLikeC: 22,
        condition: 'partly_cloudy',
        conditionLabel: 'Seasonal Baseline (Simulated)',
        humidityPercent: 50,
        windSpeedKmH: 10,
        isMock: true,
        liveForecastVerified: false,
        disclaimer: 'OPENWEATHER_API_KEY unconfigured. Displaying simulated regional climatology.',
      },
      forecast: [],
      isMock: true,
      liveForecastVerified: false,
      sourceAttribution: 'Ryoko Fallback Climatology',
      disclaimer: 'OPENWEATHER_API_KEY is not configured in server environment. Fallback mock forecast active.',
      warning: 'OPENWEATHER_API_KEY not configured in server environment.',
    };

    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(unconfiguredResponse),
    };
  }

  const fetchFn = options.customFetch || fetch;
  const timeoutMs = options.timeoutMs || 8000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const currentWeatherUrl = `${OPENWEATHER_WEATHER_URL}?lat=${lat}&lon=${lng}&appid=${encodeURIComponent(apiKey)}&units=metric`;
    const forecastUrl = `${OPENWEATHER_FORECAST_URL}?lat=${lat}&lon=${lng}&appid=${encodeURIComponent(apiKey)}&units=metric`;

    const [currentRes, forecastRes] = await Promise.all([
      fetchFn(currentWeatherUrl, { signal: controller.signal }),
      fetchFn(forecastUrl, { signal: controller.signal }),
    ]);

    clearTimeout(timeoutId);

    if (!currentRes.ok) {
      if (currentRes.status === 401) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: false,
            status: 'error',
            error: 'Invalid OpenWeatherMap API credentials provided on server.',
          }),
        };
      }
      if (currentRes.status === 429) {
        return {
          statusCode: 429,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: false,
            status: 'rate_limited',
            error: 'OpenWeatherMap rate limit reached. Please try again shortly.',
          }),
        };
      }
      throw new Error(`OpenWeatherMap returned HTTP status ${currentRes.status}`);
    }

    const currentData = (await currentRes.json()) as any;
    const forecastData = forecastRes.ok ? ((await forecastRes.json()) as any) : null;

    // Map Current Snapshot
    const primaryWeather = currentData.weather?.[0] || {};
    const { condition: currentCondition, conditionLabel: currentLabel } = mapOpenWeatherCondition(
      primaryWeather.id || 800,
      primaryWeather.main || 'Clear',
      primaryWeather.description
    );

    const tempC = Math.round(currentData.main?.temp ?? 20);
    const feelsLikeC = Math.round(currentData.main?.feels_like ?? tempC);
    const windSpeedKmH = Math.round((currentData.wind?.speed ?? 3) * 3.6);

    const currentSnapshot: WeatherCurrentSnapshot = {
      destinationId,
      cityName: currentData.name || destinationName || destinationId,
      temperatureC: tempC,
      temperatureF: Math.round(tempC * 1.8 + 32),
      feelsLikeC,
      condition: currentCondition,
      conditionLabel: currentLabel,
      humidityPercent: currentData.main?.humidity ?? 50,
      windSpeedKmH,
      isMock: false,
      liveForecastVerified: true,
      disclaimer: 'Live meteorological telemetry retrieved via OpenWeatherMap API.',
    };

    // Aggregate Forecast list (3-hour intervals into daily slices)
    const dailyForecasts: WeatherDayForecast[] = [];
    if (forecastData && Array.isArray(forecastData.list)) {
      const byDay = new Map<string, any[]>();
      for (const slot of forecastData.list) {
        const dateStr = (slot.dt_txt || '').split(' ')[0];
        if (!dateStr) continue;
        if (!byDay.has(dateStr)) {
          byDay.set(dateStr, []);
        }
        byDay.get(dateStr)!.push(slot);
      }

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      for (const [dateStr, slots] of byDay.entries()) {
        if (dailyForecasts.length >= days) break;

        const temps = slots.map((s) => s.main?.temp).filter((t) => typeof t === 'number');
        const highC = Math.round(Math.max(...(temps.length > 0 ? temps : [tempC])));
        const lowC = Math.round(Math.min(...(temps.length > 0 ? temps : [tempC])));

        const pops = slots.map((s) => s.pop).filter((p) => typeof p === 'number');
        const maxPop = pops.length > 0 ? Math.max(...pops) : 0;
        const precipChance = Math.round(maxPop * 100);

        // Midday slot for dominant representation
        const middaySlot = slots[Math.floor(slots.length / 2)] || slots[0];
        const slotWeather = middaySlot.weather?.[0] || {};
        const { condition: dayCondition, conditionLabel: dayLabel } = mapOpenWeatherCondition(
          slotWeather.id || 800,
          slotWeather.main || 'Clear',
          slotWeather.description
        );

        const slotWind = Math.round((middaySlot.wind?.speed ?? 3) * 3.6);
        const dateObj = new Date(dateStr);
        const dayOfWeek = isNaN(dateObj.getTime()) ? 'Day' : dayNames[dateObj.getDay()];

        let advisory: string | undefined;
        if (dayCondition === 'rainy' || dayCondition === 'thunderstorm' || precipChance >= 60) {
          advisory = 'Rain expected — indoor cultural venues, galleries, and covered passages recommended.';
        } else if (highC >= 32) {
          advisory = 'High afternoon temperatures — stay hydrated and schedule shaded or air-conditioned visits.';
        } else if (dayCondition === 'sunny' || dayCondition === 'partly_cloudy') {
          advisory = 'Clear skies — prime conditions for outdoor walking tours and architectural photography.';
        }

        dailyForecasts.push({
          date: dateStr,
          dayOfWeek,
          condition: dayCondition,
          conditionLabel: dayLabel,
          tempHighC: highC,
          tempLowC: lowC,
          tempHighF: Math.round(highC * 1.8 + 32),
          tempLowF: Math.round(lowC * 1.8 + 32),
          precipitationChancePercent: precipChance,
          humidityPercent: middaySlot.main?.humidity ?? 50,
          windSpeedKmH: slotWind,
          advisory,
          isMock: false,
          liveForecastVerified: true,
        });
      }
    }

    const payload: WeatherResponse = {
      success: true,
      status: 'ok',
      provider: 'openweather_live',
      destinationId,
      current: currentSnapshot,
      forecast: dailyForecasts,
      isMock: false,
      liveForecastVerified: true,
      sourceAttribution: OPENWEATHER_ATTRIBUTION,
      disclaimer: 'Verified live meteorological telemetry provided by OpenWeatherMap API.',
    };

    // Cache valid payload
    if (!options.disableCache) {
      weatherCache.set(cacheKey, { timestamp: Date.now(), data: payload });
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
          error: `OpenWeatherMap request timed out after ${timeoutMs}ms.`,
        }),
      };
    }

    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        status: 'network_error',
        error: err instanceof Error ? err.message : 'Unknown upstream weather service error',
      }),
    };
  }
}

/**
 * Creates standard HTTP middleware for Express / Connect / Vite server.
 */
export function createWeatherProxyMiddleware(options: WeatherProxyOptions = {}) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    // Enable CORS preflight
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

    // Fallback for Vercel / Express serverless environment
    if (Object.keys(rawParams).length === 0 && (req as any).query) {
      Object.assign(rawParams, (req as any).query);
    }

    const result = await handleWeatherProxyRequest(rawParams, options);

    res.statusCode = result.statusCode;
    for (const [headerName, headerVal] of Object.entries(result.headers)) {
      res.setHeader(headerName, headerVal);
    }
    res.end(result.body);
  };
}
