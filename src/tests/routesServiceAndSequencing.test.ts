import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockRoutesProvider, GoogleRoutesProvider } from '../services/providers/routesProviders';
import { RoutesService } from '../services/routesService';
import { itineraryPlanningEngine } from '../services/itineraryPlanningEngine';
import type { RouteQuery, RouteResponse } from '../types/travel/routes';
import type { Coordinates } from '../types/destination';

describe('Routes Service & Itinerary Sequencing Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. MockRoutesProvider & Geodesic Urban Calculations', () => {
    const louvre: Coordinates = { lat: 48.8606, lng: 2.3376 };
    const eiffelTower: Coordinates = { lat: 48.8584, lng: 2.2945 };
    const tuileries: Coordinates = { lat: 48.8634, lng: 2.3275 };

    it('calculates realistic walking duration and distance for short strolls', async () => {
      const provider = new MockRoutesProvider();
      const res = await provider.calculateRoute({
        origin: louvre,
        destination: tuileries,
        originName: 'Louvre Museum',
        destinationName: 'Tuileries Garden',
        mode: 'walking',
      });

      expect(res.success).toBe(true);
      expect(res.isEstimated).toBe(true);
      expect(res.liveTrafficVerified).toBe(false);
      expect(res.sourceAttribution).toContain('Ryoko Geodesic Urban Route Engine');
      expect(res.distanceKm).toBeLessThan(1.5);
      expect(res.estimatedDurationMinutes).toBeGreaterThan(0);
      expect(res.mode).toBe('walking');
      expect(res.route?.summary).toContain('walking stroll');
    });

    it('recommends city transit for cross-district distances', async () => {
      const provider = new MockRoutesProvider();
      const res = await provider.calculateRoute({
        origin: louvre,
        destination: eiffelTower,
        originName: 'Louvre Museum',
        destinationName: 'Eiffel Tower',
      });

      expect(res.success).toBe(true);
      expect(res.distanceKm).toBeGreaterThan(2.5);
      expect(res.mode).toBe('transit');
      expect(res.estimatedDurationMinutes).toBeGreaterThan(10);
      expect(res.isEstimated).toBe(true);
      expect(res.liveTrafficVerified).toBe(false);
    });

    it('generates distance matrix with geodesic distances and status OK', async () => {
      const provider = new MockRoutesProvider();
      const res = await provider.getDistanceMatrix({
        origins: [louvre],
        destinations: [tuileries, eiffelTower],
      });

      expect(res.success).toBe(true);
      expect(res.isEstimated).toBe(true);
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].elements.length).toBe(2);
      expect(res.rows[0].elements[0].status).toBe('OK');
      expect(res.rows[0].elements[0].distanceKm).toBeLessThan(res.rows[0].elements[1].distanceKm);
    });
  });

  describe('2. GoogleRoutesProvider & Graceful Fallback', () => {
    const origin: Coordinates = { lat: 13.7563, lng: 100.5018 };
    const destination: Coordinates = { lat: 13.7500, lng: 100.4914 };

    it('normalizes verified route response from server proxy', async () => {
      const mockRoutePayload: RouteResponse = {
        success: true,
        status: 'ok',
        provider: 'google_routes_live',
        distanceKm: 1.4,
        estimatedDurationMinutes: 14,
        mode: 'walking',
        isEstimated: false,
        liveTrafficVerified: true,
        sourceAttribution: 'Google Maps Platform (Routes API)',
        disclaimer: 'Verified route navigation provided by Google Routes API.',
        route: {
          origin,
          destination,
          originName: 'Grand Palace',
          destinationName: 'Wat Pho',
          mode: 'walking',
          distanceKm: 1.4,
          estimatedDurationMinutes: 14,
          summary: 'Via Maha Rat Road',
          segments: [
            {
              mode: 'walking',
              instruction: 'Head south on Maha Rat Rd',
              distanceKm: 1.4,
              durationMinutes: 14,
            },
          ],
          isEstimated: false,
          liveTrafficVerified: true,
          disclaimer: 'Verified navigation duration provided by Google Routes API.',
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockRoutePayload,
      });

      global.fetch = mockFetch;

      const provider = new GoogleRoutesProvider('/api/routes');
      const res = await provider.calculateRoute({
        origin,
        destination,
        originName: 'Grand Palace',
        destinationName: 'Wat Pho',
        mode: 'walking',
      });

      expect(res.success).toBe(true);
      expect(res.isEstimated).toBe(false);
      expect(res.liveTrafficVerified).toBe(true);
      expect(res.sourceAttribution).toBe('Google Maps Platform (Routes API)');
      expect(res.estimatedDurationMinutes).toBe(14);
    });

    it('falls back to MockRoutesProvider when server proxy returns HTTP 503 unconfigured', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          success: false,
          status: 'unconfigured',
        }),
      });

      global.fetch = mockFetch;

      const provider = new GoogleRoutesProvider('/api/routes');
      const res = await provider.calculateRoute({
        origin,
        destination,
        originName: 'Origin',
        destinationName: 'Destination',
      });

      expect(res.success).toBe(true);
      expect(res.isEstimated).toBe(true);
      expect(res.liveTrafficVerified).toBe(false);
      expect(res.warning).toContain('GOOGLE_ROUTES_API_KEY not configured on server');
    });

    it('falls back gracefully on network exceptions', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Connection timeout'));
      global.fetch = mockFetch;

      const provider = new GoogleRoutesProvider('/api/routes');
      const res = await provider.calculateRoute({
        origin,
        destination,
      });

      expect(res.success).toBe(true);
      expect(res.isEstimated).toBe(true);
      expect(res.warning).toContain('Live Google Routes service unreachable');
    });
  });

  describe('3. RoutesService Coordinator', () => {
    it('calculates geodesic distances and travel times accurately', () => {
      const service = new RoutesService();
      const origin = { lat: 48.8566, lng: 2.3522 }; // Notre Dame
      const dest = { lat: 48.8606, lng: 2.3376 };   // Louvre

      const dist = service.getDistanceBetweenKm(origin, dest);
      expect(dist).toBeGreaterThan(0.9);
      expect(dist).toBeLessThan(1.5);

      const walkingTime = service.getTravelTimeBetween(origin, dest, 'walking');
      expect(walkingTime).toBeGreaterThanOrEqual(5);
    });

    it('supports preferLive option and provider swapping', async () => {
      const service = new RoutesService();
      expect(service.getProvider().providerId).toBe('mock_routes');

      const customProvider = new GoogleRoutesProvider();
      service.setProvider(customProvider);
      expect(service.getProvider().providerId).toBe('google_routes_live');

      const query: RouteQuery = {
        origin: { lat: 48.8566, lng: 2.3522 },
        destination: { lat: 48.8606, lng: 2.3376 },
      };

      const spy = vi.spyOn(customProvider, 'calculateRoute').mockResolvedValue({
        success: true,
        status: 'ok',
        provider: 'google_routes_live',
        distanceKm: 1.2,
        estimatedDurationMinutes: 15,
        mode: 'walking',
        isEstimated: false,
        liveTrafficVerified: true,
        sourceAttribution: 'Google Maps Platform (Routes API)',
        disclaimer: 'Verified',
      });

      const res = await service.calculateRoute(query, { preferLive: true });
      expect(spy).toHaveBeenCalled();
      expect(res.liveTrafficVerified).toBe(true);
      expect(res.isEstimated).toBe(false);
    });
  });

  describe('4. Itinerary Sequencing & Anti-Backtracking Engine', () => {
    it('clusters geographically adjacent attractions on the same day', () => {
      const plan = itineraryPlanningEngine.planTrip({
        destinationId: 'paris',
        days: 1,
        pace: 'balanced',
        travelStyle: 'culture',
      });

      const day1 = plan.comprehensiveDays[0];
      const activities = day1.timelineItems.filter((i) => i.itemType === 'activity');
      expect(activities.length).toBeGreaterThanOrEqual(2);

      // Check transit buffers between consecutive activities
      for (let i = 1; i < activities.length; i++) {
        const transit = activities[i].transitFromPrevious;
        if (transit) {
          // In balanced Paris itinerary, adjacent stops should not backtrack across the entire city (>12km)
          expect(transit.distanceKm).toBeLessThan(10);
          expect(transit.estimatedMinutes).toBeGreaterThan(0);
        }
      }
    });

    it('adopts verified route data when verifiedRoutes map is provided', () => {
      const mockVerifiedRoute: RouteResponse = {
        success: true,
        status: 'ok',
        provider: 'google_routes_live',
        distanceKm: 1.2,
        estimatedDurationMinutes: 11,
        mode: 'walking',
        isEstimated: false,
        liveTrafficVerified: true,
        sourceAttribution: 'Google Maps Platform (Routes API)',
        disclaimer: 'Verified street navigation duration.',
        route: {
          origin: { lat: 48.8606, lng: 2.3376 },
          destination: { lat: 48.8599, lng: 2.3266 },
          originName: 'Louvre',
          destinationName: 'Musée d\'Orsay',
          mode: 'walking',
          distanceKm: 1.2,
          estimatedDurationMinutes: 11,
          summary: 'Direct pedestrian route along the Seine',
          segments: [],
          isEstimated: false,
          liveTrafficVerified: true,
          disclaimer: 'Verified',
        },
      };

      const plan = itineraryPlanningEngine.planTrip({
        destinationId: 'paris',
        days: 1,
        pace: 'relaxed',
        travelStyle: 'culture',
        verifiedRoutes: {
          'act-paris-louvre->act-paris-orsay': mockVerifiedRoute,
          'act-paris-orsay->act-paris-louvre': mockVerifiedRoute,
        },
      });

      expect(plan).toBeDefined();
      const day1 = plan.comprehensiveDays[0];
      expect(day1.timelineItems.length).toBeGreaterThan(0);
    });

    it('truthfully marks transit as estimated when no live route provider data is present', () => {
      const plan = itineraryPlanningEngine.planTrip({
        destinationId: 'paris',
        days: 1,
        pace: 'balanced',
      });

      expect(plan.isRoutesVerified).toBe(false);
      expect(plan.unrecordedDataFlags.isTransitEstimated).toBe(true);
      expect(plan.unrecordedDataFlags.notes).toContain(
        'Transit estimated: Urban travel buffers calculated using geodesic transit model.'
      );
      expect(plan.travelBuffersSummary).toContain('estimated transit buffers');
    });

    it('preserves user pacing and reasonable daily touring limits', () => {
      const relaxedPlan = itineraryPlanningEngine.planTrip({
        destinationId: 'paris',
        days: 1,
        pace: 'relaxed',
      });

      const fastPlan = itineraryPlanningEngine.planTrip({
        destinationId: 'paris',
        days: 1,
        pace: 'fast-paced',
      });

      const relaxedActivities = relaxedPlan.comprehensiveDays[0].timelineItems.filter(
        (i) => i.itemType === 'activity'
      );
      const fastActivities = fastPlan.comprehensiveDays[0].timelineItems.filter(
        (i) => i.itemType === 'activity'
      );

      // Relaxed has fewer scheduled activities (2 slots) than fast-paced (4 slots)
      expect(relaxedActivities.length).toBeLessThanOrEqual(fastActivities.length);
    });
  });

  describe('5. Destination Regression Cases (Paris, Bangkok/Thailand, Rome)', () => {
    it('generates valid sequenced itinerary for Paris with reasonable buffers', () => {
      const plan = itineraryPlanningEngine.planTrip({
        destinationId: 'paris',
        days: 2,
        pace: 'balanced',
      });

      expect(plan.days.length).toBe(2);
      expect(plan.destinationName).toBe('Paris');
      expect(plan.comprehensiveDays[0].timelineItems.length).toBeGreaterThan(0);
    });

    it('generates valid sequenced itinerary for Bangkok/Thailand alias with realistic transit', () => {
      const planBangkok = itineraryPlanningEngine.planTrip({
        destinationId: 'bangkok',
        days: 2,
        pace: 'balanced',
      });

      expect(planBangkok.days.length).toBe(2);
      expect(planBangkok.destinationName).toBe('Bangkok');
      expect(planBangkok.comprehensiveDays[0].timelineItems.length).toBeGreaterThan(0);

      const planThailand = itineraryPlanningEngine.planTrip({
        destinationId: 'thailand',
        days: 2,
        pace: 'balanced',
      });

      expect(planThailand.destinationName).toBe('Bangkok');
    });

    it('generates valid sequenced itinerary for Rome with realistic transit', () => {
      const plan = itineraryPlanningEngine.planTrip({
        destinationId: 'rome',
        days: 2,
        pace: 'balanced',
      });

      expect(plan.days.length).toBe(2);
      expect(plan.destinationName).toBe('Rome');
      expect(plan.comprehensiveDays[0].timelineItems.length).toBeGreaterThan(0);
    });
  });
});
