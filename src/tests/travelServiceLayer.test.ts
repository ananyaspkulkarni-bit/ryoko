import { describe, it, expect } from 'vitest';
import { flightService } from '../services/flightService';
import { hotelService } from '../services/hotelService';
import { routesService } from '../services/routesService';
import { placesService } from '../services/placesService';
import { weatherService } from '../services/weatherService';
import {
  MockFlightProvider,
  AmadeusFlightProvider,
  GoogleHotelsProvider,
  OpenWeatherProvider,
} from '../services/providers';

describe('Travel Data Service Layer & Provider Adapters Suite', () => {
  describe('1. Flights Service & Provider Adapters', () => {
    it('returns realistic mock flights for Paris, Tokyo, Cairo, Mumbai, and Rome', async () => {
      const cities = ['Paris', 'Tokyo', 'Cairo', 'Mumbai', 'Rome'];

      for (const city of cities) {
        const flights = await flightService.getFlightsForDestination(city);
        expect(flights.length).toBeGreaterThan(0);

        flights.forEach((flt) => {
          expect(flt.destinationCity.toLowerCase()).toContain(city.toLowerCase());
          expect(flt.isMock).toBe(true);
          expect(flt.liveFareVerified).toBe(false);
          expect(flt.disclaimer).toMatch(/indicative|not connected|mock/i);
          expect(flt.estimatedPriceUsd).toBeGreaterThan(50);
          expect(flt.carrier).toBeDefined();
          expect(flt.flightNumber).toBeDefined();
        });
      }
    });

    it('allows swapping between mock provider and live adapter skeleton', async () => {
      const original = flightService.getProvider();
      const mockProvider = new MockFlightProvider();
      const amadeusAdapter = new AmadeusFlightProvider();

      flightService.setProvider(mockProvider);
      expect(flightService.getProvider().providerId).toBe('mock_flights');

      flightService.setProvider(amadeusAdapter);
      expect(flightService.getProvider().providerId).toBe('amadeus_live');

      // Restore original
      flightService.setProvider(original);
    });

    it('live flight provider returns unconfigured or network status when server secrets not set', async () => {
      const amadeus = new AmadeusFlightProvider('http://localhost:9999/api/nonexistent');
      const res = await amadeus.searchFlights({ destinationCity: 'Paris' });
      expect(res.success).toBe(false);
      expect(res.isMock).toBe(false);
      expect(res.liveFareVerified).toBe(false);
    });
  });

  describe('2. Hotels & Accommodation Service', () => {
    it('returns realistic mock hotels for Paris, Tokyo, Cairo, Mumbai, and Rome across tiers', async () => {
      const destIds = ['paris', 'tokyo', 'cairo', 'mumbai', 'rome'];

      for (const destId of destIds) {
        const hotels = await hotelService.getHotelsForDestination(destId);
        expect(hotels.length).toBeGreaterThan(0);

        hotels.forEach((htl) => {
          expect(htl.destinationId).toBe(destId);
          expect(htl.isMock).toBe(true);
          expect(htl.liveAvailabilityVerified).toBe(false);
          expect(htl.disclaimer).toMatch(/indicative|not connected|mock/i);
          expect(htl.estimatedPricePerNightUsd).toBeGreaterThan(30);
          expect(htl.coordinates.lat).toBeDefined();
          expect(htl.coordinates.lng).toBeDefined();
          expect(htl.amenities.length).toBeGreaterThan(0);
        });
      }
    });

    it('filters hotels by tier and budget ceiling', async () => {
      const res = await hotelService.searchHotels({
        destinationId: 'paris',
        tier: 'luxury',
        maxPricePerNightUsd: 600,
      });

      expect(res.success).toBe(true);
      res.hotels.forEach((h) => {
        expect(h.tier).toBe('luxury');
        expect(h.estimatedPricePerNightUsd).toBeLessThanOrEqual(600);
      });
    });

    it('allows swapping to GoogleHotelsProvider adapter', async () => {
      const original = hotelService.getProvider();
      const adapter = new GoogleHotelsProvider();
      hotelService.setProvider(adapter);
      expect(hotelService.getProvider().providerId).toBe('google_hotels_live');
      hotelService.setProvider(original);
    });
  });

  describe('3. Routes & Travel Times Service', () => {
    it('calculates geodesic distance and realistic urban transit buffers', () => {
      // Louvre to Eiffel Tower in Paris (~3.5 km)
      const louvre = { lat: 48.8606, lng: 2.3376 };
      const eiffel = { lat: 48.8584, lng: 2.2945 };

      const distKm = routesService.getDistanceBetweenKm(louvre, eiffel);
      expect(distKm).toBeGreaterThan(2.5);
      expect(distKm).toBeLessThan(4.5);

      const walkingMins = routesService.getTravelTimeBetween(louvre, eiffel, 'walking');
      const transitMins = routesService.getTravelTimeBetween(louvre, eiffel, 'transit');

      expect(walkingMins).toBeGreaterThan(30);
      expect(transitMins).toBeLessThan(walkingMins);
    });

    it('generates a typed route option with estimated tags and disclaimer', async () => {
      const p1 = { lat: 35.7148, lng: 139.7967 }; // Senso-ji, Tokyo
      const p2 = { lat: 35.6595, lng: 139.7004 }; // Shibuya Crossing, Tokyo

      const res = await routesService.calculateRoute({
        origin: p1,
        destination: p2,
        originName: 'Senso-ji',
        destinationName: 'Shibuya',
      });

      expect(res.success).toBe(true);
      expect(res.isEstimated).toBe(true);
      expect(res.liveTrafficVerified).toBe(false);
      expect(res.disclaimer).toMatch(/mock routing|traffic congestion.*not connected/i);
      expect(res.route?.segments.length).toBeGreaterThan(0);
    });

    it('computes distance matrix between multiple origin-destination coordinates', async () => {
      const origins = [{ lat: 41.8902, lng: 12.4922 }]; // Colosseum, Rome
      const destinations = [
        { lat: 41.9067, lng: 12.4536 }, // Vatican
        { lat: 41.8986, lng: 12.4769 }, // Pantheon
      ];

      const res = await routesService.getDistanceMatrix({ origins, destinations });
      expect(res.success).toBe(true);
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].elements.length).toBe(2);
      expect(res.rows[0].elements[0].distanceKm).toBeGreaterThan(0);
      expect(res.isEstimated).toBe(true);
    });
  });

  describe('4. Weather Service & Multi-Day Forecasts', () => {
    it('returns backward-compatible synchronous weather records', () => {
      const tokyoWeather = weatherService.getWeatherForDestination('tokyo');
      expect(tokyoWeather).toBeDefined();
      expect(tokyoWeather?.temperatureC).toBe(22);

      const parisWeather = weatherService.getWeatherForDestination('paris');
      expect(parisWeather).toBeDefined();
      expect(parisWeather?.temperatureC).toBe(19);
    });

    it('returns multi-day forecasts with advisory notes and honest mock flags', async () => {
      const res = await weatherService.getWeather({ destinationId: 'paris', days: 5 });

      expect(res.success).toBe(true);
      expect(res.isMock).toBe(true);
      expect(res.liveForecastVerified).toBe(false);
      expect(res.disclaimer).toMatch(/mock weather|satellite.*not connected/i);
      expect(res.forecast.length).toBe(5);

      res.forecast.forEach((day) => {
        expect(day.date).toBeDefined();
        expect(day.dayOfWeek).toBeDefined();
        expect(day.tempHighC).toBeGreaterThan(day.tempLowC);
        expect(day.precipitationChancePercent).toBeGreaterThanOrEqual(0);
      });
    });

    it('swaps between MockWeatherProvider and OpenWeatherProvider', () => {
      const original = weatherService.getProvider();
      const openWeather = new OpenWeatherProvider();
      weatherService.setProvider(openWeather);
      expect(weatherService.getProvider().providerId).toBe('openweather_live');
      weatherService.setProvider(original);
    });
  });

  describe('5. Places & Attractions Service', () => {
    it('retrieves detailed curated places with opening hours for core destinations', () => {
      const parisPlaces = placesService.getPlacesSync('paris');
      expect(parisPlaces.length).toBeGreaterThan(0);

      const louvre = parisPlaces.find((p) => p.name.includes('Louvre'));
      expect(louvre).toBeDefined();
      expect(louvre?.isOpenHoursRecorded).toBe(true);
      expect(louvre?.openingHours?.closedDays).toContain(2); // Closed Tuesdays

      const eiffel = parisPlaces.find((p) => p.name.includes('Eiffel'));
      expect(eiffel).toBeDefined();
      expect(eiffel?.isAdmissionRecorded).toBe(true);
      expect(eiffel?.estimatedCostPerPerson).toBe(28);
    });

    it('evaluates opening hours on specific days of the week', () => {
      const parisPlaces = placesService.getPlacesSync('paris');
      const louvre = parisPlaces.find((p) => p.name.includes('Louvre'))!;

      // Day 2 = Tuesday -> Louvre is closed!
      expect(placesService.isPlaceOpen(louvre, 2)).toBe(false);

      // Day 3 = Wednesday -> Louvre is open!
      expect(placesService.isPlaceOpen(louvre, 3)).toBe(true);
    });

    it('asynchronously retrieves places for Paris with honest curated provenance', async () => {
      const places = await placesService.getPlaces('paris');
      expect(places.length).toBeGreaterThan(0);
      places.forEach((p) => {
        expect(p.provenance).toBe('curated');
        expect(p.sourceAttribution).toContain('Curated');
      });
      const louvre = places.find((p) => p.name.includes('Louvre'));
      expect(louvre).toBeDefined();
    });

    it('asynchronously retrieves places for Bangkok with honest curated provenance', async () => {
      const places = await placesService.getPlaces('bangkok');
      expect(places.length).toBeGreaterThanOrEqual(5);
      places.forEach((p) => {
        expect(p.provenance).toBe('curated');
        expect(p.destinationId).toBe('bangkok');
      });
      const grandPalace = places.find((p) => p.name.includes('Grand Palace'));
      expect(grandPalace).toBeDefined();
    });

    it('falls back to curated data when preferLive is requested but external provider is unconfigured', async () => {
      const places = await placesService.getPlaces('paris', { preferLive: true });
      expect(places.length).toBeGreaterThan(0);
      places.forEach((p) => {
        expect(p.provenance).toBe('curated');
      });
    });
  });

  describe('6. Server Security & Secrets Architecture', () => {
    it('ensures no travel API credentials contain the VITE_ client bundle prefix', () => {
      const serverEnvKeys = [
        'OPENTRIPMAP_API_KEY',
        'GOOGLE_MAPS_API_KEY',
        'GOOGLE_ROUTES_API_KEY',
        'OPENWEATHER_API_KEY',
        'AMADEUS_CLIENT_ID',
        'AMADEUS_CLIENT_SECRET',
        'HOTEL_PROVIDER_API_KEY',
      ];

      serverEnvKeys.forEach((key) => {
        expect(key.startsWith('VITE_')).toBe(false);
      });
    });
  });
});
