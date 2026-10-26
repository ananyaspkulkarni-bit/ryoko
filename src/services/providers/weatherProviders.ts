import type {
  IWeatherProvider,
  WeatherQuery,
  WeatherResponse,
} from '../../types/travel/weather';
import { MOCK_WEATHER_RECORDS } from '../../data/mock/mockWeatherForecasts';
import { destinationDiscoveryService } from '../destinationDiscoveryService';

export class MockWeatherProvider implements IWeatherProvider {
  public readonly providerId = 'mock_weather';
  public readonly attribution = 'Ryoko Simulated Climatology Service';

  public async getWeather(query: WeatherQuery): Promise<WeatherResponse> {
    const destId = (query.destinationId || '').trim().toLowerCase();
    const record = MOCK_WEATHER_RECORDS[destId];

    if (record) {
      const days = Math.min(record.forecast.length, Math.max(1, query.days || 5));
      const slicedForecast = record.forecast.slice(0, days);

      return {
        success: true,
        status: 'ok',
        provider: this.providerId,
        destinationId: destId,
        current: record.current,
        forecast: slicedForecast,
        isMock: true,
        liveForecastVerified: false,
        sourceAttribution: this.attribution,
        disclaimer:
          'Development mock forecast — seasonal regional simulation. Live satellite/radar data not connected.',
      };
    }

    // Generic fallback for unlisted destination
    const genericName = query.destinationName || destId;
    return {
      success: true,
      status: 'ok',
      provider: this.providerId,
      destinationId: destId,
      current: {
        destinationId: destId,
        cityName: genericName,
        temperatureC: 22,
        temperatureF: 72,
        feelsLikeC: 22,
        condition: 'partly_cloudy',
        conditionLabel: 'Mild & Moderate',
        humidityPercent: 55,
        windSpeedKmH: 12,
        isMock: true,
        liveForecastVerified: false,
        disclaimer:
          'Development mock forecast — seasonal regional simulation. Live satellite/radar data not connected.',
      },
      forecast: [
        {
          date: '2026-06-01',
          dayOfWeek: 'Monday',
          condition: 'partly_cloudy',
          conditionLabel: 'Pleasant & Mild',
          tempHighC: 24,
          tempLowC: 15,
          tempHighF: 75,
          tempLowF: 59,
          precipitationChancePercent: 15,
          humidityPercent: 55,
          windSpeedKmH: 12,
          isMock: true,
          liveForecastVerified: false,
        },
      ],
      isMock: true,
      liveForecastVerified: false,
      sourceAttribution: this.attribution,
      disclaimer:
        'Development mock forecast — seasonal regional simulation. Live satellite/radar data not connected.',
      warning: `Specific climatological profile unrecorded for '${destId}'. Generic seasonal baseline applied.`,
    };
  }
}

/**
 * Live OpenWeatherMap provider connecting via server-side proxy route (/api/weather).
 * Guarantees API secrets are NEVER bundled or exposed in client JavaScript.
 */
export class OpenWeatherProvider implements IWeatherProvider {
  public readonly providerId = 'openweather_live';
  public readonly attribution = 'OpenWeatherMap Global Service';

  private proxyUrl: string;

  constructor(proxyUrl = '/api/weather') {
    this.proxyUrl = proxyUrl;
  }

  public async getWeather(query: WeatherQuery): Promise<WeatherResponse> {
    try {
      let lat = query.lat;
      let lng = query.lng;
      let destName = query.destinationName;

      if ((lat === undefined || lng === undefined) && query.destinationId) {
        const resolution = destinationDiscoveryService.resolveDestination(query.destinationId);
        if (resolution.destination?.coordinates) {
          lat = resolution.destination.coordinates.lat;
          lng = resolution.destination.coordinates.lng;
          destName = destName || resolution.destination.name;
        }
      }

      const params = new URLSearchParams({
        destinationId: query.destinationId,
        days: String(query.days || 5),
      });

      if (lat !== undefined && lng !== undefined) {
        params.set('lat', String(lat));
        params.set('lng', String(lng));
      }
      if (destName) {
        params.set('destinationName', destName);
      }

      const response = await fetch(`${this.proxyUrl}?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 501 || response.status === 503 || response.status === 404) {
          const fallback = new MockWeatherProvider();
          const res = await fallback.getWeather(query);
          res.warning = 'OPENWEATHER_API_KEY not configured on server. Displaying simulated regional climatology.';
          return res;
        }
        throw new Error(`Weather proxy returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success && data.status === 'unconfigured') {
        const fallback = new MockWeatherProvider();
        const res = await fallback.getWeather(query);
        res.warning = 'OPENWEATHER_API_KEY not configured on server. Displaying simulated regional climatology.';
        return res;
      }
      return data;
    } catch {
      // Graceful fallback to mock forecast on network error
      const fallback = new MockWeatherProvider();
      const res = await fallback.getWeather(query);
      res.warning = 'Live weather service unreachable. Fallback mock forecast active.';
      return res;
    }
  }
}
