/** ImmoFinder GR — pure logic (no I/O): matching, filters, verification, drafts. Every stored fact must be verifiable in fetched text. */
export interface ImmoConfig {
  municipalities: string[];
  /** Two fixed 22-commune groups for Settings toggles. */
  municipalityGroups?: { group1: { label: string; municipalities: string[] }; group2: { label: string; municipalities: string[] } };
  stopAgencies: string[]; minRooms: number; platformDomains: string[];
  sources: { id: string; url: string; phase: number; cityUrl?: string; detailPattern?: string; cutMarkers?: string[]; privateTitleHint?: string; maxDetailPages?: number; indexUrls?: string[] }[];
  fetch: { userAgent: string; perHostDelayMs: number; respectRobotsTxt: boolean };
  limits: { maxDetailPagesPerSource: number; recheckAfterDays: number; fetchTimeoutMs: number; maxPageBytes: number };
  estCostPerLlmCallUsd: number;
  estCostPerSearchUsd?: number;
  driveFolderId?: string;
  discovery?: { enabled: boolean; communesPerRun: number; resultsPerQuery: number; maxPagesPerRun: number; queries: string[]; portalQueries?: string[]; fallbackPortalQueries?: string[]; portalHosts?: string[]; portalSources?: { id: string; label: string; host: string }[]; maxCandidatesPerQuery?: number; snippetOnlyHosts: string[]; skipHosts: string[]; /** Min delay between Serper calls (rate limit). */ serperMinIntervalMs?: number; /** Soft cap on Serper calls per rolling minute. */ serperMaxPerMinute?: number; };
  contactEnrichment?: {
    enabled: boolean;
    maxExtraSearchesPerRun?: number;
    maxReverseImagePerRun?: number;
    maxCandidatePagesPerListing?: number;
    useReverseImage?: boolean;
    useSecondarySearch?: boolean;
    skipHosts?: string[];
    snippetOnlyHosts?: string[];
  };
  quality?: {
    maxMonthlyRentChf?: number;
    maxListingAgeDays?: number;
    requirePrice?: boolean;
    rejectNonMonthly?: boolean;
    rejectSeekerPosts?: boolean;
    requireContact?: boolean;
  };
  runMaxDurationMs?: number;
  priorityWaveMs?: number;
}

export function norm(s: string): string {
  return String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// EMERGENCY PARTIAL - full restore needs complete file
export function parseRooms(text: string): { rooms: number; basis: 'zimmer' | 'bedrooms' } | null {
  let t = String(text ?? '').replace(/(\d{1,2})\s*[½]/g, '$1.5').replace(/½/g, '.5').replace(/,(\d)/g, '.$1');
  t = t.replace(/(\d{1,2})\s+1\/2/g, '$1.5');
  const labeled = [...t.matchAll(/(?:zimmer|zi\.?|rooms?|pieces?)\s*[:=]?\s*(\d{1,2}(?:\.\d)?)/gi)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 20);
  const z = [...t.matchAll(/(\d{1,2}(?:\.\d)?)\s*[- ]?\s*(?:zimmer|zi\b|zi\.|rooms?|pieces?|-?zimmerwohnung)/gi)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 20);
  const allZ = [...labeled, ...z];
  if (allZ.length) return { rooms: Math.max(...allZ), basis: 'zimmer' };
  const b = [...t.matchAll(/(\d{1,2})\s*[- ]?\s*(?:schlafzimmer|bedrooms?)/gi)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 15);
  return b.length ? { rooms: Math.max(...b) + 1, basis: 'bedrooms' } : null;
}
