import type {
  IHotelProvider,
  HotelSearchQuery,
  HotelSearchResponse,
  HotelOption,
  HotelTier,
} from '../types/travel/hotels';
import { MockHotelProvider, GoogleHotelsProvider } from './providers/hotelProviders';

export interface GetHotelOptions {
  checkInDate?: string;
  checkOutDate?: string;
  days?: number;
  guests?: number;
  rooms?: number;
  tier?: HotelTier;
  maxPricePerNightUsd?: number;
  preferLive?: boolean;
}

export interface IHotelService {
  searchHotels(query: HotelSearchQuery): Promise<HotelSearchResponse>;
  getHotelsForDestination(destinationId: string, tier?: HotelTier): Promise<HotelOption[]>;
  searchHotelsWithFallback(
    destinationId: string,
    options?: GetHotelOptions
  ): Promise<HotelSearchResponse>;
  setProvider(provider: IHotelProvider): void;
  getProvider(): IHotelProvider;
}

export class HotelService implements IHotelService {
  private provider: IHotelProvider;

  constructor(provider: IHotelProvider = new MockHotelProvider()) {
    this.provider = provider;
  }

  public setProvider(provider: IHotelProvider): void {
    this.provider = provider;
  }

  public getProvider(): IHotelProvider {
    return this.provider;
  }

  public async searchHotels(query: HotelSearchQuery): Promise<HotelSearchResponse> {
    return this.provider.searchHotels(query);
  }

  public async searchHotelsWithFallback(
    destinationId: string,
    options: GetHotelOptions = {}
  ): Promise<HotelSearchResponse> {
    const query: HotelSearchQuery = {
      destinationId,
      checkInDate: options.checkInDate,
      checkOutDate: options.checkOutDate,
      days: options.days,
      guests: options.guests,
      rooms: options.rooms,
      tier: options.tier,
      maxPricePerNightUsd: options.maxPricePerNightUsd,
    };

    if (options.preferLive && this.provider.providerId === 'mock_hotels') {
      const liveAdapter = new GoogleHotelsProvider();
      const liveRes = await liveAdapter.searchHotels(query);

      if (liveRes.success && liveRes.hotels.length > 0 && liveRes.liveAvailabilityVerified) {
        return liveRes;
      }

      const fallbackRes = await this.provider.searchHotels(query);
      return {
        ...fallbackRes,
        warning:
          liveRes.warning ||
          'HOTEL_PROVIDER_API_KEY not configured on server. Displaying simulated development accommodations.',
        disclaimer:
          liveRes.disclaimer ||
          'Simulated hotel rates and vacancies displayed. Configure hotel partner credentials on server for live inventory.',
      };
    }

    return this.provider.searchHotels(query);
  }

  public async getHotelsForDestination(
    destinationId: string,
    tier?: HotelTier
  ): Promise<HotelOption[]> {
    const res = await this.provider.searchHotels({
      destinationId,
      tier,
    });
    return res.hotels;
  }
}

export const hotelService = new HotelService();

