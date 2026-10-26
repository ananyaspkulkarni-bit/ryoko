/**
 * Domain types for Flight options, search queries, and provider responses.
 */

export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';

export interface FlightOption {
  id: string;
  carrier: string;
  carrierCode: string;
  flightNumber: string;
  originAirport: string;
  originCity: string;
  destinationAirport: string;
  destinationCity: string;
  departureTime: string; // ISO string or time string e.g. "08:45 AM"
  arrivalTime: string;   // ISO string or time string e.g. "11:30 AM"
  durationMinutes: number;
  stops: number;         // 0 = nonstop
  cabinClass: CabinClass;
  estimatedPriceUsd: number;
  currency: string;
  isMock: boolean;
  liveFareVerified: boolean;
  disclaimer: string;
}

export interface FlightSearchQuery {
  originAirport?: string;
  originCity?: string;
  destinationAirport?: string;
  destinationCity: string;
  destinationId?: string;
  departureDate?: string; // YYYY-MM-DD
  returnDate?: string;    // YYYY-MM-DD
  passengers?: number;
  cabinClass?: CabinClass;
}

export interface FlightSearchResponse {
  success: boolean;
  status: 'ok' | 'empty' | 'rate_limited' | 'network_error' | 'unconfigured' | 'error';
  provider: string;
  destinationCity: string;
  flights: FlightOption[];
  totalFound: number;
  isMock: boolean;
  liveFareVerified: boolean;
  sourceAttribution: string;
  disclaimer: string;
  warning?: string;
  error?: string;
}

export interface IFlightProvider {
  readonly providerId: string;
  readonly attribution: string;
  searchFlights(query: FlightSearchQuery): Promise<FlightSearchResponse>;
}
