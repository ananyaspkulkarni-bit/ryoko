import type { Coordinates } from '../destination.ts';

export type TransitMode = 'walking' | 'transit' | 'driving' | 'bicycling';

export interface RouteSegment {
  mode: TransitMode;
  instruction: string;
  distanceKm: number;
  durationMinutes: number;
}

export interface RouteOption {
  origin: Coordinates;
  destination: Coordinates;
  originName?: string;
  destinationName?: string;
  mode: TransitMode;
  distanceKm: number;
  estimatedDurationMinutes: number;
  summary: string;
  segments: RouteSegment[];
  isEstimated: boolean;
  liveTrafficVerified: boolean;
  disclaimer: string;
}

export interface RouteQuery {
  origin: Coordinates;
  destination: Coordinates;
  originName?: string;
  destinationName?: string;
  mode?: TransitMode;
  departureTime?: string;
}

export interface RouteResponse {
  success: boolean;
  status: 'ok' | 'empty' | 'rate_limited' | 'network_error' | 'unconfigured' | 'error';
  provider: string;
  route?: RouteOption;
  distanceKm: number;
  estimatedDurationMinutes: number;
  mode: TransitMode;
  isEstimated: boolean;
  liveTrafficVerified: boolean;
  sourceAttribution: string;
  disclaimer: string;
  warning?: string;
  error?: string;
}

export interface DistanceMatrixQuery {
  origins: Coordinates[];
  destinations: Coordinates[];
  mode?: TransitMode;
}

export interface DistanceMatrixElement {
  distanceKm: number;
  estimatedDurationMinutes: number;
  status: 'OK' | 'ZERO_RESULTS' | 'NOT_FOUND';
}

export interface DistanceMatrixResponse {
  success: boolean;
  provider: string;
  rows: Array<{
    elements: DistanceMatrixElement[];
  }>;
  isEstimated: boolean;
  liveTrafficVerified: boolean;
  sourceAttribution: string;
  disclaimer: string;
}

export interface IRoutesProvider {
  readonly providerId: string;
  readonly attribution: string;
  calculateRoute(query: RouteQuery): Promise<RouteResponse>;
  getDistanceMatrix(query: DistanceMatrixQuery): Promise<DistanceMatrixResponse>;
}
