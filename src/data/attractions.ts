import type { Attraction } from '../types';

export const MOCK_ATTRACTIONS: Attraction[] = [
  {
    id: 'att-1',
    destinationId: 'tokyo',
    name: 'Senso-ji Temple',
    type: 'Historical Temple',
    description: 'Tokyo’s oldest Buddhist temple located in Asakusa.',
    estimatedDurationHours: 2,
    cost: 0,
    coordinates: { lat: 35.7148, lng: 139.7967 },
  },
  {
    id: 'att-2',
    destinationId: 'kyoto',
    name: 'Fushimi Inari Taisha',
    type: 'Shinto Shrine',
    description: 'Iconic shrine famous for thousands of vermilion torii gates.',
    estimatedDurationHours: 3,
    cost: 0,
    coordinates: { lat: 34.9671, lng: 135.7727 },
  }
];
