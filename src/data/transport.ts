import type { TransportOption } from '../types';

export const MOCK_TRANSPORT: TransportOption[] = [
  {
    id: 'trans-1',
    fromDestinationId: 'tokyo',
    toDestinationId: 'kyoto',
    mode: 'train',
    durationMinutes: 135,
    cost: 130,
    distanceKm: 450,
  }
];
