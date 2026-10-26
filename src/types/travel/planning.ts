import type { Coordinates } from '../destination';
import type { TravelStyle, Activity, GeneratedItineraryPlan, DayItineraryPlan } from '../itinerary';
import type { TransitMode, RouteResponse } from './routes';
import type { WeatherDayForecast } from './weather';

export type PaceLevel = 'relaxed' | 'balanced' | 'fast-paced';

export interface TransitBuffer {
  fromActivityName: string;
  toActivityName: string;
  distanceKm: number;
  estimatedMinutes: number;
  mode: TransitMode;
  isEstimated: boolean;
  liveTrafficVerified?: boolean;
  routeSummary?: string;
  sourceAttribution?: string;
}

export interface PlannedMealBreak {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  estimatedCostPerPerson: number;
  costForGroup: number;
  isEstimated: true;
  selectionReason: string;
}

export interface ComprehensiveScheduledItem {
  id: string;
  itemType: 'activity' | 'meal';
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  category: string;
  costForGroup?: number;
  isAdmissionRecorded: boolean;
  openingHours?: string;
  isOpenHoursRecorded: boolean;
  coordinates?: Coordinates;
  transitFromPrevious?: TransitBuffer | null;
  selectionReason: string;
  activity?: Activity;
}

export interface ComprehensiveDayPlan extends DayItineraryPlan {
  date?: string;          // YYYY-MM-DD
  dayOfWeek?: string;     // e.g. "Tuesday"
  timelineItems: ComprehensiveScheduledItem[];
  activeTouringMinutes: number;
  transitMinutesTotal: number;
  mealBreaks: PlannedMealBreak[];
  weatherForecast?: WeatherDayForecast;
  isWeatherAdapted?: boolean;
  weatherAdaptationNote?: string;
}

export interface UnrecordedDataFlags {
  admissionsUnrecordedCount: number;
  openingHoursUnrecordedCount: number;
  isWeatherEstimated: boolean;
  isTransitEstimated: boolean;
  notes: string[];
}

export interface ComprehensiveItineraryPlan extends GeneratedItineraryPlan {
  startDate?: string;
  endDate?: string;
  pace: PaceLevel;
  comprehensiveDays: ComprehensiveDayPlan[];
  unrecordedDataFlags: UnrecordedDataFlags;
  travelBuffersSummary: string;
  isWeatherAdapted?: boolean;
  weatherSummary?: string;
  isRoutesVerified?: boolean;
}

export interface ItineraryPlanRequest {
  destinationId: string;
  startDate?: string;    // YYYY-MM-DD
  endDate?: string;      // YYYY-MM-DD
  days?: number;
  budget?: number;
  travelers?: number;
  interests?: string[];
  travelStyle?: TravelStyle;
  pace?: PaceLevel;
  includeMeals?: boolean;
  weatherForecast?: WeatherDayForecast[];
  verifiedRoutes?: Record<string, RouteResponse>;
  constraints?: {
    maxDailyBudget?: number;
    indoorOnly?: boolean;
    weatherAdapted?: boolean;
  };
}
