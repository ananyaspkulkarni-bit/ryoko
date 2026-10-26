import type {
  IHotelProvider,
  HotelSearchQuery,
  HotelSearchResponse,
  HotelOption,
} from '../../types/travel/hotels';
import { MOCK_HOTELS_EXPANDED } from '../../data/mock/mockHotels';

export class MockHotelProvider implements IHotelProvider {
  public readonly providerId = 'mock_hotels';
  public readonly attribution = 'Ryoko Simulated Hospitality Catalog';

  public async searchHotels(query: HotelSearchQuery): Promise<HotelSearchResponse> {
    const rawDest = (query.destinationId || '').trim().toLowerCase();
    const destId = rawDest === 'thailand' || rawDest === 'th' ? 'bangkok' : rawDest;

    let totalNights = 1;
    if (query.days && query.days >= 1) {
      totalNights = query.days;
    } else if (query.checkInDate && query.checkOutDate) {
      const cin = new Date(query.checkInDate);
      const cout = new Date(query.checkOutDate);
      if (!isNaN(cin.getTime()) && !isNaN(cout.getTime()) && cout > cin) {
        totalNights = Math.max(1, Math.round((cout.getTime() - cin.getTime()) / 86400000));
      }
    }
    const guests = Math.max(1, query.guests || 1);

    const matches: HotelOption[] = MOCK_HOTELS_EXPANDED.filter((h) => {
      const matchDest = h.destinationId.toLowerCase() === destId || h.city.toLowerCase() === destId;
      const matchTier = query.tier ? h.tier === query.tier : true;
      const matchBudget = query.maxPricePerNightUsd
        ? h.estimatedPricePerNightUsd <= query.maxPricePerNightUsd
        : true;

      return matchDest && matchTier && matchBudget;
    }).map((h) => ({
      ...h,
      totalNights,
      guests,
      totalStayPriceUsd: h.estimatedPricePerNightUsd * totalNights,
    }));

    return {
      success: true,
      status: matches.length > 0 ? 'ok' : 'empty',
      provider: this.providerId,
      destinationId: destId,
      hotels: matches,
      totalFound: matches.length,
      isMock: true,
      liveAvailabilityVerified: false,
      sourceAttribution: this.attribution,
      disclaimer:
        'Development mock hotel catalog — indicative rates & amenities only. Real-time availability not connected.',
    };
  }
}

/**
 * Adapter skeleton for future integration with Google Hotels / Booking API.
 * Connects via server proxy to ensure API secrets are NEVER exposed in client bundles.
 */
export class GoogleHotelsProvider implements IHotelProvider {
  public readonly providerId = 'google_hotels_live';
  public readonly attribution = 'Google Hotels Partner Network';

  private proxyUrl: string;

  constructor(proxyUrl = '/api/hotels') {
    this.proxyUrl = proxyUrl;
  }

  public async searchHotels(query: HotelSearchQuery): Promise<HotelSearchResponse> {
    try {
      const params = new URLSearchParams({
        destinationId: query.destinationId,
        checkIn: query.checkInDate || '',
        checkOut: query.checkOutDate || '',
        guests: query.guests ? String(query.guests) : '1',
        rooms: query.rooms ? String(query.rooms) : '1',
      });
      if (query.days) params.set('days', String(query.days));
      if (query.tier) params.set('tier', query.tier);
      if (query.maxPricePerNightUsd) params.set('maxPricePerNightUsd', String(query.maxPricePerNightUsd));

      const response = await fetch(`${this.proxyUrl}?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 503 || response.status === 501 || response.status === 404) {
          try {
            const body = (await response.json()) as HotelSearchResponse;
            if (body && typeof body === 'object' && body.status) {
              return body;
            }
          } catch {
            // fallback to default unconfigured response below
          }

          return {
            success: false,
            status: 'unconfigured',
            provider: this.providerId,
            destinationId: query.destinationId,
            hotels: [],
            totalFound: 0,
            isMock: false,
            liveAvailabilityVerified: false,
            sourceAttribution: this.attribution,
            disclaimer: 'Live Hotel API credentials not configured in server environment.',
            warning: 'HOTEL_PROVIDER_API_KEY not configured.',
          };
        }
        throw new Error(`Hotel proxy returned HTTP ${response.status}`);
      }

      const data = (await response.json()) as HotelSearchResponse;
      return data;
    } catch (err) {
      return {
        success: false,
        status: 'network_error',
        provider: this.providerId,
        destinationId: query.destinationId,
        hotels: [],
        totalFound: 0,
        isMock: false,
        liveAvailabilityVerified: false,
        sourceAttribution: this.attribution,
        disclaimer: 'Live hotel service unavailable. Falling back to development mock data.',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

