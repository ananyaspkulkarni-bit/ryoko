import type { Hotel } from '../types';

export const MOCK_HOTELS: Hotel[] = [
  {
    id: 'hotel-1',
    destinationId: 'tokyo',
    name: 'Park Hyatt Tokyo',
    starRating: 5,
    pricePerNight: 450,
    coordinates: { lat: 35.6856, lng: 139.6911 },
  },
  {
    id: 'hotel-2',
    destinationId: 'kyoto',
    name: 'Hoshinoya Kyoto',
    starRating: 5,
    pricePerNight: 600,
    coordinates: { lat: 35.0125, lng: 135.6778 },
  }
];
