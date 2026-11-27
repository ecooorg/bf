/** ImmoGR domain contracts. This file deliberately has no legacy property-search imports. */
export type ImmoGRResultCategory = 'direct_rental' | 'private_owner_prospect';
export type ImmoGROwnerClass = 'private_owner' | 'agency' | 'management_company' | 'tour_operator' | 'intermediary' | 'unknown';
export type ImmoGRPricePeriod = 'month' | 'week' | 'night' | 'season' | 'unknown';
export interface ImmoGREvidence {
  field: string; value: string; quote: string; sourceUrl: string; pageBlock: string;
  extractionMethod: 'structured_data' | 'source_adapter' | 'deterministic_parser' | 'llm_interpretation' | 'human_review';
  observedAt: string;
}
export interface ImmoGRListingCandidate {
  canonicalUrl: string; category: ImmoGRResultCategory; municipalityId: string | null;
  propertyType: 'apartment' | 'house' | 'chalet' | 'other' | 'unknown';
  ownerClass: ImmoGROwnerClass; monthlyRentChf: number | null; pricePeriod: ImmoGRPricePeriod;
  evidence: ImmoGREvidence[];
}
