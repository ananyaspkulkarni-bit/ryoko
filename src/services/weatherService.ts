import { MOCK_WEATHER } from '../data/mockWeather';
import type { WeatherInfo } from '../data/mockWeather';
import type {
  IWeatherProvider,
  WeatherQuery,
  WeatherResponse,
} from '../types/travel/weather';
import { MockWeatherProvider, OpenWeatherProvider } from './providers/weatherProviders';

export interface GetWeatherOptions {
  /**
   * If true, queries the live OpenWeather server proxy first.
   * Falls back to MockWeatherProvider if unconfigured or unreachable.
   */
  preferLive?: boolean;
}

export interface IWeatherService {
  /**
   * Synchronously returns basic weather for destination (backward compatibility).
   */
  getWeatherForDestination(destinationId: string): WeatherInfo | undefined;

  /**
   * Asynchronously retrieves full multi-day weather forecast with provenance metadata.
   */
  getWeather(query: WeatherQuery, options?: GetWeatherOptions): Promise<WeatherResponse>;

  /**
   * Sets or swaps the active weather provider adapter.
   */
  setProvider(provider: IWeatherProvider): void;

  /**
   * Gets the active weather provider adapter.
   */
  getProvider(): IWeatherProvider;
}

export class WeatherService implements IWeatherService {
  private provider: IWeatherProvider;
  private liveProvider: IWeatherProvider;

  constructor(provider: IWeatherProvider = new MockWeatherProvider()) {
    this.provider = provider;
    this.liveProvider = new OpenWeatherProvider();
  }

  public setProvider(provider: IWeatherProvider): void {
    this.provider = provider;
  }

  public getProvider(): IWeatherProvider {
    return this.provider;
  }

  public getWeatherForDestination(destinationId: string): WeatherInfo | undefined {
    return MOCK_WEATHER[destinationId.toLowerCase()];
  }

  public async getWeather(query: WeatherQuery, options: GetWeatherOptions = {}): Promise<WeatherResponse> {
    if (options.preferLive) {
      try {
        const liveRes = await this.liveProvider.getWeather(query);
        return liveRes;
      } catch {
        return this.provider.getWeather(query);
      }
    }
    return this.provider.getWeather(query);
  }
}

export const weatherService = new WeatherService();

