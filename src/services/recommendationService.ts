import type { RecommendationCriteria, RecommendationItem } from '../types';

export interface IRecommendationService {
  getRecommendations(criteria: RecommendationCriteria): RecommendationItem[];
}

class RecommendationService implements IRecommendationService {
  getRecommendations(_criteria: RecommendationCriteria): RecommendationItem[] {
    throw new Error('RecommendationService logic not implemented yet.');
  }
}

export const recommendationService = new RecommendationService();
