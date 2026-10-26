import type { Destination } from '../../types';
import type { TravelPhase } from '../travel/travelState';
import type { CountryGeoData } from '../../data/countriesGeo';

export type GlobeTravelPhase = TravelPhase;

export interface GlobeControllerOptions {
  onDestinationClick?: (destination: Destination) => void;
  onCountryHover?: (country: CountryGeoData | null, clientX: number, clientY: number) => void;
  reducedMotion?: boolean;
  onPhaseChange?: (phase: TravelPhase) => void;
}


