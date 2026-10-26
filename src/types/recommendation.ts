export interface RecommendationCriteria {
  destinationId?: string;
  userTags: string[];
  maxPrice?: number;
  minRating?: number;
}

export interface RecommendationItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  score: number;
  reason: string;
  itemId: string;
}
