import type { AIPlanInput, AIPlanOutput, AIPlanDayProposal } from '../types';

/**
 * Provider-independent interface for AI planning adapters.
 * decouples React UI & application logic from specific AI model providers (Gemini, Claude, OpenAI, etc.).
 */
export interface IAIPlanningAdapter {
  generatePlanProposal(input: AIPlanInput): Promise<AIPlanOutput>;
}

/**
 * Fallback / Offline Adapter:
 * Produces a structured proposal using factual candidate activity IDs
 * without requiring an active external network connection or API key.
 */
export class FallbackDeterministicAdapter implements IAIPlanningAdapter {
  public async generatePlanProposal(input: AIPlanInput): Promise<AIPlanOutput> {
    const days: AIPlanDayProposal[] = [];
    const candidates = input.candidateActivities || [];
    const hasCandidates = candidates.length > 0;

    for (let dayIdx = 1; dayIdx <= input.days; dayIdx++) {
      const items: AIPlanDayProposal['items'] = [];

      if (hasCandidates) {
        const morningAct = candidates[(dayIdx * 3 - 3) % candidates.length];
        const afternoonAct = candidates[(dayIdx * 3 - 2) % candidates.length];
        const eveningAct = candidates[(dayIdx * 3 - 1) % candidates.length];

        if (morningAct) {
          items.push({
            activityId: morningAct.id,
            suggestedStartTime: '09:30 AM',
            suggestedDurationMinutes: morningAct.estimatedDurationMinutes || 120,
            selectionReason: `Selected for morning timing and ${input.travelStyle} preference.`,
          });
        }

        if (afternoonAct) {
          items.push({
            activityId: afternoonAct.id,
            suggestedStartTime: '01:30 PM',
            suggestedDurationMinutes: afternoonAct.estimatedDurationMinutes || 150,
            selectionReason: `Selected for afternoon heritage exploration.`,
          });
        }

        if (eveningAct) {
          items.push({
            activityId: eveningAct.id,
            suggestedStartTime: '06:30 PM',
            suggestedDurationMinutes: eveningAct.estimatedDurationMinutes || 90,
            selectionReason: `Selected for golden hour evening stroll.`,
          });
        }
      }

      days.push({
        dayNumber: dayIdx,
        theme: `Day ${dayIdx} · ${input.destinationName} ${input.travelStyle.toUpperCase()} Highlights`,
        items,
      });
    }

    return {
      tripTitle: `${input.days}-Day ${input.destinationName} ${input.travelStyle.toUpperCase()} Experience`,
      summary: `A structured ${input.days}-day itinerary through ${input.destinationName} tailored for ${input.travelers} traveller(s).`,
      days,
      assumptions: ['Standard activity durations', 'Deterministic activity candidate pool'],
    };
  }
}

/**
 * Server Proxy Adapter (Prepared for Future Backend Integration):
 * Communicates with a secure backend API endpoint (e.g. POST /api/plan)
 * to keep AI API keys safely on the server side (never in client-side Vite code).
 */
export class ServerProxyAIAdapter implements IAIPlanningAdapter {
  private apiEndpoint: string;

  constructor(apiEndpoint = '/api/plan') {
    this.apiEndpoint = apiEndpoint;
  }

  public async generatePlanProposal(input: AIPlanInput): Promise<AIPlanOutput> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      return (await response.json()) as AIPlanOutput;
    } catch (err) {
      throw new Error(`Server proxy AI adapter failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
