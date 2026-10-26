import { MOCK_DESTINATIONS } from '../data/destinations';
import { WORLD_COUNTRIES } from '../data/countriesGeo';
import {
  findCityByNameOrAlias,
  cityToDestination,
  searchWorldCities,
} from '../data/worldCities';
import type { Destination } from '../types/destination';
import type {
  DestinationResolutionResult,
  DiscoveredActivityCandidate,
  IDestinationDiscoveryService,
} from '../types/discovery';
import type { IPlacesProvider } from '../types/placesProvider';
import { ActivityProviderCoordinator, activityProviderCoordinator } from './activityProviderCoordinator';

export class DestinationDiscoveryService implements IDestinationDiscoveryService {
  private coordinator: ActivityProviderCoordinator;

  constructor(
    placesProvider?: IPlacesProvider | null,
    coordinator?: ActivityProviderCoordinator
  ) {
    this.coordinator = coordinator || (placesProvider ? new ActivityProviderCoordinator(undefined, placesProvider) : activityProviderCoordinator);
    if (placesProvider && !coordinator) {
      this.coordinator.setExternalProvider(placesProvider);
    }
  }

  /**
   * Sets or clears the active external places provider.
   */
  public setPlacesProvider(provider: IPlacesProvider | null): void {
    this.coordinator.setExternalProvider(provider);
  }

  /**
   * Returns the currently configured places provider, if any.
   */
  public getPlacesProvider(): IPlacesProvider | null {
    return this.coordinator.getExternalProvider();
  }

  /**
   * Returns all curated destinations in Ryoko's catalog.
   */
  public getCuratedDestinations(): Destination[] {
    return MOCK_DESTINATIONS;
  }

  /**
   * Determines if a destination ID corresponds to an authentic, curated Ryoko destination.
   */
  public isCuratedDestination(destinationId: string): boolean {
    if (!destinationId) return false;
    const lower = destinationId.trim().toLowerCase();
    return MOCK_DESTINATIONS.some(
      (d) =>
        d.id.toLowerCase() === lower ||
        d.name.toLowerCase() === lower ||
        (d.primaryCity && d.primaryCity.toLowerCase() === lower) ||
        d.country.toLowerCase() === lower
    );
  }

  /**
   * Resolves a destination query or object into a typed DestinationResolutionResult:
   * - 'curated': Matches a curated destination with verified attractions and activities.
   * - 'resolved': Verified geographic city or country entity from catalogs, ready for places provider.
   * - 'ambiguous': Multiple distinct candidate destinations match the query.
   * - 'unresolved': Query could not be verified against any known geographical or curated record.
   */
  public resolveDestination(queryInput: string | Destination | null | undefined): DestinationResolutionResult {
    // 1. Null / Undefined defaults to curated Paris
    if (!queryInput) {
      const defaultParis = MOCK_DESTINATIONS[0];
      return {
        status: 'curated',
        query: '',
        destination: defaultParis,
        hasVerifiedActivities: true,
        provenance: 'curated',
        message: 'Resolved default curated destination: Paris.',
      };
    }

    // 2. Object resolution (e.g. from globe click or internal state)
    if (typeof queryInput === 'object') {
      const searchKey = (queryInput.id || queryInput.name || queryInput.primaryCity || queryInput.country || '').trim().toLowerCase();
      
      const curatedMatch = MOCK_DESTINATIONS.find(
        (d) =>
          d.id.toLowerCase() === searchKey ||
          d.name.toLowerCase() === searchKey ||
          (d.primaryCity && d.primaryCity.toLowerCase() === searchKey) ||
          d.country.toLowerCase() === searchKey ||
          (queryInput.countryCode && d.countryCode && d.countryCode.toLowerCase() === queryInput.countryCode.toLowerCase())
      );

      if (curatedMatch) {
        return {
          status: 'curated',
          query: curatedMatch.name,
          destination: curatedMatch,
          hasVerifiedActivities: true,
          provenance: 'curated',
          message: `Resolved curated destination: ${curatedMatch.name}, ${curatedMatch.country}.`,
        };
      }

      // Check if matches a verified world city
      const cityMatch = findCityByNameOrAlias(searchKey);
      if (cityMatch) {
        return {
          status: 'resolved',
          query: cityMatch.name,
          destination: cityToDestination(cityMatch),
          hasVerifiedActivities: false,
          provenance: 'city_catalog',
          message: `Resolved city "${cityMatch.name}, ${cityMatch.country}" from verified world cities catalog. Local activities can be discovered via places provider.`,
        };
      }

      // Check if matches a real country in WORLD_COUNTRIES
      const countryMatch = WORLD_COUNTRIES.find(
        (c) =>
          c.id.toLowerCase() === searchKey ||
          c.name.toLowerCase() === searchKey ||
          (queryInput.country && c.name.toLowerCase() === queryInput.country.toLowerCase())
      );

      if (countryMatch) {
        const resolvedCountry: Destination = {
          id: countryMatch.id.toLowerCase(),
          name: countryMatch.name,
          country: countryMatch.name,
          countryCode: countryMatch.id,
          region: countryMatch.continent,
          coordinates: { lat: countryMatch.lat, lng: countryMatch.lng },
          description: `Country in ${countryMatch.continent} with verified boundary data.`,
          category: 'cultural',
          tags: [countryMatch.name.toLowerCase(), countryMatch.continent.toLowerCase()],
          rating: 4.8,
          subtitle: `Explore ${countryMatch.name}`,
          arrivalMessage: `Welcome to ${countryMatch.name}.`,
          landmarkSvgType: 'generic',
        };

        return {
          status: 'resolved',
          query: countryMatch.name,
          destination: resolvedCountry,
          hasVerifiedActivities: false,
          provenance: 'country_geo',
          message: `Resolved country "${countryMatch.name}" from verified world geographic boundary data. City-level activities are not yet curated.`,
        };
      }

      // Unresolved object
      return {
        status: 'unresolved',
        query: queryInput.name || queryInput.id || 'Unknown',
        hasVerifiedActivities: false,
        provenance: 'none',
        message: `Destination "${queryInput.name || queryInput.id}" is unverified and has no verified geographic or activity data.`,
      };
    }

    // 3. String query resolution
    const raw = queryInput.trim();
    const search = raw.toLowerCase();

    if (!search) {
      const defaultParis = MOCK_DESTINATIONS[0];
      return {
        status: 'curated',
        query: '',
        destination: defaultParis,
        hasVerifiedActivities: true,
        provenance: 'curated',
        message: 'Resolved default curated destination: Paris.',
      };
    }

    // A. Check for EXACT match in MOCK_DESTINATIONS (takes precedence)
    const exactCurated = MOCK_DESTINATIONS.find(
      (d) =>
        d.id.toLowerCase() === search ||
        d.name.toLowerCase() === search ||
        (d.primaryCity && d.primaryCity.toLowerCase() === search) ||
        d.country.toLowerCase() === search ||
        (d.countryCode && d.countryCode.toLowerCase() === search)
    );

    if (exactCurated) {
      return {
        status: 'curated',
        query: raw,
        destination: exactCurated,
        hasVerifiedActivities: true,
        provenance: 'curated',
        message: `Resolved curated destination: ${exactCurated.name}, ${exactCurated.country}.`,
      };
    }

    // B. Check for EXACT match in WORLD_CITIES (takes precedence over country search)
    const exactCity = findCityByNameOrAlias(search);
    if (exactCity) {
      const existingCurated = MOCK_DESTINATIONS.find(
        (d) => d.id.toLowerCase() === exactCity.id.toLowerCase() || d.name.toLowerCase() === exactCity.name.toLowerCase()
      );
      if (existingCurated) {
        return {
          status: 'curated',
          query: raw,
          destination: existingCurated,
          hasVerifiedActivities: true,
          provenance: 'curated',
          message: `Resolved curated destination: ${existingCurated.name}, ${existingCurated.country}.`,
        };
      }

      return {
        status: 'resolved',
        query: raw,
        destination: cityToDestination(exactCity),
        hasVerifiedActivities: false,
        provenance: 'city_catalog',
        message: `Resolved city "${exactCity.name}, ${exactCity.country}" from verified world cities catalog. Local activities can be discovered via places provider.`,
      };
    }

    // C. Check for EXACT match in WORLD_COUNTRIES (takes precedence over partial ambiguity)
    const exactCountry = WORLD_COUNTRIES.find(
      (c) => c.name.toLowerCase() === search || c.id.toLowerCase() === search
    );

    if (exactCountry) {
      const resolvedCountry: Destination = {
        id: exactCountry.id.toLowerCase(),
        name: exactCountry.name,
        country: exactCountry.name,
        countryCode: exactCountry.id,
        region: exactCountry.continent,
        coordinates: { lat: exactCountry.lat, lng: exactCountry.lng },
        description: `Country in ${exactCountry.continent} with verified boundary data.`,
        category: 'cultural',
        tags: [exactCountry.name.toLowerCase(), exactCountry.continent.toLowerCase()],
        rating: 4.8,
        subtitle: `Explore ${exactCountry.name}`,
        arrivalMessage: `Welcome to ${exactCountry.name}.`,
        landmarkSvgType: 'generic',
      };

      return {
        status: 'resolved',
        query: raw,
        destination: resolvedCountry,
        hasVerifiedActivities: false,
        provenance: 'country_geo',
        message: `Resolved country "${exactCountry.name}" from verified world geographic boundary data. City-level activities are not yet curated.`,
      };
    }

    // D. Check for AMBIGUITY (multiple partial matches across curated, world cities, and world country catalogs)
    if (search.length >= 2) {
      const matchingCurated = MOCK_DESTINATIONS.filter(
        (d) =>
          d.name.toLowerCase().includes(search) ||
          d.country.toLowerCase().includes(search) ||
          (d.primaryCity && d.primaryCity.toLowerCase().includes(search))
      );

      const matchingCities = searchWorldCities(search).filter(
        (c) =>
          !matchingCurated.some(
            (m) => m.id.toLowerCase() === c.id.toLowerCase() || m.name.toLowerCase() === c.name.toLowerCase()
          )
      );

      const matchingCountries = WORLD_COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search) &&
          !matchingCurated.some((m) => m.country.toLowerCase() === c.name.toLowerCase()) &&
          !matchingCities.some((mc) => mc.country.toLowerCase() === c.name.toLowerCase())
      );

      const totalMatchesCount = matchingCurated.length + matchingCities.length + matchingCountries.length;

      if (totalMatchesCount > 1) {
        const candidates: Destination[] = [
          ...matchingCurated,
          ...matchingCities.map((c) => cityToDestination(c)),
          ...matchingCountries.map((c) => ({
            id: c.id.toLowerCase(),
            name: c.name,
            country: c.name,
            countryCode: c.id,
            region: c.continent,
            coordinates: { lat: c.lat, lng: c.lng },
            description: `Country in ${c.continent}.`,
            category: 'cultural' as const,
            tags: [c.name.toLowerCase()],
            rating: 4.8,
            landmarkSvgType: 'generic' as const,
          })),
        ];

        return {
          status: 'ambiguous',
          query: raw,
          candidates,
          hasVerifiedActivities: false,
          provenance: 'none',
          message: `Multiple destinations matched "${raw}". Please clarify your selection.`,
        };
      }

      // Single partial match
      if (matchingCurated.length === 1) {
        return {
          status: 'curated',
          query: raw,
          destination: matchingCurated[0],
          hasVerifiedActivities: true,
          provenance: 'curated',
          message: `Resolved curated destination: ${matchingCurated[0].name}, ${matchingCurated[0].country}.`,
        };
      }

      if (matchingCities.length === 1) {
        const city = matchingCities[0];
        return {
          status: 'resolved',
          query: raw,
          destination: cityToDestination(city),
          hasVerifiedActivities: false,
          provenance: 'city_catalog',
          message: `Resolved city "${city.name}, ${city.country}" from verified world cities catalog. Local activities can be discovered via places provider.`,
        };
      }

      if (matchingCountries.length === 1) {
        const c = matchingCountries[0];
        const dest: Destination = {
          id: c.id.toLowerCase(),
          name: c.name,
          country: c.name,
          countryCode: c.id,
          region: c.continent,
          coordinates: { lat: c.lat, lng: c.lng },
          description: `Country in ${c.continent}.`,
          category: 'cultural',
          tags: [c.name.toLowerCase()],
          rating: 4.8,
          landmarkSvgType: 'generic',
        };
        return {
          status: 'resolved',
          query: raw,
          destination: dest,
          hasVerifiedActivities: false,
          provenance: 'country_geo',
          message: `Resolved country "${c.name}" from verified world geographic boundary data. City-level activities are not yet curated.`,
        };
      }
    }

    // D. Unresolved / Unknown Destination (e.g. "Atlantis", "FakePlaceXYZ")
    return {
      status: 'unresolved',
      query: raw,
      hasVerifiedActivities: false,
      provenance: 'none',
      message: `No verified geographical or tourist data found for "${raw}". Ryoko does not generate fabricated places.`,
    };
  }

  /**
   * Retrieves factual activity candidates for a destination ID.
   * Only returns activities with authentic provenance ('curated').
   * Returns an empty array if activities are not verified, never fabricating fake activities.
   */
  public getActivityCandidates(destinationId: string): DiscoveredActivityCandidate[] {
    return this.coordinator.getActivitiesSync(destinationId);
  }

  /**
   * Asynchronously fetches activity candidates through the ActivityProviderCoordinator.
   * - Curated catalog takes precedence for curated destinations.
   * - Queries external places provider if configured and available for uncurated or extended destinations.
   * - Preserves curated activities as fallback on provider failure, empty response, or rate limits.
   * - Never fabricates fake activities for unverified destinations.
   */
  public async fetchActivityCandidates(destinationId: string): Promise<DiscoveredActivityCandidate[]> {
    if (!destinationId) return [];

    const resolution = this.resolveDestination(destinationId);
    const queryName = resolution.destination?.name || destinationId;
    const coords = resolution.destination?.coordinates;

    const response = await this.coordinator.fetchActivities({
      destinationId,
      destinationName: queryName,
      country: resolution.destination?.country,
      coordinates: coords,
    });

    return response.activities;
  }
}

export const destinationDiscoveryService = new DestinationDiscoveryService();
