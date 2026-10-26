import type {
  IPlacesProvider,
  PlacesProviderQuery,
  PlacesProviderResponse,
  OpenTripMapPlaceSummary,
  OpenTripMapPlaceDetails,
} from '../types/placesProvider';
import type { DiscoveredActivityCandidate } from '../types/discovery';
import type { ActivityCategory, Coordinates } from '../types';

/**
 * Calculates Haversine great-circle distance between two GPS coordinates in kilometers.
 */
function calculateDistanceKm(c1: Coordinates, c2: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Maps OpenTripMap kinds string to Ryoko's 5 core ActivityCategory types.
 */
export function mapOpenTripMapKindsToCategory(kinds: string): ActivityCategory {
  const lower = (kinds || '').toLowerCase();

  // 1. Food and Dining
  if (
    lower.includes('foods') ||
    lower.includes('restaurants') ||
    lower.includes('cafes') ||
    lower.includes('bakeries') ||
    lower.includes('bars') ||
    lower.includes('marketplaces')
  ) {
    return 'food';
  }

  // 2. Art and Culture
  if (
    lower.includes('museums') ||
    lower.includes('art_galleries') ||
    lower.includes('theatres') ||
    lower.includes('opera') ||
    lower.includes('cultural')
  ) {
    return 'art';
  }

  // 3. Nature and Parks
  if (
    lower.includes('natural') ||
    lower.includes('gardens_and_parks') ||
    lower.includes('nature_reserves') ||
    lower.includes('beaches') ||
    lower.includes('islands') ||
    lower.includes('geological_formations')
  ) {
    return 'nature';
  }

  // 4. Stroll and Urban Exploring
  if (
    lower.includes('view_points') ||
    lower.includes('squares') ||
    lower.includes('pedestrian') ||
    lower.includes('urban_environment') ||
    lower.includes('waterfronts') ||
    lower.includes('bridges')
  ) {
    return 'stroll';
  }

  // 5. Landmark and Heritage (default for historical, religious, and architectural sites)
  return 'landmark';
}

/**
 * Determines environment type from OpenTripMap kinds.
 */
export function determineEnvironmentFromKinds(kinds: string): 'indoor' | 'outdoor' | 'both' {
  const lower = (kinds || '').toLowerCase();

  const isIndoor =
    lower.includes('museums') ||
    lower.includes('art_galleries') ||
    lower.includes('theatres') ||
    lower.includes('opera') ||
    lower.includes('restaurants') ||
    lower.includes('cafes');

  const isOutdoor =
    lower.includes('natural') ||
    lower.includes('gardens_and_parks') ||
    lower.includes('beaches') ||
    lower.includes('view_points') ||
    lower.includes('squares') ||
    lower.includes('monuments_and_memorials') ||
    lower.includes('bridges');

  if (isIndoor && isOutdoor) return 'both';
  if (isIndoor) return 'indoor';
  if (isOutdoor) return 'outdoor';
  return 'both';
}

export interface OpenTripMapProviderConfig {
  /**
   * Base URL for places proxy (e.g. '/api/places' or external proxy).
   * Default: '/api/places' to keep credentials safely on the server side.
   */
  proxyUrl?: string;

  /**
   * Request timeout in milliseconds (default: 8000ms).
   */
  timeoutMs?: number;

  /**
   * Maximum search radius in meters around destination center (default: 20000m / 20km).
   */
  defaultRadiusMeters?: number;

  /**
   * Maximum number of places to retrieve (default: 15).
   */
  defaultLimit?: number;

  /**
   * Optional custom fetcher for dependency injection and testing.
   */
  customFetch?: typeof fetch;
}

/**
 * OpenTripMap Places Provider Adapter.
 *
 * Normalizes OpenTripMap places data into Ryoko's DiscoveredActivityCandidate model.
 * - Enforces zero secret key exposure in frontend bundles.
 * - Deduplicates places by ID and spatial proximity.
 * - Filters out unnamed places and distant geographic outliers.
 * - Preserves unverified fields as undefined (never fabricates prices or durations).
 * - Distinguishes rate limits (429), timeouts, and malformed data.
 */
export class OpenTripMapProvider implements IPlacesProvider {
  public readonly providerId = 'opentripmap';
  public readonly attribution = 'OpenTripMap (Data © OpenStreetMap contributors)';

  private proxyUrl: string;
  private timeoutMs: number;
  private defaultRadiusMeters: number;
  private defaultLimit: number;
  private fetchFn: typeof fetch;

  constructor(config: OpenTripMapProviderConfig = {}) {
    this.proxyUrl = config.proxyUrl || '/api/places';
    this.timeoutMs = config.timeoutMs ?? 8000;
    this.defaultRadiusMeters = config.defaultRadiusMeters ?? 20000;
    this.defaultLimit = config.defaultLimit ?? 15;
    this.fetchFn = config.customFetch || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (null as unknown as typeof fetch));
  }

  /**
   * Normalizes a raw OpenTripMap summary or details record into a DiscoveredActivityCandidate.
   * Unknown prices, durations, and opening hours are strictly preserved as undefined.
   */
  public normalizePlace(
    place: OpenTripMapPlaceSummary | OpenTripMapPlaceDetails,
    destinationId: string
  ): DiscoveredActivityCandidate | null {
    if (!place || !place.xid) return null;

    // Filter out unnamed or blank places
    const name = (place.name || '').trim();
    if (!name || name.length < 2) return null;

    const lat = place.point?.lat;
    const lng = place.point?.lon;
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      return null;
    }

    const category = mapOpenTripMapKindsToCategory(place.kinds || '');
    const environment = determineEnvironmentFromKinds(place.kinds || '');

    // Extract tags from comma-separated kinds string
    const rawTags = (place.kinds || '')
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/_/g, ' '))
      .filter((t) => t.length > 2 && t !== 'interesting places');
    const tags = Array.from(new Set([category, ...rawTags])).slice(0, 7);

    // Extract genuine description if available (from place details wikipedia extracts)
    let description: string | undefined = undefined;
    if ('wikipedia_extracts' in place && place.wikipedia_extracts?.text) {
      description = place.wikipedia_extracts.text.trim();
    }

    const ratingVal = typeof place.rate === 'number' ? place.rate : undefined;

    return {
      id: `otm-${place.xid}`,
      providerPlaceId: place.xid,
      name,
      destinationId: destinationId.toLowerCase(),
      category,
      description,
      provenance: 'verified_provider',
      coordinates: { lat, lng },
      // CRITICAL: OpenTripMap has no pricing or dwell-time data.
      // Leave undefined. Never invent fake values!
      estimatedCostPerPerson: undefined,
      estimatedDurationMinutes: undefined,
      openingHours: undefined,
      timeOfDay: 'any',
      environment,
      tags,
      sourceAttribution: this.attribution,
      rating: ratingVal,
    };
  }

  /**
   * Deduplicates candidate activities and filters out geographic outliers (> maxDistanceKm).
   */
  public filterAndDeduplicate(
    candidates: DiscoveredActivityCandidate[],
    targetCoordinates?: Coordinates,
    maxDistanceKm = 25
  ): DiscoveredActivityCandidate[] {
    const seenIds = new Set<string>();
    const seenNormalizedNames = new Map<string, Coordinates>();
    const filtered: DiscoveredActivityCandidate[] = [];

    for (const candidate of candidates) {
      if (seenIds.has(candidate.id)) continue;

      // Distance check from destination center if coordinates available
      if (targetCoordinates && candidate.coordinates) {
        const distKm = calculateDistanceKm(targetCoordinates, candidate.coordinates);
        if (distKm > maxDistanceKm) {
          continue; // Filter out distant outliers
        }
      }

      // Name & spatial deduplication (avoids multiple entrances or sub-POIs of same venue)
      const normName = candidate.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const prevCoords = seenNormalizedNames.get(normName);
      if (prevCoords && candidate.coordinates) {
        const proximityToPrev = calculateDistanceKm(prevCoords, candidate.coordinates);
        if (proximityToPrev <= 0.8) {
          continue; // Duplicate venue in close proximity
        }
      }

      seenIds.add(candidate.id);
      if (candidate.coordinates) {
        seenNormalizedNames.set(normName, candidate.coordinates);
      }
      filtered.push(candidate);
    }

    return filtered;
  }

  /**
   * Fetches places for a destination via the safe proxy endpoint.
   */
  public async fetchPlaces(query: PlacesProviderQuery): Promise<PlacesProviderResponse> {
    if (!this.fetchFn) {
      return {
        success: false,
        status: 'unconfigured',
        provider: this.providerId,
        destinationId: query.destinationId,
        activities: [],
        totalFound: 0,
        sourceAttribution: this.attribution,
        error: 'Fetch API is unavailable in current runtime environment.',
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      // Build safe query params for backend proxy
      const params = new URLSearchParams({
        destinationId: query.destinationId,
        destinationName: query.destinationName,
      });

      if (query.country) params.set('country', query.country);
      if (query.coordinates) {
        params.set('lat', String(query.coordinates.lat));
        params.set('lng', String(query.coordinates.lng));
      }
      if (query.limit || this.defaultLimit) {
        params.set('limit', String(query.limit || this.defaultLimit));
      }
      if (query.radiusMeters || this.defaultRadiusMeters) {
        params.set('radius', String(query.radiusMeters || this.defaultRadiusMeters));
      }

      const url = `${this.proxyUrl}${this.proxyUrl.includes('?') ? '&' : '?'}${params.toString()}`;

      const response = await this.fetchFn(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Handle Rate Limiting (HTTP 429)
      if (response.status === 429) {
        return {
          success: false,
          status: 'rate_limited',
          provider: this.providerId,
          destinationId: query.destinationId,
          activities: [],
          totalFound: 0,
          sourceAttribution: this.attribution,
          rateLimited: true,
          error: 'OpenTripMap rate limit reached. Falling back to curated destination catalog.',
        };
      }

      // Handle other HTTP errors
      if (!response.ok) {
        return {
          success: false,
          status: 'network_error',
          provider: this.providerId,
          destinationId: query.destinationId,
          activities: [],
          totalFound: 0,
          sourceAttribution: this.attribution,
          error: `Places proxy returned HTTP error ${response.status}: ${response.statusText}`,
        };
      }

      // Parse JSON
      let rawData: unknown;
      try {
        rawData = await response.json();
      } catch {
        return {
          success: false,
          status: 'malformed_data',
          provider: this.providerId,
          destinationId: query.destinationId,
          activities: [],
          totalFound: 0,
          sourceAttribution: this.attribution,
          error: 'Places proxy returned invalid, non-JSON response payload.',
        };
      }

      // Support either array directly or { places: [...] } object from proxy
      let rawPlaces: (OpenTripMapPlaceSummary | OpenTripMapPlaceDetails)[] = [];
      if (Array.isArray(rawData)) {
        rawPlaces = rawData;
      } else if (rawData && typeof rawData === 'object' && 'places' in rawData && Array.isArray((rawData as { places: unknown[] }).places)) {
        rawPlaces = (rawData as { places: (OpenTripMapPlaceSummary | OpenTripMapPlaceDetails)[] }).places;
      } else {
        return {
          success: false,
          status: 'malformed_data',
          provider: this.providerId,
          destinationId: query.destinationId,
          activities: [],
          totalFound: 0,
          sourceAttribution: this.attribution,
          error: 'Expected array of places from places proxy, received incompatible structure.',
        };
      }

      if (rawPlaces.length === 0) {
        return {
          success: true,
          status: 'empty',
          provider: this.providerId,
          destinationId: query.destinationId,
          activities: [],
          totalFound: 0,
          sourceAttribution: this.attribution,
          warning: `No verified places found in OpenTripMap for ${query.destinationName}.`,
        };
      }

      // Normalize all places
      const normalizedList: DiscoveredActivityCandidate[] = [];
      for (const raw of rawPlaces) {
        const item = this.normalizePlace(raw, query.destinationId);
        if (item) {
          normalizedList.push(item);
        }
      }

      // Filter and deduplicate
      const maxDistKm = query.radiusMeters ? query.radiusMeters / 1000 : 25;
      const deduplicated = this.filterAndDeduplicate(normalizedList, query.coordinates, maxDistKm);

      return {
        success: true,
        status: deduplicated.length > 0 ? 'ok' : 'empty',
        provider: this.providerId,
        destinationId: query.destinationId,
        activities: deduplicated,
        totalFound: deduplicated.length,
        sourceAttribution: this.attribution,
      };
    } catch (err) {
      clearTimeout(timer);

      const isAbort = err instanceof Error && err.name === 'AbortError';
      return {
        success: false,
        status: 'network_error',
        provider: this.providerId,
        destinationId: query.destinationId,
        activities: [],
        totalFound: 0,
        sourceAttribution: this.attribution,
        error: isAbort
          ? `Places proxy request timed out after ${this.timeoutMs}ms.`
          : `Places fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}

export const openTripMapProvider = new OpenTripMapProvider();
