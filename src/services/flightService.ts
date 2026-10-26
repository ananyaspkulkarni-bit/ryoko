import type {
  IFlightProvider,
  FlightSearchQuery,
  FlightSearchResponse,
  FlightOption,
  CabinClass,
} from '../types/travel/flights';
import { MockFlightProvider, AmadeusFlightProvider } from './providers/flightProviders';

export interface GetFlightOptions {
  originAirport?: string;
  destinationAirport?: string;
  departureDate?: string;
  passengers?: number;
  cabinClass?: CabinClass;
  preferLive?: boolean;
}

export interface IFlightService {
  searchFlights(query: FlightSearchQuery): Promise<FlightSearchResponse>;
  getFlightsForDestination(destinationCity: string, originAirport?: string): Promise<FlightOption[]>;
  searchFlightsWithFallback(
    destinationCity: string,
    options?: GetFlightOptions
  ): Promise<FlightSearchResponse>;
  setProvider(provider: IFlightProvider): void;
  getProvider(): IFlightProvider;
}

export class FlightService implements IFlightService {
  private provider: IFlightProvider;

  constructor(provider: IFlightProvider = new MockFlightProvider()) {
    this.provider = provider;
  }

  public setProvider(provider: IFlightProvider): void {
    this.provider = provider;
  }

  public getProvider(): IFlightProvider {
    return this.provider;
  }

  public async searchFlights(query: FlightSearchQuery): Promise<FlightSearchResponse> {
    return this.provider.searchFlights(query);
  }

  public async searchFlightsWithFallback(
    destinationCity: string,
    options: GetFlightOptions = {}
  ): Promise<FlightSearchResponse> {
    const query: FlightSearchQuery = {
      destinationCity,
      originAirport: options.originAirport,
      destinationAirport: options.destinationAirport,
      departureDate: options.departureDate,
      passengers: options.passengers,
      cabinClass: options.cabinClass,
    };

    if (options.preferLive && this.provider.providerId === 'mock_flights') {
      const liveAdapter = new AmadeusFlightProvider();
      const liveRes = await liveAdapter.searchFlights(query);

      if (liveRes.success && liveRes.flights.length > 0 && liveRes.liveFareVerified) {
        return liveRes;
      }

      const fallbackRes = await this.provider.searchFlights(query);
      return {
        ...fallbackRes,
        warning:
          liveRes.warning ||
          'AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET not configured on server. Displaying simulated development flights.',
        disclaimer:
          liveRes.disclaimer ||
          'Simulated flight schedules displayed. Configure Amadeus credentials on server for live airline fares.',
      };
    }

    return this.provider.searchFlights(query);
  }

  public async getFlightsForDestination(
    destinationCity: string,
    originAirport?: string
  ): Promise<FlightOption[]> {
    const res = await this.provider.searchFlights({
      destinationCity,
      originAirport,
    });
    return res.flights;
  }
}

export const flightService = new FlightService();

