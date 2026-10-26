import { MOCK_DESTINATIONS } from '../../data/destinations';
import { WORLD_COUNTRIES } from '../../data/countriesGeo';
import { searchWorldCities, cityToDestination } from '../../data/worldCities';
import { Trie } from '../../ds/Trie';
import type { Destination } from '../../types';

export interface IDestinationSearchService {
  search(query: string): Destination[];
  getDestinationById(id: string): Destination | undefined;
  getAllDestinations(): Destination[];
}

export class DestinationSearchService implements IDestinationSearchService {
  private trieScaffold: Trie;

  constructor() {
    this.trieScaffold = new Trie();
    this.indexDestinations();
  }

  private indexDestinations() {
    // Scaffold index for future Trie search implementation
    MOCK_DESTINATIONS.forEach((d) => {
      this.trieScaffold.insert(d.name, d);
      if (d.primaryCity && d.primaryCity !== d.name) {
        this.trieScaffold.insert(d.primaryCity, d);
      }
      if (d.country && d.country !== d.name) {
        this.trieScaffold.insert(d.country, d);
      }
    });
  }

  search(query: string): Destination[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    
    // Curated matches take priority
    const curatedMatches = MOCK_DESTINATIONS.filter(
      (d) =>
        d.name.toLowerCase().includes(trimmed) ||
        (d.primaryCity && d.primaryCity.toLowerCase().includes(trimmed)) ||
        d.country.toLowerCase().includes(trimmed) ||
        d.tags.some((t) => t.toLowerCase().includes(trimmed))
    );

    // Also include verified world cities if not already covered
    const cityMatches: Destination[] = [];
    searchWorldCities(trimmed).forEach((c) => {
      if (
        !curatedMatches.some(
          (m) => m.id.toLowerCase() === c.id.toLowerCase() || m.name.toLowerCase() === c.name.toLowerCase()
        )
      ) {
        cityMatches.push(cityToDestination(c));
      }
    });

    // Also include genuine world countries if not already covered
    const countryMatches: Destination[] = [];
    WORLD_COUNTRIES.forEach((c) => {
      if (
        (c.name.toLowerCase().includes(trimmed) || c.id.toLowerCase().includes(trimmed)) &&
        !curatedMatches.some((m) => m.country.toLowerCase() === c.name.toLowerCase()) &&
        !cityMatches.some((cm) => cm.country.toLowerCase() === c.name.toLowerCase())
      ) {
        countryMatches.push({
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
        });
      }
    });

    return [...curatedMatches, ...cityMatches, ...countryMatches];
  }

  getDestinationById(id: string): Destination | undefined {
    return MOCK_DESTINATIONS.find((d) => d.id === id);
  }

  getAllDestinations(): Destination[] {
    return MOCK_DESTINATIONS;
  }
}

export const destinationSearchService = new DestinationSearchService();
