import { describe, it, expect } from 'vitest';
import {
  HybridPlanningService,
  PlanningSession,
  type PlanningSessionState,
} from '../services/hybridPlanningService';
import type { IAIPlanningAdapter } from '../services/aiPlanningAdapter';
import type { TripPreferences, AIPlanOutput, AIPlanInput } from '../types';
import { getDestinationData } from '../data/destinations';

describe('Hybrid Planning UI Integration & Session Coordination Suite', () => {
  it('PlanningSession transitions through loading and delivers a valid hybrid plan', async () => {
    const session = new PlanningSession();
    const states: PlanningSessionState[] = [];

    const preferences: TripPreferences = {
      destinationId: 'cairo',
      days: 2,
      travelers: 2,
      budget: 500,
      travelStyle: 'culture',
      interests: ['pyramids', 'history'],
    };

    const result = await session.requestPlan(preferences, (state) => {
      states.push({ ...state });
    });

    expect(result).toBeDefined();
    expect(result!.destinationId).toBe('cairo');
    expect(result!.totalDays).toBe(2);
    expect(result!.travelersCount).toBe(2);

    // Initial state: loading = true
    expect(states[0].isLoading).toBe(true);
    expect(states[0].plan).toBeNull();

    // Final state: loading = false, plan populated, no error
    const finalState = states[states.length - 1];
    expect(finalState.isLoading).toBe(false);
    expect(finalState.plan).toBeDefined();
    expect(finalState.plan!.destinationId).toBe('cairo');
    expect(finalState.error).toBeNull();
  });

  it('prevents stale out-of-order results from overwriting newer planning requests', async () => {
    class DelayedAIAdapter implements IAIPlanningAdapter {
      private delayMs: number;
      constructor(delayMs: number) {
        this.delayMs = delayMs;
      }
      public async generatePlanProposal(input: AIPlanInput): Promise<AIPlanOutput> {
        await new Promise((resolve) => setTimeout(resolve, this.delayMs));
        return {
          tripTitle: `${input.destinationName} Trip`,
          summary: `Trip for ${input.destinationName}`,
          days: [
            {
              dayNumber: 1,
              items: [
                {
                  activityId: input.candidateActivities[0]?.id || `act-${input.destinationId}-morning`,
                  suggestedStartTime: '09:30 AM',
                  selectionReason: 'Test',
                },
              ],
            },
          ],
        };
      }
    }

    // Service where Request 1 takes 60ms and Request 2 takes 10ms
    const slowAdapter = new DelayedAIAdapter(60);
    const fastAdapter = new DelayedAIAdapter(10);

    const customService = new HybridPlanningService(slowAdapter);
    const session = new PlanningSession(customService);

    let activeDisplayedPlan: any = null;

    // Dispatch Request 1 (slow - Paris)
    customService.setAdapter(slowAdapter);
    const promise1 = session.requestPlan(
      {
        destinationId: 'paris',
        days: 1,
        travelers: 1,
        budget: 300,
        travelStyle: 'culture',
      },
      (state) => {
        if (state.plan) activeDisplayedPlan = state.plan;
      }
    );

    // Rapidly dispatch Request 2 (fast - Tokyo) before Request 1 finishes
    customService.setAdapter(fastAdapter);
    const promise2 = session.requestPlan(
      {
        destinationId: 'tokyo',
        days: 1,
        travelers: 1,
        budget: 400,
        travelStyle: 'foodie',
      },
      (state) => {
        if (state.plan) activeDisplayedPlan = state.plan;
      }
    );

    const [res1, res2] = await Promise.all([promise1, promise2]);

    // Request 1 was stale, so requestPlan returned null for it
    expect(res1).toBeNull();
    // Request 2 was accepted
    expect(res2).toBeDefined();
    expect(res2!.destinationId).toBe('tokyo');

    // Displayed state must be Tokyo, never overwritten by the late Paris resolution
    expect(activeDisplayedPlan).toBeDefined();
    expect(activeDisplayedPlan.destinationId).toBe('tokyo');
  });

  it('cancel() invalidates in-flight requests so late resolutions are ignored', async () => {
    class DelayedAIAdapter implements IAIPlanningAdapter {
      public async generatePlanProposal(input: AIPlanInput): Promise<AIPlanOutput> {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return {
          tripTitle: `${input.destinationName} Trip`,
          summary: `Trip for ${input.destinationName}`,
          days: [],
        };
      }
    }

    const session = new PlanningSession(new HybridPlanningService(new DelayedAIAdapter()));
    let callbackCalledAfterCancel = false;

    const promise = session.requestPlan(
      {
        destinationId: 'paris',
        days: 1,
        travelers: 1,
        budget: 300,
        travelStyle: 'culture',
      },
      (state) => {
        if (!state.isLoading && state.plan) {
          callbackCalledAfterCancel = true;
        }
      }
    );

    // Cancel while request is in flight
    session.cancel();

    const result = await promise;
    expect(result).toBeNull();
    expect(callbackCalledAfterCancel).toBe(false);
  });

  it('falls back to deterministic itinerary planner if planning adapter rejects', async () => {
    class FailingAdapter implements IAIPlanningAdapter {
      public async generatePlanProposal(): Promise<AIPlanOutput> {
        throw new Error('AI Provider network timeout (504)');
      }
    }

    const session = new PlanningSession(new HybridPlanningService(new FailingAdapter()));
    const states: PlanningSessionState[] = [];

    const result = await session.requestPlan(
      {
        destinationId: 'tokyo',
        days: 2,
        travelers: 2,
        budget: 600,
        travelStyle: 'foodie',
      },
      (state) => {
        states.push({ ...state });
      }
    );

    // Fallback succeeds deterministically
    expect(result).toBeDefined();
    expect(result!.destinationId).toBe('tokyo');
    expect(result!.days.length).toBe(2);
    expect(result!.travelersCount).toBe(2);

    // Final state has valid plan
    const finalState = states[states.length - 1];
    expect(finalState.plan).toBeDefined();
    expect(finalState.plan!.destinationId).toBe('tokyo');
    expect(finalState.isLoading).toBe(false);
  });

  it('preserves destination-specific activities, duration, traveller scaling, and budget warnings', async () => {
    const session = new PlanningSession();

    // 1. Egypt generates exclusively Cairo activities
    const cairoPlan = await session.requestPlan(
      {
        destinationId: 'cairo',
        days: 2,
        travelers: 2,
        budget: 500,
        travelStyle: 'culture',
      },
      () => {}
    );

    expect(cairoPlan!.destinationId).toBe('cairo');
    expect(cairoPlan!.country).toBe('Egypt');
    expect(cairoPlan!.days.length).toBe(2);
    cairoPlan!.days.forEach((day) => {
      day.items.forEach((item) => {
        expect(item.activity.destinationId).toBe('cairo');
      });
    });

    // 2. Tokyo generates exclusively Tokyo activities
    const tokyoPlan = await session.requestPlan(
      {
        destinationId: 'tokyo',
        days: 3,
        travelers: 1,
        budget: 700,
        travelStyle: 'foodie',
      },
      () => {}
    );

    expect(tokyoPlan!.destinationId).toBe('tokyo');
    expect(tokyoPlan!.days.length).toBe(3);
    tokyoPlan!.days.forEach((day) => {
      day.items.forEach((item) => {
        expect(item.activity.destinationId).toBe('tokyo');
      });
    });

    // 3. Costs scale with number of travellers
    const soloPlan = await session.requestPlan(
      {
        destinationId: 'rome',
        days: 1,
        travelers: 1,
        budget: 500,
        travelStyle: 'culture',
      },
      () => {}
    );

    const duoPlan = await session.requestPlan(
      {
        destinationId: 'rome',
        days: 1,
        travelers: 2,
        budget: 500,
        travelStyle: 'culture',
      },
      () => {}
    );

    expect(duoPlan!.totalEstimatedCost).toBe(soloPlan!.totalEstimatedCost * 2);

    // 4. Infeasible budget raises warning
    const tightPlan = await session.requestPlan(
      {
        destinationId: 'cairo',
        days: 2,
        travelers: 4,
        budget: 20, // Insufficient budget
        travelStyle: 'culture',
      },
      () => {}
    );

    expect(tightPlan!.isWithinBudget).toBe(false);
    expect(tightPlan!.warnings.length).toBeGreaterThan(0);
    expect(tightPlan!.warnings[0]).toContain('exceeds your allocated budget');
  });

  it('correctly maps preferences from destination data and user preference inputs', () => {
    const dest = getDestinationData('Japan');
    const days = 3;
    const travelers = 2;
    const budget = 450;
    const travelStyle = 'foodie';

    const preferences: TripPreferences = {
      destinationId: dest.id,
      days,
      travelers,
      budget,
      travelStyle,
      interests: dest.tags || [],
    };

    expect(preferences.destinationId).toBe('tokyo');
    expect(preferences.days).toBe(3);
    expect(preferences.travelers).toBe(2);
    expect(preferences.budget).toBe(450);
    expect(preferences.travelStyle).toBe('foodie');
    expect(preferences.interests).toContain('japan');
  });

  describe('Queue Integration in PlanningSession Suite', () => {
    it('manages requestQueue FIFO processing and reports pending queue size', async () => {
      const session = new PlanningSession();
      expect(session.getPendingQueueSize()).toBe(0);
      expect(session.getRequestQueue()).toBeDefined();
      expect(session.getRequestQueue().isEmpty()).toBe(true);

      const plan1Promise = session.requestPlan(
        { destinationId: 'paris', days: 1, travelers: 1, budget: 300, travelStyle: 'culture' },
        () => {}
      );
      const plan2Promise = session.requestPlan(
        { destinationId: 'cairo', days: 2, travelers: 2, budget: 500, travelStyle: 'culture' },
        () => {}
      );

      const [res1, res2] = await Promise.all([plan1Promise, plan2Promise]);

      // Request 1 was superseded by Request 2, so it resolved null
      expect(res1).toBeNull();
      // Request 2 resolved successfully as the active request
      expect(res2).toBeDefined();
      expect(res2!.destinationId).toBe('cairo');
      expect(session.getPendingQueueSize()).toBe(0);
      expect(session.getRequestQueue().isEmpty()).toBe(true);
    });

    it('processes queued requests sequentially in FIFO order when requests complete', async () => {
      const session = new PlanningSession();
      const executionOrder: string[] = [];

      // Sequential requests
      const planA = await session.requestPlan(
        { destinationId: 'paris', days: 1, travelers: 1, budget: 300, travelStyle: 'culture' },
        () => {}
      );
      executionOrder.push(planA!.destinationId);

      const planB = await session.requestPlan(
        { destinationId: 'tokyo', days: 2, travelers: 1, budget: 400, travelStyle: 'foodie' },
        () => {}
      );
      executionOrder.push(planB!.destinationId);

      const planC = await session.requestPlan(
        { destinationId: 'cairo', days: 3, travelers: 2, budget: 600, travelStyle: 'culture' },
        () => {}
      );
      executionOrder.push(planC!.destinationId);

      expect(executionOrder).toEqual(['paris', 'tokyo', 'cairo']);
    });

    it('queue does not deadlock or block if a planning request encounters an error', async () => {
      class ErrorOnParisAdapter implements IAIPlanningAdapter {
        public async generatePlanProposal(input: AIPlanInput): Promise<AIPlanOutput> {
          if (input.destinationId === 'paris') {
            throw new Error('Planned Paris failure');
          }
          return {
            tripTitle: `${input.destinationName} Trip`,
            summary: `Trip for ${input.destinationName}`,
            days: [],
          };
        }
      }

      const session = new PlanningSession(new HybridPlanningService(new ErrorOnParisAdapter()));

      // Request 1 (Paris) will trigger adapter error, fallback deterministically
      const res1 = await session.requestPlan(
        { destinationId: 'paris', days: 1, travelers: 1, budget: 300, travelStyle: 'culture' },
        () => {}
      );
      expect(res1).toBeDefined();
      expect(res1!.destinationId).toBe('paris');

      // Request 2 (Tokyo) must process cleanly without being blocked by previous request
      const res2 = await session.requestPlan(
        { destinationId: 'tokyo', days: 2, travelers: 1, budget: 400, travelStyle: 'foodie' },
        () => {}
      );
      expect(res2).toBeDefined();
      expect(res2!.destinationId).toBe('tokyo');
      expect(session.getPendingQueueSize()).toBe(0);
    });

    it('cancel empties the requestQueue immediately and increments activeRequestId', async () => {
      const session = new PlanningSession();
      const initialId = session.getActiveRequestId();

      session.cancel();
      expect(session.getActiveRequestId()).toBe(initialId + 1);
      expect(session.getPendingQueueSize()).toBe(0);
      expect(session.getRequestQueue().isEmpty()).toBe(true);
    });
  });
});

