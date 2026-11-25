import type { ImmoConfig } from './immofinderCore.ts';

/** Strict bounded budget for agent/CI smoke searches. Dry-run is enforced by the caller. */
export function applyImmoFinderTestBudget(config: ImmoConfig): ImmoConfig {
  const discovery = config.discovery;
  return {
    ...config,
    sources: config.sources.slice(0, 3),
    discovery: discovery ? {
      ...discovery,
      communesPerRun: 1,
      resultsPerQuery: Math.min(discovery.resultsPerQuery, 5),
      maxPagesPerRun: Math.min(discovery.maxPagesPerRun, 3),
      maxCandidatesPerQuery: Math.min(discovery.maxCandidatesPerQuery ?? 4, 5),
      queries: discovery.queries.slice(0, 2),
      portalQueries: (discovery.portalQueries ?? []).slice(0, 2),
      fallbackPortalQueries: [],
    } : undefined,
    limits: { ...config.limits, maxDetailPagesPerSource: Math.min(config.limits.maxDetailPagesPerSource, 2) },
    contactEnrichment: config.contactEnrichment
      ? { ...config.contactEnrichment, enabled: false, maxExtraSearchesPerRun: 0, maxReverseImagePerRun: 0 }
      : undefined,
    runMaxDurationMs: Math.min(config.runMaxDurationMs ?? 90_000, 90_000),
    priorityWaveMs: Math.min(config.priorityWaveMs ?? 30_000, 30_000),
  };
}
