export interface AanOutfit {
  id: string;
  name: string;
  style: string;
  weatherCondition: string;
  imageUrl?: string;
}

export const MOCK_OUTFITS: AanOutfit[] = [
  {
    id: 'outfit-1',
    name: 'Vintage Traveler Kimono',
    style: 'traditional-editorial',
    weatherCondition: 'pleasant',
  },
  {
    id: 'outfit-2',
    name: 'Cozy Rain Trenchcoat',
    style: 'tactile-cozy',
    weatherCondition: 'rainy',
  }
];
