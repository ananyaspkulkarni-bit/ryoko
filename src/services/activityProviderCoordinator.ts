import { CuratedActivityProvider, curatedActivityProvider } from './curatedActivityProvider';
import { openTripMapProvider } from './openTripMapProvider';
import type {
  IActivityProvider,
  ActivityProviderQuery,
  ActivityProviderResponse,
} from '../types/placesProvider';
import type { DiscoveredActivityCandidate } from '../types/discovery';

/**
 * Activity Provider Coordinator.
 *
 * Coordinates primary curated catalog data and secondary external places providers.
 * - Slices data retrieval cleanly away from itinerary planning and validation.
 * - Prioritizes verified curated activities where available.
 * - Queries secondary/external places providers when destinations lack curated data.
 * - Prevents duplicates across providers.
 * - Handles provider outages, rate limits, and network errors gracefully without crashing the UI.
 */
export class ActivityProviderCoordinator {
  private curatedProvider: CuratedActivityProvider;
  private externalProvider: IActivityProvider | null = null;

  constructor(
    curatedProvider: CuratedActivityProvider = curatedActivityProvider,
    externalProvider: IActivityProvider | null = null
  ) {
    this.curatedProvider = curatedProvider;
    this.externalProvider = externalProvider;
  }

  public setExternalProvider(provider: IActivityProvider | null): void {
    this.externalProvider = provider;
  }

  public getExternalProvider(): IActivityProvider | null {
    return this.externalProvider;
  }

  public getCuratedProvider(): CuratedActivityProvider {
    return this.curatedProvider;
  }

  /**
   * Synchronously returns curated activities for a destination ID.
   */
  public getActivitiesSync(destinationId: string): DiscoveredActivityCandidate[] {
    return this.curatedProvider.getCuratedActivitiesSync(destinationId);
  }

  /**
   * Asynchronously fetches activities through the coordinated provider hierarchy:
   * 1. Checks authentic curated provider first.
   * 2. If curated is empty and an external provider is configured, queries the external provider.
   * 3. On external provider failure or rate limit, falls back gracefully to empty with typed metadata.
   */
  public async fetchActivities(query: ActivityProviderQuery): Promise<ActivityProviderResponse> {
    if (!query || !query.destinationId || !query.destinationId.trim()) {
      return {
        success: false,
        status: 'error',
        provider: 'coordinator',
        destinationId: '',
        activities: [],
        totalFound: 0,
        sourceAttribution: this.curatedProvider.attribution,
        error: 'Invalid query: destinationId is required.',
      };
    }

    // Step 1: Check in-house curated catalogue (primary)
    const curatedRes = await this.curatedProvider.fetchPlaces(query);
    if (curatedRes.success && curatedRes.activities.length > 0) {
      return curatedRes;
    }

    // Step 2: Query external places provider if registered
    if (this.externalProvider) {
      try {
        const extRes = await this.externalProvider.fetchPlaces(query);
        if (extRes.success && extRes.activities.length > 0) {
          return extRes;
        }

        // External provider returned empty or non-fatal warning
        if (extRes.status === 'empty') {
          return extRes;
        }

        // If rate limited or network error, return structured response without throwing
        return {
          success: false,
          status: extRes.status,
          provider: this.externalProvider.providerId,
          destinationId: query.destinationId,
          activities: [],
          totalFound: 0,
          sourceAttribution: this.externalProvider.attribution,
          warning: `External places provider returned status '${extRes.status}'. Curated fallback active.`,
          error: extRes.error,
          rateLimited: extRes.rateLimited,
        };
      } catch (err) {
        console.warn(`External places provider exception for '${query.destinationId}':`, err);
        return {
          success: false,
          status: 'network_error',
          provider: this.externalProvider.providerId,
          destinationId: query.destinationId,
          activities: [],
          totalFound: 0,
          sourceAttribution: this.externalProvider.attribution,
          error: err instanceof Error ? err.message : String(err),
          warning: 'External places provider threw an error. Gracefully falling back to empty catalogue.',
        };
      }
    }

    // Step 3: No external provider registered; return curated empty result
    return curatedRes;
  }
}

export const activityProviderCoordinator = new ActivityProviderCoordinator(
  curatedActivityProvider,
  openTripMapProvider
);
