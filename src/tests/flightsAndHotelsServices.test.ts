import { describe, it, expect } from 'vitest';
import { flightService } from '../services/flightService';
import { hotelService } from '../services/hotelService';
import { MockFlightProvider, AmadeusFlightProvider } from '../services/providers/flightProviders';
import { MockHotelProvider, GoogleHotelsProvider } from '../services/providers/hotelProviders';
import { convertUsdToInr, formatINR, USD_TO_INR_RATE } from '../lib/currency';


describe('Flights and Accommodation Services Suite (Sprint 4)', () => {
  describe('1. Flight Service & Fallback Handling', () => {
    it('retrieves flights for primary destinations backwards compatibly', async () => {
      const parisFlights = await flightService.getFlightsForDestination('Paris');
      expect(parisFlights.length).toBeGreaterThan(0);
      parisFlights.forEach((f) => {
        expect(f.destinationCity.toLowerCase()).toContain('paris');
        expect(f.isMock).toBe(true);
        expect(f.estimatedPriceUsd).toBeGreaterThan(0);
      });
    });

    it('correctly maps Thailand destination query to Bangkok flights', async () => {
      const thFlights = await flightService.getFlightsForDestination('Thailand');
      expect(thFlights.length).toBeGreaterThan(0);
      thFlights.forEach((f) => {
        expect(f.destinationCity.toLowerCase()).toContain('bangkok');
      });
    });

    it('searchFlightsWithFallback falls back gracefully with clear provenance warnings', async () => {
      const res = await flightService.searchFlightsWithFallback('Paris', {
        originAirport: 'JFK',
        departureDate: '2026-06-01',
        passengers: 2,
        preferLive: true,
      });

      expect(res.flights.length).toBeGreaterThan(0);
      expect(res.isMock).toBe(true);
      expect(res.liveFareVerified).toBe(false);
      expect(res.warning).toBeDefined();
      expect(res.disclaimer).toMatch(/simulated|not configured|mock/i);
    });

    it('formats flight fares into dual INR and USD base cleanly', async () => {
      const flights = await flightService.getFlightsForDestination('Paris');
      const flight = flights[0];
      const usdPrice = flight.estimatedPriceUsd;
      const inrPrice = convertUsdToInr(usdPrice);
      const inrFormatted = formatINR(inrPrice);

      expect(inrPrice).toBe(usdPrice * USD_TO_INR_RATE);

      expect(inrFormatted).toContain('₹');
      expect(inrFormatted).toMatch(/₹[\d,]+/);
    });
  });

  describe('2. Hotel Service & Stay Pricing Calculations', () => {
    it('retrieves hotels for primary destinations backwards compatibly', async () => {
      const hotels = await hotelService.getHotelsForDestination('paris');
      expect(hotels.length).toBeGreaterThan(0);
      hotels.forEach((h) => {
        expect(h.destinationId).toBe('paris');
        expect(h.isMock).toBe(true);
        expect(h.estimatedPricePerNightUsd).toBeGreaterThan(0);
      });
    });

    it('correctly maps Thailand destination query to Bangkok accommodations', async () => {
      const thHotels = await hotelService.getHotelsForDestination('thailand');
      expect(thHotels.length).toBeGreaterThan(0);
      thHotels.forEach((h) => {
        expect(h.destinationId).toBe('bangkok');
      });
    });

    it('searchHotelsWithFallback computes total stay nights and pricing accurately', async () => {
      const days = 4;
      const guests = 2;
      const res = await hotelService.searchHotelsWithFallback('paris', {
        checkInDate: '2026-06-01',
        days,
        guests,
        preferLive: true,
      });

      expect(res.hotels.length).toBeGreaterThan(0);
      res.hotels.forEach((h) => {
        expect(h.totalNights).toBe(days);
        expect(h.guests).toBe(guests);
        expect(h.totalStayPriceUsd).toBe(h.estimatedPricePerNightUsd * days);

        // Verify INR calculation
        const totalStayInr = convertUsdToInr(h.totalStayPriceUsd!);
        const formattedInr = formatINR(totalStayInr);
        expect(formattedInr).toContain('₹');
      });
    });

    it('filters hotels by tier and budget constraints accurately', async () => {
      const res = await hotelService.searchHotelsWithFallback('tokyo', {
        tier: 'boutique',
        maxPricePerNightUsd: 400,
      });

      expect(res.success).toBe(true);
      res.hotels.forEach((h) => {
        expect(h.tier).toBe('boutique');
        expect(h.estimatedPricePerNightUsd).toBeLessThanOrEqual(400);
      });
    });
  });

  describe('3. Security and Cost Protection', () => {
    it('never contains raw client secret strings in client service layers', () => {
      const amadeusAdapter = new AmadeusFlightProvider();
      expect((amadeusAdapter as any).clientSecret).toBeUndefined();
      expect((amadeusAdapter as any).apiKey).toBeUndefined();

      const hotelsAdapter = new GoogleHotelsProvider();
      expect((hotelsAdapter as any).clientSecret).toBeUndefined();
      expect((hotelsAdapter as any).apiKey).toBeUndefined();
    });

    it('swapping providers dynamically is supported', () => {
      const mockFlt = new MockFlightProvider();
      const liveFlt = new AmadeusFlightProvider();
      flightService.setProvider(liveFlt);
      expect(flightService.getProvider().providerId).toBe('amadeus_live');
      flightService.setProvider(mockFlt);
      expect(flightService.getProvider().providerId).toBe('mock_flights');

      const mockHtl = new MockHotelProvider();
      const liveHtl = new GoogleHotelsProvider();
      hotelService.setProvider(liveHtl);
      expect(hotelService.getProvider().providerId).toBe('google_hotels_live');
      hotelService.setProvider(mockHtl);
      expect(hotelService.getProvider().providerId).toBe('mock_hotels');
    });
  });
});
