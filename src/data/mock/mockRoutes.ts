import type { Coordinates } from '../../types/destination.ts';
import type { RouteOption, TransitMode } from '../../types/travel/routes.ts';

const ROUTE_DISCLAIMER =
  'Development mock routing — estimated distance & average city transit times. Live street navigation, real-time traffic congestion & transit delay schedules are not connected.';

/**
 * Calculates straight-line geodesic distance (Haversine formula) in kilometers between two GPS coordinates.
 */
export function calculateGeodesicDistanceKm(c1: Coordinates, c2: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Estimates realistic travel duration in minutes based on distance, mode, and typical urban transition buffers.
 * - Walking: ~4.5 km/h + 3 min transition buffer
 * - Transit (Metro / Bus): ~22 km/h + 8 min platform / waiting buffer
 * - Driving / Taxi: ~28 km/h + 6 min pickup / drop-off buffer
 */
export function estimateTravelTimeMinutes(distanceKm: number, mode: TransitMode = 'transit'): number {
  if (distanceKm <= 0.05) return 0;

  switch (mode) {
    case 'walking': {
      // 4.5 km/h -> ~13.3 min per km + 3 min buffer
      const mins = Math.round(distanceKm * (60 / 4.5) + 3);
      return Math.max(5, mins);
    }
    case 'driving': {
      // 28 km/h urban average + 6 min buffer
      const mins = Math.round(distanceKm * (60 / 28) + 6);
      return Math.max(8, mins);
    }
    case 'bicycling': {
      // 14 km/h + 3 min buffer
      const mins = Math.round(distanceKm * (60 / 14) + 3);
      return Math.max(5, mins);
    }
    case 'transit':
    default: {
      // Urban metro / bus transit: if under 1.2 km, walking is faster!
      if (distanceKm <= 1.2) {
        return Math.max(5, Math.round(distanceKm * (60 / 4.5) + 2));
      }
      // Metro: 22 km/h + 8 min waiting/transfer buffer
      const mins = Math.round(distanceKm * (60 / 22) + 8);
      return Math.max(12, mins);
    }
  }
}

/**
 * Best recommended transit mode based on distance.
 */
export function recommendTransitMode(distanceKm: number): TransitMode {
  if (distanceKm <= 1.5) return 'walking';
  if (distanceKm <= 12.0) return 'transit';
  return 'driving';
}

/**
 * Generates an estimated RouteOption between two coordinates.
 */
export function generateMockRoute(
  origin: Coordinates,
  destination: Coordinates,
  originName = 'Origin',
  destinationName = 'Destination',
  preferredMode?: TransitMode
): RouteOption {
  const dist = calculateGeodesicDistanceKm(origin, destination);
  const mode = preferredMode || recommendTransitMode(dist);
  const duration = estimateTravelTimeMinutes(dist, mode);

  let summary = '';
  if (mode === 'walking') {
    summary = `Scenic ${dist.toFixed(1)} km walking stroll (~${duration} min)`;
  } else if (mode === 'transit') {
    summary = `City metro/transit connection (~${dist.toFixed(1)} km, ~${duration} min incl. platform buffer)`;
  } else {
    summary = `Direct vehicle transit via main arterial (~${dist.toFixed(1)} km, ~${duration} min)`;
  }

  return {
    origin,
    destination,
    originName,
    destinationName,
    mode,
    distanceKm: dist,
    estimatedDurationMinutes: duration,
    summary,
    segments: [
      {
        mode,
        instruction: `Travel from ${originName} toward ${destinationName} via ${mode}`,
        distanceKm: dist,
        durationMinutes: duration,
      },
    ],
    isEstimated: true,
    liveTrafficVerified: false,
    disclaimer: ROUTE_DISCLAIMER,
  };
}
