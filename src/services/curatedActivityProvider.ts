import { DESTINATION_ACTIVITIES } from '../data/activities';
import type { Activity } from '../types';
import type { DiscoveredActivityCandidate } from '../types/discovery';
import type {
  IActivityProvider,
  ActivityProviderQuery,
  ActivityProviderResponse,
} from '../types/placesProvider';

/**
 * Curated Activity Provider.
 *
 * Implements IActivityProvider for Ryoko's authentic in-house activity catalogue.
 * - Produces normalized DiscoveredActivityCandidate objects with stable IDs.
 * - Explicitly marks provenance as 'curated'.
 * - Preserves source attribution as 'Ryoko Curated Catalog'.
 * - Represents unrecorded fields (like exact opening hours) as undefined rather than fabricating values.
 * - Deduplicates activities by ID and normalized name.
 * - Provides clean typed responses for empty data and errors.
 * - Keeps activity data retrieval fully decoupled from itinerary scheduling.
 */
export class CuratedActivityProvider implements IActivityProvider {
  public readonly providerId = 'curated';
  public readonly attribution = 'Ryoko Curated Catalog';

  private activitiesSource: Activity[];

  constructor(customSource: Activity[] = DESTINATION_ACTIVITIES) {
    this.activitiesSource = customSource;
  }

  /**
   * Normalizes a raw curated Activity into a typed DiscoveredActivityCandidate.
   * Unknown/unrecorded fields are strictly preserved as undefined.
   */
  public normalizeActivity(activity: Activity): DiscoveredActivityCandidate | null {
    if (!activity || !activity.id) return null;

    const name = (activity.name || '').trim();
    if (!name) return null;

    return {
      id: activity.id,
      providerPlaceId: activity.id,
      name,
      destinationId: (activity.destinationId || '').trim().toLowerCase(),
      category: activity.category,
      description: activity.description,
      provenance: 'curated',
      coordinates: activity.coordinates
        ? { lat: activity.coordinates.lat, lng: activity.coordinates.lng }
        : undefined,
      estimatedCostPerPerson:
        typeof activity.estimatedCostPerPerson === 'number'
          ? activity.estimatedCostPerPerson
          : undefined,
      estimatedDurationMinutes:
        typeof activity.estimatedDurationMinutes === 'number'
          ? activity.estimatedDurationMinutes
          : undefined,
      tags: activity.tags || [],
      timeOfDay: activity.timeOfDay || 'any',
      environment: activity.environment || 'both',
      // Opening hours are unrecorded in curated dataset; preserve as undefined
      openingHours: undefined,
      sourceAttribution: this.attribution,
    };
  }

  /**
   * Deduplicates candidate activities by ID and normalized name.
   */
  public deduplicateActivities(candidates: DiscoveredActivityCandidate[]): DiscoveredActivityCandidate[] {
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const unique: DiscoveredActivityCandidate[] = [];

    for (const item of candidates) {
      if (seenIds.has(item.id)) continue;

      const normName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normName && seenNames.has(normName)) continue;

      seenIds.add(item.id);
      if (normName) seenNames.add(normName);
      unique.push(item);
    }

    return unique;
  }

  /**
   * Synchronously retrieves normalized curated activities for a destination ID.
   */
  public getCuratedActivitiesSync(destinationId: string): DiscoveredActivityCandidate[] {
    if (!destinationId || !destinationId.trim()) return [];

    const normDestId = destinationId.trim().toLowerCase();
    const rawMatches = this.activitiesSource.filter(
      (act) => (act.destinationId || '').trim().toLowerCase() === normDestId
    );

    const normalized = rawMatches
      .map((act) => this.normalizeActivity(act))
      .filter((act): act is DiscoveredActivityCandidate => act !== null);

    return this.deduplicateActivities(normalized);
  }

  /**
   * Asynchronously fetches activity candidates implementing IActivityProvider / IPlacesProvider.
   */
  public async fetchPlaces(query: ActivityProviderQuery): Promise<ActivityProviderResponse> {
    if (!query || !query.destinationId || !query.destinationId.trim()) {
      return {
        success: false,
        status: 'error',
        provider: this.providerId,
        destinationId: query?.destinationId || '',
        activities: [],
        totalFound: 0,
        sourceAttribution: this.attribution,
        error: 'Invalid query: destinationId is required.',
      };
    }

    const normDestId = query.destinationId.trim().toLowerCase();
    const candidates = this.getCuratedActivitiesSync(normDestId);

    if (candidates.length === 0) {
      return {
        success: true,
        status: 'empty',
        provider: this.providerId,
        destinationId: normDestId,
        activities: [],
        totalFound: 0,
        sourceAttribution: this.attribution,
        warning: `No curated activities catalogued for destination '${normDestId}'.`,
      };
    }

    return {
      success: true,
      status: 'ok',
      provider: this.providerId,
      destinationId: normDestId,
      activities: candidates,
      totalFound: candidates.length,
      sourceAttribution: this.attribution,
    };
  }
}

export const curatedActivityProvider = new CuratedActivityProvider();
