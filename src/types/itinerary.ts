import type { Coordinates } from './destination';

export type ActivityCategory = 'food' | 'landmark' | 'stroll' | 'art' | 'nature';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'any';
export type TravelStyle = 'relaxed' | 'culture' | 'foodie' | 'adventure' | 'photography' | 'budget';

export interface Activity {
  id: string;
  name: string;
  description: string;
  destinationId: string;
  category: ActivityCategory;
  estimatedDurationMinutes: number;
  estimatedCostPerPerson?: number; // Optional: left undefined when provider does not supply pricing data
  tags: string[];
  timeOfDay: TimeOfDay;
  coordinates?: Coordinates;
  visitDurationMinutes?: number;
  prerequisites?: string[];
  environment?: 'indoor' | 'outdoor' | 'both';
}

export interface TripPreferences {
  destinationId: string;
  days: number;
  travelers: number;
  budget: number;
  travelStyle: TravelStyle;
  interests?: string[];
  pace?: 'relaxed' | 'balanced' | 'fast-paced';
  startDate?: string;
  endDate?: string;
  constraints?: {
    maxDailyBudget?: number;
    indoorOnly?: boolean;
  };
}

export interface ScheduledActivityItem {
  id: string;
  activity: Activity;
  timeSlotLabel: string; // e.g. "MORNING · 09:30 AM"
  startTime: string; // e.g. "09:30 AM"
  endTime: string; // e.g. "11:30 AM"
  durationMinutes: number;
  costForGroup?: number; // costPerPerson * travelers, or undefined when admission is unrecorded
  selectionReason: string;
}

export interface DayItineraryPlan {
  dayNumber: number;
  title: string;
  items: ScheduledActivityItem[];
  estimatedDailyCost: number;
}

export interface GeneratedItineraryPlan {
  id: string;
  destinationId: string;
  destinationName: string;
  country: string;
  days: DayItineraryPlan[];
  totalDays: number;
  travelersCount: number;
  travelStyle: TravelStyle;
  totalEstimatedCost: number;
  allocatedBudget: number;
  isWithinBudget: boolean;
  warnings: string[];
  disclaimerNote: string;
  hasVerifiedActivities?: boolean;
  dataStatus?: 'curated' | 'insufficient_data';
}

// Backward compatibility interfaces
export interface ActivityItem {
  id: string;
  name: string;
  type: 'attraction' | 'restaurant' | 'hotel' | 'transport' | 'custom';
  startTime: string;
  endTime: string;
  cost: number;
  location?: Coordinates;
  notes?: string;
}

export interface DayItinerary {
  dayNumber: number;
  date: string;
  activities: ActivityItem[];
}

export interface Itinerary {
  id: string;
  tripId: string;
  title: string;
  days: DayItinerary[];
  totalDistanceKm: number;
  totalEstimatedCost: number;
}
