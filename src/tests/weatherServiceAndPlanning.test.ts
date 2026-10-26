import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockWeatherProvider, OpenWeatherProvider } from '../services/providers/weatherProviders';
import { WeatherService } from '../services/weatherService';
import { itineraryPlanningEngine } from '../services/itineraryPlanningEngine';
import type { WeatherDayForecast, WeatherResponse } from '../types/travel/weather';
import type { ItineraryPlanRequest } from '../types/travel/planning';

describe('Weather Service & Weather-Aware Itinerary Planning Engine Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. MockWeatherProvider & Provenance Verification', () => {
    it('returns curated climatology for Paris with truthful mock provenance labels', async () => {
      const provider = new MockWeatherProvider();
      const res = await provider.getWeather({ destinationId: 'paris', days: 3 });

      expect(res.success).toBe(true);
      expect(res.status).toBe('ok');
      expect(res.isMock).toBe(true);
      expect(res.liveForecastVerified).toBe(false);
      expect(res.sourceAttribution).toBe('Ryoko Simulated Climatology Service');
      expect(res.disclaimer).toContain('Development mock forecast');
      expect(res.current.destinationId).toBe('paris');
      expect(res.current.cityName).toBe('Paris');
      expect(res.current.isMock).toBe(true);
      expect(res.current.liveForecastVerified).toBe(false);
      expect(res.forecast.length).toBe(3);
      expect(res.forecast[0].isMock).toBe(true);
      expect(res.forecast[0].liveForecastVerified).toBe(false);
    });

    it('returns curated climatology for Bangkok/Thailand alias', async () => {
      const provider = new MockWeatherProvider();
      const resBangkok = await provider.getWeather({ destinationId: 'bangkok', days: 2 });
      expect(resBangkok.success).toBe(true);
      expect(resBangkok.current.cityName).toBe('Bangkok');

      const resThailand = await provider.getWeather({ destinationId: 'thailand', days: 2 });
      expect(resThailand.success).toBe(true);
      expect(resThailand.current.cityName).toBe('Bangkok');
    });

    it('provides graceful baseline simulation for uncataloged destination with warning', async () => {
      const provider = new MockWeatherProvider();
      const res = await provider.getWeather({ destinationId: 'antarctica_base' });

      expect(res.success).toBe(true);
      expect(res.isMock).toBe(true);
      expect(res.liveForecastVerified).toBe(false);
      expect(res.warning).toContain("Specific climatological profile unrecorded for 'antarctica_base'");
      expect(res.current.cityName).toBe('antarctica_base');
    });
  });

  describe('2. OpenWeatherProvider Live Adapter & Graceful Fallback', () => {
    it('resolves coordinates via destination discovery service if lat/lng are omitted', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async (): Promise<WeatherResponse> => ({
          success: true,
          status: 'ok',
          provider: 'openweather_live',
          destinationId: 'bangkok',
          current: {
            destinationId: 'bangkok',
            cityName: 'Bangkok',
            temperatureC: 33,
            temperatureF: 91,
            feelsLikeC: 38,
            condition: 'partly_cloudy',
            conditionLabel: 'Partly Cloudy',
            humidityPercent: 70,
            windSpeedKmH: 12,
            isMock: false,
            liveForecastVerified: true,
            disclaimer: 'Live OpenWeatherMap telemetry.',
          },
          forecast: [],
          isMock: false,
          liveForecastVerified: true,
          sourceAttribution: 'OpenWeatherMap',
          disclaimer: 'Live feed',
        }),
      });

      global.fetch = mockFetch;

      const provider = new OpenWeatherProvider('/api/weather');
      const res = await provider.getWeather({ destinationId: 'bangkok' });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/weather?');
      expect(calledUrl).toContain('destinationId=bangkok');
      // Bangkok coordinates should have been resolved automatically
      expect(calledUrl).toContain('lat=13.7563');
      expect(calledUrl).toContain('lng=100.5018');

      expect(res.isMock).toBe(false);
      expect(res.liveForecastVerified).toBe(true);
    });

    it('falls back to MockWeatherProvider when server proxy returns HTTP 503 unconfigured', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          success: false,
          status: 'unconfigured',
        }),
      });

      global.fetch = mockFetch;

      const provider = new OpenWeatherProvider('/api/weather');
      const res = await provider.getWeather({ destinationId: 'paris', days: 3 });

      expect(res.success).toBe(true);
      expect(res.isMock).toBe(true);
      expect(res.liveForecastVerified).toBe(false);
      expect(res.warning).toContain('OPENWEATHER_API_KEY not configured on server');
      expect(res.current.destinationId).toBe('paris');
      expect(res.forecast.length).toBe(3);
    });

    it('falls back gracefully to MockWeatherProvider on network failure', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
      global.fetch = mockFetch;

      const provider = new OpenWeatherProvider('/api/weather');
      const res = await provider.getWeather({ destinationId: 'rome', days: 2 });

      expect(res.success).toBe(true);
      expect(res.isMock).toBe(true);
      expect(res.warning).toContain('Live weather service unreachable');
      expect(res.current.destinationId).toBe('rome');
    });
  });

  describe('3. WeatherService Coordinator', () => {
    it('provides synchronous legacy lookup for destination backwards compatibility', () => {
      const service = new WeatherService();
      const legacyParis = service.getWeatherForDestination('paris');
      expect(legacyParis).toBeDefined();
      expect(legacyParis?.temperatureC).toBe(19);
      expect(legacyParis?.condition).toBe('cloudy');
    });

    it('allows swapping active weather provider', () => {
      const service = new WeatherService();
      expect(service.getProvider().providerId).toBe('mock_weather');

      const customProvider = new OpenWeatherProvider();
      service.setProvider(customProvider);
      expect(service.getProvider().providerId).toBe('openweather_live');
    });

    it('respects preferLive option and queries live provider', async () => {
      const service = new WeatherService();
      const liveSpy = vi.spyOn(OpenWeatherProvider.prototype, 'getWeather').mockResolvedValue({
        success: true,
        status: 'ok',
        provider: 'openweather_live',
        destinationId: 'paris',
        current: {
          destinationId: 'paris',
          cityName: 'Paris',
          temperatureC: 22,
          temperatureF: 72,
          feelsLikeC: 22,
          condition: 'sunny',
          conditionLabel: 'Clear',
          humidityPercent: 50,
          windSpeedKmH: 10,
          isMock: false,
          liveForecastVerified: true,
          disclaimer: 'Live OpenWeather telemetry.',
        },
        forecast: [],
        isMock: false,
        liveForecastVerified: true,
        sourceAttribution: 'OpenWeatherMap',
        disclaimer: 'Live OpenWeather telemetry.',
      });

      const res = await service.getWeather({ destinationId: 'paris' }, { preferLive: true });
      expect(liveSpy).toHaveBeenCalled();
      expect(res.isMock).toBe(false);
      expect(res.liveForecastVerified).toBe(true);
    });
  });

  describe('4. Weather-Aware Itinerary Planning Engine', () => {
    const rainyForecast: WeatherDayForecast[] = [
      {
        date: '2026-06-01',
        dayOfWeek: 'Monday',
        condition: 'rainy',
        conditionLabel: 'Moderate Rain Showers',
        tempHighC: 17,
        tempLowC: 12,
        tempHighF: 63,
        tempLowF: 54,
        precipitationChancePercent: 85,
        humidityPercent: 90,
        windSpeedKmH: 22,
        isMock: false,
        liveForecastVerified: true,
        advisory: 'Rain expected — indoor cultural venues recommended.',
      },
    ];

    const extremeHeatForecast: WeatherDayForecast[] = [
      {
        date: '2026-06-01',
        dayOfWeek: 'Monday',
        condition: 'sunny',
        conditionLabel: 'Blistering Sun',
        tempHighC: 36,
        tempLowC: 26,
        tempHighF: 97,
        tempLowF: 79,
        precipitationChancePercent: 5,
        humidityPercent: 40,
        windSpeedKmH: 8,
        isMock: false,
        liveForecastVerified: true,
        advisory: 'High heat — schedule indoor or shaded activities.',
      },
    ];

    const pleasantForecast: WeatherDayForecast[] = [
      {
        date: '2026-06-01',
        dayOfWeek: 'Monday',
        condition: 'sunny',
        conditionLabel: 'Pleasant & Mild',
        tempHighC: 22,
        tempLowC: 14,
        tempHighF: 72,
        tempLowF: 57,
        precipitationChancePercent: 10,
        humidityPercent: 48,
        windSpeedKmH: 10,
        isMock: false,
        liveForecastVerified: true,
      },
    ];

    it('adapts itinerary in rainy conditions by prioritizing indoor venues', () => {
      const requestWithRain: ItineraryPlanRequest = {
        destinationId: 'paris',
        days: 1,
        startDate: '2026-06-01',
        weatherForecast: rainyForecast,
        travelStyle: 'culture',
        pace: 'balanced',
      };

      const plan = itineraryPlanningEngine.planTrip(requestWithRain);

      expect(plan.isWeatherAdapted).toBe(true);
      expect(plan.weatherSummary).toContain('Itinerary adapted for Paris forecast');
      expect(plan.unrecordedDataFlags.isWeatherEstimated).toBe(false); // Verified live forecast used!

      const day1 = plan.comprehensiveDays[0];
      expect(day1.isWeatherAdapted).toBe(true);
      expect(day1.weatherAdaptationNote).toContain('Weather-adapted for rain/showers');
      expect(day1.weatherAdaptationNote).toContain('indoor venues and covered attractions prioritized');

      // Check scheduled activities — indoor museums like Louvre or Musée d'Orsay should be preferred over purely outdoor strolls
      const scheduledActivities = day1.timelineItems.filter((item) => item.itemType === 'activity');
      expect(scheduledActivities.length).toBeGreaterThan(0);

      // Verify at least one prominent indoor museum was chosen
      const hasIndoorVenue = scheduledActivities.some(
        (item) => item.activity?.environment === 'indoor' || item.title.toLowerCase().includes('louvre') || item.title.toLowerCase().includes('orsay')
      );
      expect(hasIndoorVenue).toBe(true);
    });

    it('adapts itinerary in extreme heat by prioritizing shaded/indoor daytime visits', () => {
      const requestWithHeat: ItineraryPlanRequest = {
        destinationId: 'cairo',
        days: 1,
        startDate: '2026-06-01',
        weatherForecast: extremeHeatForecast,
        travelStyle: 'culture',
        pace: 'balanced',
      };

      const plan = itineraryPlanningEngine.planTrip(requestWithHeat);

      expect(plan.isWeatherAdapted).toBe(true);
      const day1 = plan.comprehensiveDays[0];
      expect(day1.weatherAdaptationNote).toContain('Weather-adapted for high heat (36°C)');
    });

    it('adapts itinerary in pleasant conditions by prioritizing outdoor landmarks and strolls', () => {
      const requestWithPleasant: ItineraryPlanRequest = {
        destinationId: 'paris',
        days: 1,
        startDate: '2026-06-01',
        weatherForecast: pleasantForecast,
        travelStyle: 'culture',
        pace: 'balanced',
      };

      const plan = itineraryPlanningEngine.planTrip(requestWithPleasant);

      expect(plan.isWeatherAdapted).toBe(true);
      const day1 = plan.comprehensiveDays[0];
      expect(day1.weatherAdaptationNote).toContain('Weather-adapted for clear conditions (22°C)');
    });

    it('does NOT claim weather adaptation when forecast data is offline/omitted', () => {
      const requestNoWeather: ItineraryPlanRequest = {
        destinationId: 'paris',
        days: 1,
        startDate: '2026-06-01',
        // weatherForecast is omitted
      };

      const plan = itineraryPlanningEngine.planTrip(requestNoWeather);

      // Must be truthful!
      expect(plan.isWeatherAdapted).toBe(false);
      expect(plan.weatherSummary).toBe('Weather adaptation unavailable: forecast data offline.');
      expect(plan.unrecordedDataFlags.isWeatherEstimated).toBe(true);
      expect(plan.unrecordedDataFlags.notes).toContain(
        'Weather adaptation unavailable: standard schedule generated without live forecast.'
      );

      const day1 = plan.comprehensiveDays[0];
      expect(day1.isWeatherAdapted).toBe(false);
      expect(day1.weatherAdaptationNote).toBeUndefined();
    });
  });

  describe('5. No Regression in Destination Selection or Normal Planning', () => {
    const destinations = ['paris', 'bangkok', 'thailand', 'rome', 'tokyo', 'cairo'];

    destinations.forEach((destId) => {
      it(`generates valid comprehensive itinerary for ${destId} with meal breaks and travel buffers`, () => {
        const plan = itineraryPlanningEngine.planTrip({
          destinationId: destId,
          days: 2,
          travelers: 2,
          budget: 500,
          pace: 'balanced',
          travelStyle: 'culture',
        });

        expect(plan).toBeDefined();
        expect(plan.days.length).toBe(2);
        expect(plan.comprehensiveDays.length).toBe(2);
        expect(plan.travelBuffersSummary).toContain('balanced pace');

        // Meal break included
        const day1 = plan.comprehensiveDays[0];
        expect(day1.mealBreaks.length).toBeGreaterThan(0);
        expect(day1.mealBreaks[0].mealType).toBe('lunch');
      });
    });

    it('preserves user interests, budget, and travel pace during weather adaptation', () => {
      const plan = itineraryPlanningEngine.planTrip({
        destinationId: 'paris',
        days: 3,
        travelers: 2,
        budget: 600,
        pace: 'relaxed',
        travelStyle: 'foodie',
        interests: ['Art', 'Pastries'],
        weatherForecast: [
          {
            date: '2026-06-01',
            dayOfWeek: 'Monday',
            condition: 'rainy',
            conditionLabel: 'Rain Showers',
            tempHighC: 18,
            tempLowC: 13,
            tempHighF: 64,
            tempLowF: 55,
            precipitationChancePercent: 80,
            humidityPercent: 85,
            windSpeedKmH: 15,
            isMock: false,
            liveForecastVerified: true,
          },
        ],
      });

      expect(plan.pace).toBe('relaxed');
      expect(plan.travelStyle).toBe('foodie');
      expect(plan.allocatedBudget).toBe(600);
      expect(plan.travelersCount).toBe(2);
      expect(plan.totalDays).toBe(3);
    });
  });
});
