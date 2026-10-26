import type { Coordinates } from '../types/destination';
import type {
  IRoutesProvider,
  RouteQuery,
  RouteResponse,
  TransitMode,
  DistanceMatrixQuery,
  DistanceMatrixResponse,
} from '../types/travel/routes';
import { MockRoutesProvider, GoogleRoutesProvider } from './providers/routesProviders';
import { calculateGeodesicDistanceKm, estimateTravelTimeMinutes } from '../data/mock/mockRoutes';

export interface GetRouteOptions {
  /**
   * If true, queries the live Google Routes server proxy (/api/routes) first.
   * Falls back to MockRoutesProvider if unconfigured or unreachable.
   */
  preferLive?: boolean;
}

export interface IRoutesService {
  calculateRoute(query: RouteQuery, options?: GetRouteOptions): Promise<RouteResponse>;
  getTravelTimeBetween(origin: Coordinates, destination: Coordinates, mode?: TransitMode): number;
  getDistanceBetweenKm(origin: Coordinates, destination: Coordinates): number;
  getDistanceMatrix(query: DistanceMatrixQuery): Promise<DistanceMatrixResponse>;
  setProvider(provider: IRoutesProvider): void;
  getProvider(): IRoutesProvider;
}

export class RoutesService implements IRoutesService {
  private provider: IRoutesProvider;
  private liveProvider: IRoutesProvider;

  constructor(provider: IRoutesProvider = new MockRoutesProvider()) {
    this.provider = provider;
    this.liveProvider = new GoogleRoutesProvider();
  }

  public setProvider(provider: IRoutesProvider): void {
    this.provider = provider;
    if (provider.providerId.includes('live')) {
      this.liveProvider = provider;
    }
  }

  public getProvider(): IRoutesProvider {
    return this.provider;
  }

  public async calculateRoute(query: RouteQuery, options: GetRouteOptions = {}): Promise<RouteResponse> {
    if (options.preferLive) {
      try {
        const liveRes = await this.liveProvider.calculateRoute(query);
        return liveRes;
      } catch {
        return this.provider.calculateRoute(query);
      }
    }
    return this.provider.calculateRoute(query);
  }

  public getDistanceBetweenKm(origin: Coordinates, destination: Coordinates): number {
    return calculateGeodesicDistanceKm(origin, destination);
  }

  public getTravelTimeBetween(
    origin: Coordinates,
    destination: Coordinates,
    mode?: TransitMode
  ): number {
    const dist = calculateGeodesicDistanceKm(origin, destination);
    return estimateTravelTimeMinutes(dist, mode);
  }

  public async getDistanceMatrix(query: DistanceMatrixQuery): Promise<DistanceMatrixResponse> {
    return this.provider.getDistanceMatrix(query);
  }
}

export const routesService = new RoutesService();
