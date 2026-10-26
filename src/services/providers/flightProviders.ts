import type {
  IFlightProvider,
  FlightSearchQuery,
  FlightSearchResponse,
  FlightOption,
} from '../../types/travel/flights';
import { MOCK_FLIGHTS } from '../../data/mock/mockFlights';

export class MockFlightProvider implements IFlightProvider {
  public readonly providerId = 'mock_flights';
  public readonly attribution = 'Ryoko Simulated Flight Network';

  public async searchFlights(query: FlightSearchQuery): Promise<FlightSearchResponse> {
    const rawDest = (query.destinationCity || query.destinationId || '').trim().toLowerCase();
    const destCity = rawDest === 'thailand' || rawDest === 'th' ? 'bangkok' : rawDest;
    const destAirport = (query.destinationAirport || '').trim().toLowerCase();
    const originAirport = (query.originAirport || '').trim().toLowerCase();

    const matches: FlightOption[] = MOCK_FLIGHTS.filter((f) => {
      let matchDest = true;
      if (destCity || destAirport) {
        const cityMatch = destCity ? f.destinationCity.toLowerCase().includes(destCity) : false;
        const airportMatch = destAirport ? f.destinationAirport.toLowerCase() === destAirport : false;
        matchDest = cityMatch || airportMatch;
      }

      const matchOrigin = originAirport ? f.originAirport.toLowerCase() === originAirport : true;
      const matchCabin = query.cabinClass ? f.cabinClass === query.cabinClass : true;

      return matchDest && matchOrigin && matchCabin;
    });

    return {
      success: true,
      status: matches.length > 0 ? 'ok' : 'empty',
      provider: this.providerId,
      destinationCity: query.destinationCity || destCity,
      flights: matches,
      totalFound: matches.length,
      isMock: true,
      liveFareVerified: false,
      sourceAttribution: this.attribution,
      disclaimer:
        'Development mock flight inventory — indicative schedule & price estimation only. Real booking availability not connected.',
    };
  }
}

/**
 * Adapter skeleton for future integration with real Amadeus / Duffel flight APIs.
 * Connects via server proxy to ensure API secrets are NEVER exposed in client bundles.
 */
export class AmadeusFlightProvider implements IFlightProvider {
  public readonly providerId = 'amadeus_live';
  public readonly attribution = 'Amadeus Global Travel Network';

  private proxyUrl: string;

  constructor(proxyUrl = '/api/flights') {
    this.proxyUrl = proxyUrl;
  }

  public async searchFlights(query: FlightSearchQuery): Promise<FlightSearchResponse> {
    try {
      const params = new URLSearchParams({
        destination: query.destinationCity || query.destinationId || '',
        destinationAirport: query.destinationAirport || '',
        origin: query.originAirport || '',
        date: query.departureDate || '',
        passengers: query.passengers ? String(query.passengers) : '1',
      });
      if (query.cabinClass) {
        params.set('cabinClass', query.cabinClass);
      }

      const response = await fetch(`${this.proxyUrl}?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 503 || response.status === 501 || response.status === 404) {
          try {
            const body = (await response.json()) as FlightSearchResponse;
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
            destinationCity: query.destinationCity,
            flights: [],
            totalFound: 0,
            isMock: false,
            liveFareVerified: false,
            sourceAttribution: this.attribution,
            disclaimer: 'Live Amadeus API credentials not configured in server environment.',
            warning: 'AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET not configured.',
          };
        }
        throw new Error(`Flight proxy returned HTTP ${response.status}`);
      }

      const data = (await response.json()) as FlightSearchResponse;
      return data;
    } catch (err) {
      return {
        success: false,
        status: 'network_error',
        provider: this.providerId,
        destinationCity: query.destinationCity,
        flights: [],
        totalFound: 0,
        isMock: false,
        liveFareVerified: false,
        sourceAttribution: this.attribution,
        disclaimer: 'Live flight service unavailable. Falling back to development mock data.',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

