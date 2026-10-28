import type { Destination } from '../types';

/**
 * Hash Map (O(1) average lookup) specialized for Destination entities.
 * Keyed by normalized identifier, city name, country, and aliases.
 *
 * Time Complexities:
 * - get(key):    O(1) average lookup using normalized hash key
 * - set(key):    O(1) average insertion
 * - has(key):    O(1) average existence check
 * - delete(key): O(1) average deletion
 * - size():      O(1)
 * - populate(n): O(n) construction across n destination records
 */
export class DestinationMap {
  private map = new Map<string, Destination>();

  constructor(initialDestinations?: Destination[]) {
    if (initialDestinations && Array.isArray(initialDestinations)) {
      this.populate(initialDestinations);
    }
  }

  /**
   * Normalizes search keys consistently: trims surrounding whitespace and converts to lowercase.
   * e.g. "  PARIS  " -> "paris"
   */
  public normalizeKey(key: string): string {
    return (key || '').trim().toLowerCase();
  }

  /**
   * Sets a destination for a specific normalized key.
   */
  public set(key: string, destination: Destination): void {
    const normalized = this.normalizeKey(key);
    if (!normalized || !destination) return;
    this.map.set(normalized, destination);
  }

  /**
   * Registers a destination under all its valid identifiers, city names, country codes, and aliases.
   */
  public registerDestination(destination: Destination, aliases?: string[]): void {
    if (!destination) return;

    if (destination.id) {
      this.set(destination.id, destination);
    }
    if (destination.name) {
      this.set(destination.name, destination);
    }
    if (destination.primaryCity && destination.primaryCity !== destination.name) {
      this.set(destination.primaryCity, destination);
    }
    if (destination.country && destination.country !== destination.name) {
      const normCountry = this.normalizeKey(destination.country);
      if (!this.map.has(normCountry)) {
        this.set(normCountry, destination);
      }
    }
    if (destination.countryCode) {
      const normCode = this.normalizeKey(destination.countryCode);
      if (!this.map.has(normCode)) {
        this.set(normCode, destination);
      }
    }
    if (aliases && Array.isArray(aliases)) {
      for (const alias of aliases) {
        this.set(alias, destination);
      }
    }
  }

  /**
   * Populates the map from an array of destinations.
   * Time Complexity: O(n)
   */
  public populate(destinations: Destination[]): void {
    if (!destinations || !Array.isArray(destinations)) return;
    for (const d of destinations) {
      this.registerDestination(d);
    }
  }

  /**
   * Performs O(1) average lookup with automatic key normalization.
   */
  public get(key: string): Destination | undefined {
    const normalized = this.normalizeKey(key);
    if (!normalized) return undefined;
    return this.map.get(normalized);
  }

  /**
   * Performs O(1) average existence check with automatic key normalization.
   */
  public has(key: string): boolean {
    const normalized = this.normalizeKey(key);
    if (!normalized) return false;
    return this.map.has(normalized);
  }

  /**
   * Removes a destination mapping by key.
   */
  public delete(key: string): boolean {
    const normalized = this.normalizeKey(key);
    if (!normalized) return false;
    return this.map.delete(normalized);
  }

  /**
   * Returns the count of distinct indexed keys.
   */
  public size(): number {
    return this.map.size;
  }

  /**
   * Clears all entries from the map.
   */
  public clear(): void {
    this.map.clear();
  }

  /**
   * Returns all unique Destination records stored in the map (deduplicated by destination.id).
   */
  public getAllUnique(): Destination[] {
    const unique = new Map<string, Destination>();
    for (const dest of this.map.values()) {
      if (dest && dest.id && !unique.has(dest.id)) {
        unique.set(dest.id, dest);
      }
    }
    return Array.from(unique.values());
  }
}

/**
 * Shared application singleton instance of DestinationMap.
 */
export const destinationMap = new DestinationMap();
