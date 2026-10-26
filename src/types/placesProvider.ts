import type { Coordinates } from './destination';
import type { ActivityCategory } from './itinerary';
import type { DiscoveredActivityCandidate } from './discovery';

/**
 * Input query for fetching places/activities from an external provider.
 */
export interface PlacesProviderQuery {
  destinationId: string;
  destinationName: string;
  country?: string;
  coordinates?: Coordinates;
  categories?: ActivityCategory[];
  limit?: number;
  radiusMeters?: number;
}

/**
 * Standardized status of external places/activities fetch.
 */
export type PlacesFetchStatus =
  | 'ok'
  | 'empty'
  | 'rate_limited'
  | 'network_error'
  | 'malformed_data'
  | 'unconfigured'
  | 'error';

/**
 * Normalized response from any places or activity provider.
 */
export interface PlacesProviderResponse {
  success: boolean;
  status: PlacesFetchStatus;
  provider: string;
  destinationId: string;
  activities: DiscoveredActivityCandidate[];
  totalFound: number;
  sourceAttribution: string;
  warning?: string;
  error?: string;
  rateLimited?: boolean;
}

/**
 * Interface that all places and activity providers (Curated catalogue, OpenTripMap, etc.) must implement.
 */
export interface IPlacesProvider {
  readonly providerId: string;
  readonly attribution: string;
  fetchPlaces(query: PlacesProviderQuery): Promise<PlacesProviderResponse>;
}

/**
 * Aliases for generalized activity provider layer terminology.
 */
export type IActivityProvider = IPlacesProvider;
export type ActivityProviderQuery = PlacesProviderQuery;
export type ActivityProviderResponse = PlacesProviderResponse;
export type ActivityFetchStatus = PlacesFetchStatus;

/**
 * Raw OpenTripMap place summary returned from /places/radius or /places/bbox
 */
export interface OpenTripMapPlaceSummary {
  xid: string;
  name: string;
  rate?: number;
  osm?: string;
  dist?: number;
  kinds: string;
  point: {
    lon: number;
    lat: number;
  };
}

/**
 * Raw OpenTripMap place details returned from /places/xid/{xid}
 */
export interface OpenTripMapPlaceDetails {
  xid: string;
  name: string;
  kinds: string;
  point: {
    lon: number;
    lat: number;
  };
  address?: {
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    road?: string;
  };
  rate?: string | number;
  wikipedia_extracts?: {
    title?: string;
    text?: string;
    html?: string;
  };
  preview?: {
    source?: string;
    width?: number;
    height?: number;
  };
  url?: string;
  otm?: string;
}
