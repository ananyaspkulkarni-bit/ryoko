import type { DetailedPlace } from '../types/travel/places';
import type { IPlacesProvider, PlacesProviderQuery, PlacesProviderResponse } from '../types/placesProvider';
import { getDetailedPlacesForDestination, isPlaceOpenOnDayOfWeek } from '../data/mock/mockPlaces';
import { activityProviderCoordinator, ActivityProviderCoordinator } from './activityProviderCoordinator';
import { destinationDiscoveryService } from './destinationDiscoveryService';

export interface GetPlacesOptions {
  /**
   * If true, attempts to query the registered external places provider first
   * (e.g. OpenTripMap via server proxy). Falls back to curated mock data if
   * the external provider is unconfigured, rate-limited, or returns no results.
   */
  preferLive?: boolean;
}

export interface IPlacesService {
  getPlaces(destinationId: string, options?: GetPlacesOptions): Promise<DetailedPlace[]>;
  getPlacesSync(destinationId: string): DetailedPlace[];
  isPlaceOpen(place: DetailedPlace, dayOfWeek: number): boolean;
  setPlacesProvider(provider: IPlacesProvider | null): void;
  getPlacesProvider(): IPlacesProvider | null;
}

export class PlacesService implements IPlacesService {
  private coordinator: ActivityProviderCoordinator;

  constructor(coordinator: ActivityProviderCoordinator = activityProviderCoordinator) {
    this.coordinator = coordinator;
  }

  public setPlacesProvider(provider: IPlacesProvider | null): void {
    this.coordinator.setExternalProvider(provider);
  }

  public getPlacesProvider(): IPlacesProvider | null {
    return this.coordinator.getExternalProvider();
  }

  public getPlacesSync(destinationId: string): DetailedPlace[] {
    return getDetailedPlacesForDestination(destinationId);
  }

  public async getPlaces(destinationId: string, options: GetPlacesOptions = {}): Promise<DetailedPlace[]> {
    const curated = getDetailedPlacesForDestination(destinationId);
    const extProvider = this.coordinator.getExternalProvider();
    const resolution = destinationDiscoveryService.resolveDestination(destinationId);
    const dest = resolution.destination;

    // When preferLive is specified or no curated detailed places exist, query external provider
    if (extProvider && (options.preferLive || curated.length === 0)) {
      try {
        const query: PlacesProviderQuery = {
          destinationId,
          destinationName: dest?.name || destinationId,
          country: dest?.country,
          coordinates: dest?.coordinates,
        };
        const res: PlacesProviderResponse = await extProvider.fetchPlaces(query);
        if (res.success && res.activities.length > 0) {
          return res.activities.map((a) => ({
            id: a.id,
            name: a.name,
            destinationId: a.destinationId,
            category: a.category,
            description: a.description || `Verified attraction in ${dest?.name || destinationId}.`,
            coordinates: a.coordinates || dest?.coordinates || { lat: 0, lng: 0 },
            estimatedCostPerPerson: a.estimatedCostPerPerson,
            isAdmissionRecorded: typeof a.estimatedCostPerPerson === 'number',
            estimatedDurationMinutes: a.estimatedDurationMinutes || 120,
            isEstimatedDuration: true,
            tags: a.tags,
            timeOfDay: a.timeOfDay || 'any',
            environment: a.environment || 'both',
            isOpenHoursRecorded: false,
            provenance: a.provenance, // 'verified_provider'
            sourceAttribution: a.sourceAttribution || extProvider.attribution,
            rating: a.rating,
          }));
        }
      } catch (err) {
        console.warn(`External places service fetch exception for '${destinationId}':`, err);
      }
    }

    // Curated mock data fallback with honest provenance ('curated')
    return curated;
  }

  public isPlaceOpen(place: DetailedPlace, dayOfWeek: number): boolean {
    return isPlaceOpenOnDayOfWeek(place, dayOfWeek);
  }
}

export const placesService = new PlacesService();

