export interface WeatherInfo {
  destinationId: string;
  temperatureC: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  humidityPercent: number;
  windSpeedKmH: number;
}

export const MOCK_WEATHER: Record<string, WeatherInfo> = {
  tokyo: {
    destinationId: 'tokyo',
    temperatureC: 22,
    condition: 'sunny',
    humidityPercent: 55,
    windSpeedKmH: 12,
  },
  kyoto: {
    destinationId: 'kyoto',
    temperatureC: 19,
    condition: 'cloudy',
    humidityPercent: 60,
    windSpeedKmH: 8,
  },
  paris: {
    destinationId: 'paris',
    temperatureC: 19,
    condition: 'cloudy',
    humidityPercent: 58,
    windSpeedKmH: 14,
  },
  cairo: {
    destinationId: 'cairo',
    temperatureC: 31,
    condition: 'sunny',
    humidityPercent: 28,
    windSpeedKmH: 16,
  },
  mumbai: {
    destinationId: 'mumbai',
    temperatureC: 30,
    condition: 'cloudy',
    humidityPercent: 74,
    windSpeedKmH: 18,
  },
  rome: {
    destinationId: 'rome',
    temperatureC: 24,
    condition: 'sunny',
    humidityPercent: 48,
    windSpeedKmH: 10,
  },
  bangkok: {
    destinationId: 'bangkok',
    temperatureC: 32,
    condition: 'cloudy',
    humidityPercent: 72,
    windSpeedKmH: 12,
  },
  thailand: {
    destinationId: 'thailand',
    temperatureC: 32,
    condition: 'cloudy',
    humidityPercent: 72,
    windSpeedKmH: 12,
  },
};
