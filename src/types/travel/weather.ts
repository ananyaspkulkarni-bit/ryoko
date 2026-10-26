export type WeatherCondition =
  | 'sunny'
  | 'partly_cloudy'
  | 'cloudy'
  | 'rainy'
  | 'showers'
  | 'thunderstorm'
  | 'snowy'
  | 'breezy';

export interface WeatherDayForecast {
  date: string;          // YYYY-MM-DD
  dayOfWeek: string;     // e.g. "Monday"
  condition: WeatherCondition;
  conditionLabel: string;// e.g. "Warm & Pleasant"
  tempHighC: number;
  tempLowC: number;
  tempHighF: number;
  tempLowF: number;
  precipitationChancePercent: number;
  humidityPercent: number;
  windSpeedKmH: number;
  advisory?: string;
  isMock: boolean;
  liveForecastVerified: boolean;
}

export interface WeatherCurrentSnapshot {
  destinationId: string;
  cityName: string;
  temperatureC: number;
  temperatureF: number;
  feelsLikeC: number;
  condition: WeatherCondition;
  conditionLabel: string;
  humidityPercent: number;
  windSpeedKmH: number;
  isMock: boolean;
  liveForecastVerified: boolean;
  disclaimer: string;
}

export interface WeatherQuery {
  destinationId: string;
  destinationName?: string;
  lat?: number;
  lng?: number;
  startDate?: string;
  days?: number;
}

export interface WeatherResponse {
  success: boolean;
  status: 'ok' | 'empty' | 'rate_limited' | 'network_error' | 'unconfigured' | 'error';
  provider: string;
  destinationId: string;
  current: WeatherCurrentSnapshot;
  forecast: WeatherDayForecast[];
  isMock: boolean;
  liveForecastVerified: boolean;
  sourceAttribution: string;
  disclaimer: string;
  warning?: string;
  error?: string;
}

export interface IWeatherProvider {
  readonly providerId: string;
  readonly attribution: string;
  getWeather(query: WeatherQuery): Promise<WeatherResponse>;
}
