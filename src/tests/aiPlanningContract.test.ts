import { describe, it, expect } from 'vitest';
import type { AIPlanInput, AIPlanOutput } from '../types';
import { itineraryValidator } from '../services/itineraryValidator';
import { HybridPlanningService } from '../services/hybridPlanningService';
import { FallbackDeterministicAdapter, type IAIPlanningAdapter } from '../services/aiPlanningAdapter';
import { getActivitiesForDestination } from '../data/activities';

describe('AI Planning Contract & Hybrid Validation Suite', () => {
  const sampleInput: AIPlanInput = {
    destinationId: 'cairo',
    destinationName: 'Cairo',
    country: 'Egypt',
    days: 2,
    travelers: 2,
    budget: 400,
    currency: 'USD',
    travelStyle: 'culture',
    interests: ['pyramids', 'museum'],
    candidateActivities: getActivitiesForDestination('cairo'),
  };

  it('validates a correct AI proposal and calculates deterministic costs', () => {
    const validProposal: AIPlanOutput = {
      tripTitle: '2-Day Cairo Pharaonic Expedition',
      summary: 'Explore Giza Pyramids and Grand Egyptian Museum.',
      days: [
        {
          dayNumber: 1,
          theme: 'Ancient Pyramids & Nile',
          items: [
            {
              activityId: 'act-cairo-pyramids',
              suggestedStartTime: '09:30 AM',
              suggestedDurationMinutes: 180,
              selectionReason: 'Iconic world wonder.',
            },
            {
              activityId: 'act-cairo-gem',
              suggestedStartTime: '01:30 PM',
              suggestedDurationMinutes: 150,
              selectionReason: 'Tutankhamun collection.',
            },
            {
              activityId: 'act-cairo-khan-bazaar',
              suggestedStartTime: '06:30 PM',
              suggestedDurationMinutes: 120,
              selectionReason: 'Historic evening market.',
            },
          ],
        },
      ],
    };

    const result = itineraryValidator.validateAndRepair(sampleInput, validProposal);

    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.repairedPlan).toBeDefined();
    expect(result.repairedPlan!.destinationId).toBe('cairo');
    // Deterministic cost calculation for 2 days for 2 travelers: 196
    expect(result.repairedPlan!.totalEstimatedCost).toBe(196);
    expect(result.repairedPlan!.isWithinBudget).toBe(true);
  });

  it('rejects and safely repairs hallucinated / unknown activity IDs', () => {
    const hallucinatedProposal: AIPlanOutput = {
      tripTitle: 'Hallucinated Cairo Trip',
      summary: 'Trip with fake activity IDs.',
      days: [
        {
          dayNumber: 1,
          items: [
            {
              activityId: 'act-fake-pyramid-999', // Hallucinated ID!
              suggestedStartTime: '09:30 AM',
              selectionReason: 'Fake activity.',
            },
          ],
        },
      ],
    };

    const result = itineraryValidator.validateAndRepair(sampleInput, hallucinatedProposal);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Invalid or unverified activity ID 'act-fake-pyramid-999'");
    expect(result.repairedPlan).toBeDefined();
    // Substituted with valid candidate
    expect(result.repairedPlan!.days[0].items[0].activity.destinationId).toBe('cairo');
  });

  it('detects cross-destination leakage and substitutes valid destination activity', () => {
    const crossDestinationProposal: AIPlanOutput = {
      tripTitle: 'Mixed Destination Proposal',
      summary: 'Includes Tokyo activity in Cairo proposal.',
      days: [
        {
          dayNumber: 1,
          items: [
            {
              activityId: 'act-tokyo-tsukiji', // Tokyo activity inside Cairo trip!
              suggestedStartTime: '09:30 AM',
              selectionReason: 'Cross-destination leak.',
            },
          ],
        },
      ],
    };

    const result = itineraryValidator.validateAndRepair(sampleInput, crossDestinationProposal);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Invalid or unverified activity ID 'act-tokyo-tsukiji'");
    expect(result.repairedPlan!.days[0].items[0].activity.destinationId).toBe('cairo');
  });

  it('detects budget overruns and appends warnings', () => {
    const tightBudgetInput: AIPlanInput = {
      ...sampleInput,
      budget: 50, // Insufficient budget for 2 people over 2 days
    };

    const validProposal: AIPlanOutput = {
      tripTitle: 'Cairo Trip',
      summary: 'Cairo trip on tight budget.',
      days: [
        {
          dayNumber: 1,
          items: [
            { activityId: 'act-cairo-pyramids', suggestedStartTime: '09:30 AM', selectionReason: 'Pyramids' },
          ],
        },
      ],
    };

    const result = itineraryValidator.validateAndRepair(tightBudgetInput, validProposal);

    expect(result.repairedPlan!.isWithinBudget).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('exceeds your allocated budget');
  });

  it('hybrid planning service falls back gracefully if AI adapter throws an error', async () => {
    class FailingAIAdapter implements IAIPlanningAdapter {
      public async generatePlanProposal(): Promise<AIPlanOutput> {
        throw new Error('AI Provider connection timeout (503)');
      }
    }

    const hybridService = new HybridPlanningService(new FailingAIAdapter());

    const plan = await hybridService.planTrip({
      destinationId: 'tokyo',
      days: 1,
      travelers: 1,
      budget: 300,
      travelStyle: 'foodie',
    });

    expect(plan).toBeDefined();
    expect(plan.destinationId).toBe('tokyo');
    expect(plan.days.length).toBe(1);
    expect(plan.days[0].items[0].activity.destinationId).toBe('tokyo');
  });

  it('fallback deterministic adapter generates valid proposal contract', async () => {
    const adapter = new FallbackDeterministicAdapter();
    const proposal = await adapter.generatePlanProposal(sampleInput);

    expect(proposal.tripTitle).toContain('Cairo');
    expect(proposal.days.length).toBe(2);
    expect(proposal.days[0].items[0].activityId).toBeDefined();
  });
});
