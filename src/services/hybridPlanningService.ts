import type { TripPreferences, GeneratedItineraryPlan, AIPlanInput } from '../types';
import { getDestinationData } from '../data/destinations';
import { getActivitiesForDestination } from '../data/activities';
import { getDetailedPlacesForDestination } from '../data/mock/mockPlaces';
import { itineraryService } from './itineraryService';
import { ItineraryValidator, itineraryValidator } from './itineraryValidator';
import { FallbackDeterministicAdapter, type IAIPlanningAdapter } from './aiPlanningAdapter';

import { destinationDiscoveryService } from './destinationDiscoveryService';

export class HybridPlanningService {
  private adapter: IAIPlanningAdapter;
  private validator: ItineraryValidator;

  constructor(
    adapter: IAIPlanningAdapter = new FallbackDeterministicAdapter(),
    validator: ItineraryValidator = itineraryValidator
  ) {
    this.adapter = adapter;
    this.validator = validator;
  }

  public setAdapter(adapter: IAIPlanningAdapter): void {
    this.adapter = adapter;
  }

  public async planTrip(preferences: TripPreferences): Promise<GeneratedItineraryPlan> {
    const resolution = destinationDiscoveryService.resolveDestination(preferences.destinationId);
    const dest = resolution.destination || getDestinationData(preferences.destinationId);
    let candidateActivities = getActivitiesForDestination(dest.id, dest.name);
    let hasVerifiedActivities = resolution.hasVerifiedActivities;

    // If destination has curated detailed places (e.g. Bangkok) but activities map is empty,
    // derive candidates directly from detailed places
    if (candidateActivities.length === 0) {
      const detailed = getDetailedPlacesForDestination(dest.id);
      if (detailed.length > 0) {
        candidateActivities = detailed.map((p) => ({
          id: `act-${p.destinationId}-${p.id.replace(/^plc-[a-z]+-/, '')}`,
          name: p.name,
          description: p.description,
          destinationId: p.destinationId,
          category: p.category,
          estimatedDurationMinutes: p.estimatedDurationMinutes,
          estimatedCostPerPerson: p.estimatedCostPerPerson,
          tags: p.tags,
          timeOfDay: p.timeOfDay || 'any',
          coordinates: p.coordinates,
          environment: p.environment || 'both',
        }));
        hasVerifiedActivities = true;
      }
    }

    // If destination is not curated but an external places provider is configured, fetch provider candidates
    if (!hasVerifiedActivities && destinationDiscoveryService.getPlacesProvider()) {
      try {
        const discovered = await destinationDiscoveryService.fetchActivityCandidates(dest.id);
        if (discovered.length > 0) {
          candidateActivities = discovered.map((d) => ({
            id: d.id,
            name: d.name,
            description: d.description || `Verified attraction in ${dest.name} sourced from ${d.sourceAttribution || 'external provider'}.`,
            destinationId: dest.id,
            category: d.category,
            estimatedDurationMinutes: d.estimatedDurationMinutes || 120,
            estimatedCostPerPerson: d.estimatedCostPerPerson,
            tags: d.tags,
            timeOfDay: d.timeOfDay || 'any',
            coordinates: d.coordinates,
            environment: d.environment || 'both',
          }));
          hasVerifiedActivities = true;
        }
      } catch (err) {
        console.warn('External places provider sourcing failed for hybrid planner:', err);
      }
    }

    const input: AIPlanInput = {
      destinationId: dest.id,
      destinationName: dest.name,
      country: dest.country,
      days: preferences.days,
      travelers: preferences.travelers,
      budget: preferences.budget,
      currency: 'USD',
      travelStyle: preferences.travelStyle,
      interests: preferences.interests || [],
      constraints: preferences.constraints,
      candidateActivities,
      hasVerifiedActivities,
    };

    try {
      // Step 1: AI Provider Adapter Proposes Plan
      const proposal = await this.adapter.generatePlanProposal(input);

      // Step 2: Deterministic Validation & Arithmetic Engine
      const result = this.validator.validateAndRepair(input, proposal);

      if (result.repairedPlan) {
        result.repairedPlan.hasVerifiedActivities = hasVerifiedActivities;
        result.repairedPlan.dataStatus = hasVerifiedActivities ? 'curated' : 'insufficient_data';
        if (!hasVerifiedActivities && !result.repairedPlan.warnings.some((w) => w.includes('verified local activity data'))) {
          result.repairedPlan.warnings.push(
            `Notice: No verified local activity data is currently available for ${dest.name}. Ryoko does not generate placeholder activities or guessed prices. Explore curated destinations (Paris, Cairo, Tokyo, Mumbai, Rome) for authentic recommendations.`
          );
        }
        return result.repairedPlan;
      }
    } catch (err) {
      // Step 3: Controlled Fallback if AI Adapter Fails
      console.warn('Hybrid AI planning adapter error. Falling back to deterministic planner:', err);
    }

    // Deterministic Fallback Engine Guarantee
    return itineraryService.generateItinerary(preferences);
  }
}

export const hybridPlanningService = new HybridPlanningService();

export interface PlanningSessionState {
  plan: GeneratedItineraryPlan | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Manages asynchronous planning execution lifecycle, loading/error states,
 * and out-of-order race condition guards (preventing stale responses from overwriting newer ones).
 */
export class PlanningSession {
  private activeRequestId = 0;
  private lastResolvedPlan: GeneratedItineraryPlan | null = null;
  private service: HybridPlanningService;

  constructor(service: HybridPlanningService = hybridPlanningService) {
    this.service = service;
  }

  public async requestPlan(
    preferences: TripPreferences,
    onStateChange: (state: PlanningSessionState) => void,
    previousPlan: GeneratedItineraryPlan | null = null
  ): Promise<GeneratedItineraryPlan | null> {
    const requestId = ++this.activeRequestId;
    const initialPlan = previousPlan ?? this.lastResolvedPlan;
    onStateChange({ plan: initialPlan, isLoading: true, error: null });

    try {
      const plan = await this.service.planTrip(preferences);
      if (requestId === this.activeRequestId) {
        this.lastResolvedPlan = plan;
        onStateChange({ plan, isLoading: false, error: null });
        return plan;
      }
      return null; // Stale request discarded
    } catch (err) {
      if (requestId === this.activeRequestId) {
        const errorMsg = err instanceof Error ? err.message : 'Planning failed';
        onStateChange({ plan: initialPlan, isLoading: false, error: errorMsg });
      }
      return null;
    }
  }

  public cancel(): void {
    this.activeRequestId++;
  }

  public getActiveRequestId(): number {
    return this.activeRequestId;
  }

  public getLastResolvedPlan(): GeneratedItineraryPlan | null {
    return this.lastResolvedPlan;
  }
}

