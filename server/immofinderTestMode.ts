import type { ImmoConfig } from './immofinderCore.ts';

/** Strict bounded budget for agent/CI smoke searches. Caller enforces the secret + dry-run contract. */
export function applyImmoFinderTestBudget(config: ImmoConfig): ImmoConfig {
  const discovery = config.discovery;
  const portalQueries = discovery?.portalQueries ?? [];
  return {
    ...config,
    sources: config.sources.map((source) => ({ ...source, maxDetailPages: Math.min(Number(source.maxDetailPages ?? 2) || 2, 2) })),
    fetch: {
      ...config.fetch,
      browserRenderHosts: ['newhome.ch'],
      browserRenderMinTextChars: 1200,
      maxBrowserRendersPerRun: 2,
    },
    discovery: discovery ? {
      ...discovery,
      communesPerRun: 1,
      resultsPerQuery: Math.min(discovery.resultsPerQuery, 3),
      maxPagesPerRun: Math.min(discovery.maxPagesPerRun, Math.max(1, discovery.queries.length + portalQueries.length)),
      maxCandidatesPerQuery: Math.min(discovery.maxCandidatesPerQuery ?? 3, 3),
      queries: discovery.queries,
      portalQueries,
      fallbackPortalQueries: [],
    } : undefined,
    limits: { ...config.limits, maxDetailPagesPerSource: Math.min(config.limits.maxDetailPagesPerSource, 2) },
    contactEnrichment: config.contactEnrichment
      ? { ...config.contactEnrichment, enabled: false, maxExtraSearchesPerRun: 0, maxReverseImagePerRun: 0 }
      : undefined,
    runMaxDurationMs: 120_000,
    priorityWaveMs: Math.min(config.priorityWaveMs ?? 45_000, 45_000),
  };
}
