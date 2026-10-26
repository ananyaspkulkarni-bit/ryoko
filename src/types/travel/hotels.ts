import type { Coordinates } from '../destination.ts';

export type HotelTier = 'budget' | 'moderate' | 'boutique' | 'luxury';

export interface HotelOption {
  id: string;
  name: string;
  destinationId: string;
  city: string;
  country: string;
  tier: HotelTier;
  starRating: number;
  estimatedPricePerNightUsd: number;
  currency: string;
  address: string;
  coordinates: Coordinates;
  amenities: string[];
  checkInTime: string;   // e.g. "03:00 PM"
  checkOutTime: string;  // e.g. "11:00 AM"
  neighborhood: string;
  ratingScore: number;   // e.g. 4.8 / 5.0
  reviewCount: number;
  isMock: boolean;
  liveAvailabilityVerified: boolean;
  disclaimer: string;
  totalStayPriceUsd?: number;
  totalNights?: number;
  guests?: number;
}

export interface HotelSearchQuery {
  destinationId: string;
  destinationName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  days?: number;
  guests?: number;
  rooms?: number;
  tier?: HotelTier;
  maxPricePerNightUsd?: number;
}


export interface HotelSearchResponse {
  success: boolean;
  status: 'ok' | 'empty' | 'rate_limited' | 'network_error' | 'unconfigured' | 'error';
  provider: string;
  destinationId: string;
  hotels: HotelOption[];
  totalFound: number;
  isMock: boolean;
  liveAvailabilityVerified: boolean;
  sourceAttribution: string;
  disclaimer: string;
  warning?: string;
  error?: string;
}

export interface IHotelProvider {
  readonly providerId: string;
  readonly attribution: string;
  searchHotels(query: HotelSearchQuery): Promise<HotelSearchResponse>;
}
