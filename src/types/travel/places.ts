import type { Coordinates } from '../destination';
import type { ActivityCategory, TimeOfDay } from '../itinerary';
import type { DiscoveredActivityCandidate, ActivityProvenance } from '../discovery';
import type {
  IPlacesProvider,
  PlacesProviderQuery,
  PlacesProviderResponse,
  PlacesFetchStatus,
} from '../placesProvider';

export interface PlaceOpeningHours {
  open: string;         // e.g. "09:00 AM" or "09:00"
  close: string;        // e.g. "06:00 PM" or "18:00"
  closedDays?: number[]; // 0=Sunday, 1=Monday, 2=Tuesday, etc.
  description?: string; // e.g. "Closed on Tuesdays"
}

export interface DetailedPlace {
  id: string;
  name: string;
  destinationId: string;
  category: ActivityCategory;
  description: string;
  coordinates: Coordinates;
  estimatedCostPerPerson?: number;
  isAdmissionRecorded: boolean;
  estimatedDurationMinutes: number;
  isEstimatedDuration: boolean;
  tags: string[];
  timeOfDay: TimeOfDay;
  environment: 'indoor' | 'outdoor' | 'both';
  openingHours?: PlaceOpeningHours;
  isOpenHoursRecorded: boolean;
  provenance: ActivityProvenance;
  sourceAttribution: string;
  rating?: number;
  reviewCount?: number;
}

export type {
  IPlacesProvider,
  PlacesProviderQuery,
  PlacesProviderResponse,
  PlacesFetchStatus,
  DiscoveredActivityCandidate,
};
