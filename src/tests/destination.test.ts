import { describe, it, expect } from 'vitest';
import { getDestinationData } from '../data/destinations';
import { destinationSearchService } from '../features/destinations/destinationSearchService';

describe('Destination Data Module & Source of Truth', () => {
  it('should support the 5 core destinations with full schema validation', () => {
    const requiredDestinations = [
      { key: 'France', city: 'Paris', countryCode: 'FR' },
      { key: 'Egypt', city: 'Cairo', countryCode: 'EG' },
      { key: 'Japan', city: 'Tokyo', countryCode: 'JP' },
      { key: 'India', city: 'Mumbai', countryCode: 'IN' },
      { key: 'Italy', city: 'Rome', countryCode: 'IT' },
    ];

    requiredDestinations.forEach(({ key, city, countryCode }) => {
      const dest = getDestinationData(key);
      expect(dest).toBeDefined();
      expect(dest.id).toBeTruthy();
      expect(dest.name).toBe(city);
      expect(dest.country).toBeTruthy();
      expect(dest.countryCode).toBe(countryCode);
      expect(dest.coordinates).toBeDefined();
      expect(typeof dest.coordinates.lat).toBe('number');
      expect(typeof dest.coordinates.lng).toBe('number');
      expect(dest.subtitle).toBeTruthy();
      expect(dest.description).toBeTruthy();
      expect(dest.arrivalMessage).toBeTruthy();
      expect(Array.isArray(dest.itinerary)).toBe(true);
      expect(dest.itinerary!.length).toBeGreaterThan(0);
      expect(dest.categories).toBeDefined();
      expect(dest.categories!.transport.length).toBeGreaterThan(0);
      expect(dest.categories!.food.length).toBeGreaterThan(0);
      expect(dest.categories!.stay.length).toBeGreaterThan(0);
      expect(dest.categories!.mustVisit.length).toBeGreaterThan(0);
      expect(dest.categories!.mustTry.length).toBeGreaterThan(0);
      expect(dest.categories!.mustDo.length).toBeGreaterThan(0);
    });
  });

  it('should lookup destination by city, country, or id accurately', () => {
    const egyptByCountry = getDestinationData('Egypt');
    const egyptByCity = getDestinationData('Cairo');
    const egyptById = getDestinationData('cairo');

    expect(egyptByCountry.id).toBe(egyptByCity.id);
    expect(egyptByCity.id).toBe(egyptById.id);
    expect(egyptByCountry.country).toBe('Egypt');
    expect(egyptByCountry.name).toBe('Cairo');

    const tokyoByCountry = getDestinationData('Japan');
    const tokyoByCity = getDestinationData('Tokyo');

    expect(tokyoByCountry.id).toBe(tokyoByCity.id);
    expect(tokyoByCountry.name).toBe('Tokyo');
  });

  it('should handle unknown destinations with a safe generic fallback and NEVER default to Paris', () => {
    const unknownString = getDestinationData('Atlantis');

    expect(unknownString.name).toBe('Atlantis');
    expect(unknownString.country).toBe('Atlantis');
    expect(unknownString.landmarkSvgType).toBe('generic');
    expect(unknownString.arrivalMessage).toContain('Atlantis');
    expect(unknownString.description).not.toContain('Paris');
    expect(unknownString.description).not.toContain('Eiffel');

    const unknownObject = getDestinationData({
      id: 'peru',
      name: 'Lima',
      country: 'Peru',
      region: 'South America',
      coordinates: { lat: -12.0464, lng: -77.0428 },
      description: 'Ancient Incan civilization and Pacific cuisine.',
      category: 'cultural',
      tags: ['peru', 'history'],
      rating: 4.8,
    });

    expect(unknownObject.name).toBe('Lima');
    expect(unknownObject.country).toBe('Peru');
    expect(unknownObject.landmarkSvgType).toBe('generic');
    expect(unknownObject.coordinates.lat).toBe(-12.0464);
    expect(unknownObject.description).toContain('Incan');
    expect(unknownObject.description).not.toContain('Paris');
  });

  it('should verify exact content for Egypt', () => {
    const egypt = getDestinationData('Egypt');

    expect(egypt.coordinates.lat).toBeCloseTo(30.0444);
    expect(egypt.coordinates.lng).toBeCloseTo(31.2357);
    expect(egypt.landmarkSvgType).toBe('egypt');
    expect(egypt.arrivalMessage).toBe("Marhaban! We're in Cairo, Egypt.");
    
    // Itinerary items
    const titles = egypt.itinerary!.map((item) => item.title).join(' ');
    expect(titles).toContain('Giza Pyramids');
    expect(titles).toContain('Grand Egyptian Museum');
    expect(titles).toContain('Khan el-Khalili');

    // Categories
    const foodStr = egypt.categories!.food.join(' ');
    expect(foodStr).toContain('Koshari');
    const stayStr = egypt.categories!.stay.join(' ');
    expect(stayStr).toContain('Mena House');

    // No Paris leak
    expect(titles).not.toContain('Eiffel');
    expect(foodStr).not.toContain('Croissant');
  });

  it('should verify exact content for Tokyo', () => {
    const tokyo = getDestinationData('Tokyo');

    expect(tokyo.coordinates.lat).toBeCloseTo(35.6762);
    expect(tokyo.coordinates.lng).toBeCloseTo(139.6503);
    expect(tokyo.landmarkSvgType).toBe('tokyo');
    expect(tokyo.arrivalMessage).toBe("Kon'nichiwa! We're in Tokyo.");

    // Itinerary items
    const titles = tokyo.itinerary!.map((item) => item.title).join(' ');
    expect(titles).toContain('Tsukiji');
    expect(titles).toContain('Meiji Shrine');
    expect(titles).toContain('Shinjuku');

    // Categories
    const transportStr = tokyo.categories!.transport.join(' ');
    expect(transportStr).toContain('Yamanote');

    // No Paris leak
    expect(titles).not.toContain('Louvre');
  });

  it('should preserve Paris content and experience', () => {
    const paris = getDestinationData('Paris');

    expect(paris.name).toBe('Paris');
    expect(paris.country).toBe('France');
    expect(paris.landmarkSvgType).toBe('paris');
    expect(paris.arrivalMessage).toBe("Bienvenue! We're in Paris.");

    const titles = paris.itinerary!.map((item) => item.title).join(' ');
    expect(titles).toContain('Café de Flore');
    expect(titles).toContain("Musée d'Orsay");
  });

  it('should search destinations via destinationSearchService', () => {
    const resultsEgypt = destinationSearchService.search('Egypt');
    expect(resultsEgypt.length).toBeGreaterThan(0);
    expect(resultsEgypt[0].country).toBe('Egypt');

    const resultsCairo = destinationSearchService.search('Cairo');
    expect(resultsCairo.length).toBeGreaterThan(0);
    expect(resultsCairo[0].name).toBe('Cairo');

    const resultsTokyo = destinationSearchService.search('Tokyo');
    expect(resultsTokyo.length).toBeGreaterThan(0);
    expect(resultsTokyo[0].name).toBe('Tokyo');
  });
});
