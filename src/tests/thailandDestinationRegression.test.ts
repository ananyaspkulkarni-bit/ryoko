import { describe, it, expect } from 'vitest';
import { getDestinationData } from '../data/destinations';
import { destinationSearchService } from '../features/destinations/destinationSearchService';
import { destinationDiscoveryService } from '../services/destinationDiscoveryService';
import { flightService } from '../services/flightService';
import { hotelService } from '../services/hotelService';
import { weatherService } from '../services/weatherService';
import { itineraryPlanningEngine } from '../services/itineraryPlanningEngine';
import { itineraryService } from '../services/itineraryService';
import { hybridPlanningService } from '../services/hybridPlanningService';
import { getDetailedPlacesForDestination } from '../data/mock/mockPlaces';

describe('Thailand Destination Resolution & Regression Suite', () => {
  describe('1. Thailand Recognition and Canonical City Resolution', () => {
    it('resolves "Thailand" string query to Bangkok with verified coordinates and metadata', () => {
      const dest = getDestinationData('Thailand');
      expect(dest.id).toBe('bangkok');
      expect(dest.name).toBe('Bangkok');
      expect(dest.country).toBe('Thailand');
      expect(dest.countryCode).toBe('TH');
      expect(dest.coordinates.lat).toBeCloseTo(13.7563, 2);
      expect(dest.coordinates.lng).toBeCloseTo(100.5018, 2);
      expect(dest.arrivalMessage).toContain('Bangkok');
      expect(dest.arrivalMessage).toContain('Thailand');
    });

    it('resolves "Bangkok" directly to Bangkok, Thailand', () => {
      const dest = getDestinationData('Bangkok');
      expect(dest.id).toBe('bangkok');
      expect(dest.name).toBe('Bangkok');
      expect(dest.country).toBe('Thailand');
    });

    it('resolves country object from globe click to Bangkok, Thailand', () => {
      const dest = getDestinationData({
        id: 'th',
        name: 'Thailand',
        country: 'Thailand',
        countryCode: 'TH',
        coordinates: { lat: 15.87, lng: 100.99 },
      });
      expect(dest.id).toBe('bangkok');
      expect(dest.name).toBe('Bangkok');
      expect(dest.country).toBe('Thailand');
    });

    it('returns Bangkok when searching "Thailand" via destinationSearchService', () => {
      const results = destinationSearchService.search('Thailand');
      expect(results.length).toBeGreaterThan(0);
      const match = results.find((r) => r.country.toLowerCase() === 'thailand');
      expect(match).toBeDefined();
      expect(match!.id).toBe('bangkok');
      expect(match!.name).toBe('Bangkok');
    });

    it('resolves "Thailand" as curated destination in destinationDiscoveryService', () => {
      const resolution = destinationDiscoveryService.resolveDestination('Thailand');
      expect(resolution.status).toBe('curated');
      expect(resolution.destination).toBeDefined();
      expect(resolution.destination!.id).toBe('bangkok');
      expect(resolution.destination!.country).toBe('Thailand');
      expect(resolution.hasVerifiedActivities).toBe(true);
    });
  });

  describe('2. Thailand Never Silently Falls Back to Paris', () => {
    it('strictly separates Thailand from Paris in identity, geography, and content', () => {
      const thailand = getDestinationData('Thailand');
      expect(thailand.id).not.toBe('paris');
      expect(thailand.name).not.toBe('Paris');
      expect(thailand.country).not.toBe('France');
      expect(thailand.landmarkSvgType).not.toBe('paris');
      expect(thailand.description).not.toContain('Eiffel');
      expect(thailand.description).not.toContain('Seine');

      // Coordinates must be Southeast Asia, not Western Europe
      expect(thailand.coordinates.lat).toBeLessThan(20);
      expect(thailand.coordinates.lng).toBeGreaterThan(90);

      // Itinerary checks
      const itineraryTitles = (thailand.itinerary || []).map((i) => i.title).join(' ');
      expect(itineraryTitles).not.toContain('Louvre');
      expect(itineraryTitles).not.toContain('Café de Flore');
      expect(itineraryTitles).toContain('Grand Palace');
    });
  });

  describe('3. Paris and Existing Destinations Preservation', () => {
    it('preserves Paris destination resolution and experience completely', () => {
      const paris = getDestinationData('Paris');
      expect(paris.id).toBe('paris');
      expect(paris.name).toBe('Paris');
      expect(paris.country).toBe('France');
      expect(paris.landmarkSvgType).toBe('paris');

      const france = getDestinationData('France');
      expect(france.id).toBe('paris');
      expect(france.name).toBe('Paris');
      expect(france.country).toBe('France');
    });

    it('preserves Cairo, Tokyo, Mumbai, and Rome resolution', () => {
      const cairo = getDestinationData('Egypt');
      expect(cairo.id).toBe('cairo');

      const tokyo = getDestinationData('Japan');
      expect(tokyo.id).toBe('tokyo');

      const mumbai = getDestinationData('Mumbai');
      expect(mumbai.id).toBe('mumbai');

      const rome = getDestinationData('Rome');
      expect(rome.id).toBe('rome');
    });
  });

  describe('4. Travel Data Services for Bangkok / Thailand', () => {
    it('provides realistic flights for Bangkok / Thailand with honest mock disclaimer', async () => {
      const bkkFlights = await flightService.getFlightsForDestination('Bangkok');
      expect(bkkFlights.length).toBeGreaterThan(0);
      bkkFlights.forEach((flt) => {
        expect(flt.destinationAirport).toBe('BKK');
        expect(flt.isMock).toBe(true);
        expect(flt.liveFareVerified).toBe(false);
        expect(flt.disclaimer).toContain('Development mock flight');
      });

      const thFlights = await flightService.getFlightsForDestination('Thailand');
      expect(thFlights.length).toBeGreaterThan(0);
    });

    it('provides realistic accommodations for Bangkok / Thailand with honest mock disclaimer', async () => {
      const bkkHotels = await hotelService.getHotelsForDestination('bangkok');
      expect(bkkHotels.length).toBeGreaterThan(0);
      bkkHotels.forEach((htl) => {
        expect(htl.destinationId).toBe('bangkok');
        expect(htl.city).toBe('Bangkok');
        expect(htl.country).toBe('Thailand');
        expect(htl.isMock).toBe(true);
        expect(htl.liveAvailabilityVerified).toBe(false);
        expect(htl.disclaimer).toContain('Development mock accommodation');
      });

      const thHotels = await hotelService.getHotelsForDestination('thailand');
      expect(thHotels.length).toBeGreaterThan(0);
    });

    it('provides multi-day tropical weather forecasts for Bangkok / Thailand with mock disclaimer', async () => {
      const weather = await weatherService.getWeather({ destinationId: 'bangkok', days: 5 });
      expect(weather.success).toBe(true);
      expect(weather.current.cityName).toBe('Bangkok');
      expect(weather.current.temperatureC).toBeGreaterThanOrEqual(30);
      expect(weather.isMock).toBe(true);
      expect(weather.liveForecastVerified).toBe(false);
      expect(weather.disclaimer).toContain('Development mock forecast');
      expect(weather.forecast.length).toBe(5);

      const legacyWeather = weatherService.getWeatherForDestination('bangkok');
      expect(legacyWeather).toBeDefined();
      expect(legacyWeather!.temperatureC).toBeGreaterThanOrEqual(30);
    });

    it('retrieves detailed places for Bangkok with verified opening hours', () => {
      const places = getDetailedPlacesForDestination('bangkok');
      expect(places.length).toBeGreaterThanOrEqual(5);

      const grandPalace = places.find((p) => p.name.includes('Grand Palace'));
      expect(grandPalace).toBeDefined();
      expect(grandPalace!.isOpenHoursRecorded).toBe(true);
      expect(grandPalace!.openingHours?.open).toBe('08:30 AM');
      expect(grandPalace!.openingHours?.close).toBe('03:30 PM');

      const chatuchak = places.find((p) => p.name.includes('Chatuchak'));
      expect(chatuchak).toBeDefined();
      expect(chatuchak!.openingHours?.closedDays).toContain(1); // Closed Mondays
    });
  });

  describe('5. Itinerary Planning Engine for Bangkok / Thailand', () => {
    it('generates a comprehensive day-by-day itinerary for Bangkok', () => {
      const plan = itineraryPlanningEngine.planTrip({
        destinationId: 'bangkok',
        days: 2,
        travelers: 2,
        budget: 300,
        travelStyle: 'culture',
        pace: 'balanced',
        startDate: '2026-06-01',
      });

      expect(plan.destinationId).toBe('bangkok');
      expect(plan.destinationName).toBe('Bangkok');
      expect(plan.comprehensiveDays.length).toBe(2);

      // Must contain authentic Bangkok activities
      const allActivities = plan.comprehensiveDays.flatMap((d) => d.timelineItems);
      const activityTitles = allActivities.map((a) => a.title).join(' ');
      expect(activityTitles).toContain('Grand Palace');
      expect(activityTitles).toContain('Wat Arun');

      // Meal breaks must be included
      const meals = allActivities.filter((a) => a.itemType === 'meal');
      expect(meals.length).toBeGreaterThan(0);
    });

    it('plans itinerary via itineraryService for Thailand alias', () => {
      const plan = itineraryService.generateItinerary({
        destinationId: 'thailand',
        days: 1,
        travelers: 1,
        budget: 200,
        travelStyle: 'culture',
      });

      expect(plan.destinationId).toBe('bangkok');
      expect(plan.days.length).toBe(1);
      expect(plan.days[0].items.length).toBeGreaterThan(0);
    });

    it('plans itinerary via hybridPlanningService for Bangkok', async () => {
      const plan = await hybridPlanningService.planTrip({
        destinationId: 'bangkok',
        days: 1,
        travelers: 1,
        budget: 200,
        travelStyle: 'culture',
      });

      expect(plan.destinationId).toBe('bangkok');
      expect(plan.days[0].items.length).toBeGreaterThan(0);
    });
  });

  describe('6. Unsupported Destinations & Safe Fallbacks', () => {
    it('handles fictitious or unknown destinations safely without falling back to Paris', async () => {
      const atlantis = getDestinationData('Atlantis');
      expect(atlantis.name).toBe('Atlantis');
      expect(atlantis.id).toBe('atlantis');
      expect(atlantis.country).not.toBe('France');
      expect(atlantis.landmarkSvgType).toBe('generic');

      // Flights for Atlantis return empty safely
      const flights = await flightService.getFlightsForDestination('Atlantis');
      expect(flights).toEqual([]);

      // Hotels for Atlantis return empty safely
      const hotels = await hotelService.getHotelsForDestination('atlantis');
      expect(hotels).toEqual([]);

      // Itinerary handles missing activity data honestly without synthetic activities
      const plan = itineraryPlanningEngine.planTrip({
        destinationId: 'atlantis',
        days: 1,
        travelers: 1,
        budget: 100,
      });

      expect(plan.hasVerifiedActivities).toBe(false);
      expect(plan.warnings.some((w) => w.includes('No verified local activity data'))).toBe(true);
    });
  });
});
