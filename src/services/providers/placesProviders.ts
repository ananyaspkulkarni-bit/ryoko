import type {
  IPlacesProvider,
  PlacesProviderQuery,
  PlacesProviderResponse,
} from '../../types/placesProvider';

/**
 * Adapter skeleton for future integration with Google Places API (New).
 * Connects via server-side proxy `/api/places` with server-side secret `GOOGLE_PLACES_API_KEY`.
 */
export class GooglePlacesProvider implements IPlacesProvider {
  public readonly providerId = 'google_places_live';
  public readonly attribution = 'Google Places API (Google Maps Platform)';

  private proxyUrl: string;

  constructor(proxyUrl = '/api/places') {
    this.proxyUrl = proxyUrl;
  }

  public async fetchPlaces(query: PlacesProviderQuery): Promise<PlacesProviderResponse> {
    try {
      const params = new URLSearchParams({
        lat: String(query.coordinates?.lat || 0),
        lng: String(query.coordinates?.lng || 0),
        destinationId: query.destinationId,
        provider: 'google',
      });

      const response = await fetch(`${this.proxyUrl}?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 501 || response.status === 404) {
          return {
            success: false,
            status: 'unconfigured',
            provider: this.providerId,
            destinationId: query.destinationId,
            activities: [],
            totalFound: 0,
            sourceAttribution: this.attribution,
            warning: 'GOOGLE_PLACES_API_KEY is not configured in server environment.',
          };
        }
        throw new Error(`Google Places proxy returned HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      return {
        success: false,
        status: 'network_error',
        provider: this.providerId,
        destinationId: query.destinationId,
        activities: [],
        totalFound: 0,
        sourceAttribution: this.attribution,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
