import type { Restaurant } from '../types';

export const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: 'rest-1',
    destinationId: 'tokyo',
    name: 'Sukiyabashi Jiro',
    cuisine: 'Sushi',
    priceRange: '$$$$',
    rating: 4.9,
    coordinates: { lat: 35.6719, lng: 139.764 },
  },
  {
    id: 'rest-2',
    destinationId: 'kyoto',
    name: 'Gion Karyo',
    cuisine: 'Kaiseki',
    priceRange: '$$$',
    rating: 4.7,
    coordinates: { lat: 35.0037, lng: 135.7772 },
  }
];
