import type { Activity, TravelStyle, GeneratedItineraryPlan } from './itinerary';

export interface AIPlanInput {
  destinationId: string;
  destinationName: string;
  country: string;
  days: number;
  travelers: number;
  budget: number;
  currency: string; // e.g. "USD"
  travelStyle: TravelStyle;
  interests: string[];
  constraints?: {
    maxDailyBudget?: number;
    indoorOnly?: boolean;
  };
  candidateActivities: Activity[]; // Supplied factual candidate list
  hasVerifiedActivities?: boolean;
}

export interface AIPlanActivityProposal {
  activityId: string; // Must match one of candidateActivities IDs!
  suggestedStartTime: string; // e.g. "09:30 AM"
  suggestedDurationMinutes?: number;
  selectionReason: string;
  estimatedCostPerPerson?: number; // Optional reference, checked deterministically
}

export interface AIPlanDayProposal {
  dayNumber: number;
  theme?: string;
  items: AIPlanActivityProposal[];
}

export interface AIPlanOutput {
  tripTitle: string;
  summary: string;
  days: AIPlanDayProposal[];
  assumptions?: string[];
  warnings?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  repairedPlan?: GeneratedItineraryPlan;
  errors: string[];
  warnings: string[];
  usedFallback: boolean;
}
