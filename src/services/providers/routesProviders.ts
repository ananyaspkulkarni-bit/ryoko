import type {
  IRoutesProvider,
  RouteQuery,
  RouteResponse,
  DistanceMatrixQuery,
  DistanceMatrixResponse,
} from '../../types/travel/routes';
import {
  calculateGeodesicDistanceKm,
  estimateTravelTimeMinutes,
  generateMockRoute,
  recommendTransitMode,
} from '../../data/mock/mockRoutes';

export class MockRoutesProvider implements IRoutesProvider {
  public readonly providerId = 'mock_routes';
  public readonly attribution = 'Ryoko Geodesic Urban Route Engine';

  public async calculateRoute(query: RouteQuery): Promise<RouteResponse> {
    const route = generateMockRoute(
      query.origin,
      query.destination,
      query.originName,
      query.destinationName,
      query.mode
    );

    return {
      success: true,
      status: 'ok',
      provider: this.providerId,
      route,
      distanceKm: route.distanceKm,
      estimatedDurationMinutes: route.estimatedDurationMinutes,
      mode: route.mode,
      isEstimated: true,
      liveTrafficVerified: false,
      sourceAttribution: this.attribution,
      disclaimer: route.disclaimer,
    };
  }

  public async getDistanceMatrix(query: DistanceMatrixQuery): Promise<DistanceMatrixResponse> {
    const rows = query.origins.map((origin) => {
      const elements = query.destinations.map((dest) => {
        const dist = calculateGeodesicDistanceKm(origin, dest);
        const mode = query.mode || recommendTransitMode(dist);
        const mins = estimateTravelTimeMinutes(dist, mode);
        return {
          distanceKm: dist,
          estimatedDurationMinutes: mins,
          status: 'OK' as const,
        };
      });
      return { elements };
    });

    return {
      success: true,
      provider: this.providerId,
      rows,
      isEstimated: true,
      liveTrafficVerified: false,
      sourceAttribution: this.attribution,
      disclaimer:
        'Development mock distance matrix — straight-line geodesic distance with standard urban transit speed buffers.',
    };
  }
}

/**
 * Adapter skeleton for future integration with Google Routes / Directions API.
 * Connects via server proxy to ensure API secrets are NEVER exposed in client bundles.
 */
export class GoogleRoutesProvider implements IRoutesProvider {
  public readonly providerId = 'google_routes_live';
  public readonly attribution = 'Google Maps Platform (Routes API)';

  private proxyUrl: string;

  constructor(proxyUrl = '/api/routes') {
    this.proxyUrl = proxyUrl;
  }

  public async calculateRoute(query: RouteQuery): Promise<RouteResponse> {
    try {
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        if (response.status === 501 || response.status === 503 || response.status === 404) {
          const mockFallback = new MockRoutesProvider();
          const res = await mockFallback.calculateRoute(query);
          res.warning = 'GOOGLE_ROUTES_API_KEY not configured on server. Fallback transit calculation active.';
          return res;
        }
        throw new Error(`Routes proxy returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success && data.status === 'unconfigured') {
        const mockFallback = new MockRoutesProvider();
        const res = await mockFallback.calculateRoute(query);
        res.warning = 'GOOGLE_ROUTES_API_KEY not configured on server. Fallback transit calculation active.';
        return res;
      }
      return data;
    } catch {
      // Graceful fallback to mock geodesic calculation on network error
      const mockFallback = new MockRoutesProvider();
      const res = await mockFallback.calculateRoute(query);
      res.warning = 'Live Google Routes service unreachable. Fallback geodesic estimate used.';
      return res;
    }
  }

  public async getDistanceMatrix(query: DistanceMatrixQuery): Promise<DistanceMatrixResponse> {
    const mockFallback = new MockRoutesProvider();
    return mockFallback.getDistanceMatrix(query);
  }
}
