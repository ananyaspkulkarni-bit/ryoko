export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DestinationItineraryItem {
  timeSlot: string; // e.g. "MORNING · 09:30 AM"
  title: string;
  description: string;
  category: 'food' | 'landmark' | 'stroll' | 'art' | 'nature';
}

export interface DestinationCategoryDetails {
  transport: string[];
  food: string[];
  stay: string[];
  mustVisit: string[];
  mustTry: string[];
  mustDo: string[];
}

export interface Destination {
  id: string;
  name: string; // e.g. "Tokyo", "Paris", "Mumbai"
  primaryCity?: string; // e.g. "Tokyo", "Paris", "Cairo", "Mumbai"
  country: string; // e.g. "Japan", "France", "Egypt", "India"
  countryCode?: string; // e.g. "JP", "FR", "EG", "IN"
  region: string;
  coordinates: Coordinates;
  description: string;
  category: 'nature' | 'cultural' | 'urban' | 'coastal' | 'mountain';
  tags: string[];
  rating: number;
  imageUrl?: string;
  subtitle?: string; // e.g. "Metropolis of Dreams & Tradition"
  arrivalMessage?: string; // e.g. "Kon'nichiwa! We're in Tokyo."
  landmarkSvgType?: 'paris' | 'tokyo' | 'mumbai' | 'london' | 'newyork' | 'rome' | 'egypt' | 'generic';
  itinerary?: DestinationItineraryItem[];
  categories?: DestinationCategoryDetails;
}

export interface Attraction {
  id: string;
  destinationId: string;
  name: string;
  type: string;
  description: string;
  estimatedDurationHours: number;
  cost: number;
  coordinates: Coordinates;
}

export interface Restaurant {
  id: string;
  destinationId: string;
  name: string;
  cuisine: string;
  priceRange: '$' | '$$' | '$$$' | '$$$$';
  rating: number;
  coordinates: Coordinates;
}

export interface Hotel {
  id: string;
  destinationId: string;
  name: string;
  starRating: number;
  pricePerNight: number;
  coordinates: Coordinates;
}

export interface TransportOption {
  id: string;
  fromDestinationId: string;
  toDestinationId: string;
  mode: 'flight' | 'train' | 'bus' | 'ferry' | 'car';
  durationMinutes: number;
  cost: number;
  distanceKm: number;
}
