export interface TravelPreferences {
  categories: string[];
  budgetLevel: 'budget' | 'moderate' | 'luxury';
  pace: 'relaxed' | 'balanced' | 'fast-paced';
  interests: string[];
}

export interface TripPlanRequest {
  originId: string;
  destinationIds: string[];
  startDate: string;
  endDate: string;
  preferences: TravelPreferences;
}

export interface Trip {
  id: string;
  title: string;
  destinationIds: string[];
  startDate: string;
  endDate: string;
  totalBudget: number;
  createdAt: string;
}
