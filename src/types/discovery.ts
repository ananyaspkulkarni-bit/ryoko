import type { Destination, Coordinates } from './destination';
import type { ActivityCategory, TimeOfDay } from './itinerary';

/**
 * Status of destination resolution:
 * - 'curated': Known fully curated destination with verified attractions and activities.
 * - 'resolved': Verified geographic entity (e.g. from world boundary data), but lacking curated city-level activities.
 * - 'ambiguous': Multiple plausible destinations match the query; requires user clarification.
 * - 'unresolved': Query could not be verified against any known geographical or curated record.
 */
export type DestinationResolutionStatus = 'curated' | 'resolved' | 'ambiguous' | 'unresolved';

/**
 * Provenance tag indicating the authenticity and source of activity data:
 * - 'curated': Hand-curated and verified by Ryoko travel team.
 * - 'verified_provider': Verified external travel/places partner API (prepared for future integration).
 * - 'community': Community-submitted and reviewed recommendation.
 * - 'none': Unverified placeholder or missing data.
 */
export type ActivityProvenance = 'curated' | 'verified_provider' | 'community' | 'none';

/**
 * Provider-independent candidate activity discovery representation.
 * Captures factual fields supported by real data without inventing missing fields.
 */
export interface DiscoveredActivityCandidate {
  id: string;
  name: string;
  destinationId: string;
  category: ActivityCategory;
  description?: string;
  provenance: ActivityProvenance;
  coordinates?: Coordinates;
  estimatedCostPerPerson?: number;
  estimatedDurationMinutes?: number;
  tags: string[];
  timeOfDay?: TimeOfDay;
  environment?: 'indoor' | 'outdoor' | 'both';
  openingHours?: string;
  sourceAttribution?: string;
  providerPlaceId?: string;
  rating?: number;
}

/**
 * Result of a destination resolution attempt.
 */
export interface DestinationResolutionResult {
  status: DestinationResolutionStatus;
  query: string;
  destination?: Destination;
  candidates?: Destination[];
  hasVerifiedActivities: boolean;
  provenance: 'curated' | 'city_catalog' | 'country_geo' | 'none';
  message: string;
}

/**
 * Provider-independent interface for dynamic destination discovery and activity sourcing.
 */
export interface IDestinationDiscoveryService {
  resolveDestination(query: string | Destination | null | undefined): DestinationResolutionResult;
  getActivityCandidates(destinationId: string): DiscoveredActivityCandidate[];
  fetchActivityCandidates(destinationId: string): Promise<DiscoveredActivityCandidate[]>;
  getCuratedDestinations(): Destination[];
  isCuratedDestination(destinationId: string): boolean;
}
