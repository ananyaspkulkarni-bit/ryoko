import { MOCK_DESTINATIONS } from '../data/destinations';
import type { Destination } from '../types';

export interface IDestinationService {
  getAllDestinations(): Destination[];
  getDestinationById(id: string): Destination | undefined;
  searchDestinations(query: string): Destination[];
}

class DestinationService implements IDestinationService {
  getAllDestinations(): Destination[] {
    return MOCK_DESTINATIONS;
  }

  getDestinationById(id: string): Destination | undefined {
    return MOCK_DESTINATIONS.find((d) => d.id === id);
  }

  searchDestinations(query: string): Destination[] {
    if (!query.trim()) return this.getAllDestinations();
    return MOCK_DESTINATIONS.filter((d) =>
      d.name.toLowerCase().includes(query.toLowerCase())
    );
  }
}

export const destinationService = new DestinationService();
