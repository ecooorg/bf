import type { ImmoConfig } from './immofinderCore.ts';

/** Strict bounded budget for agent/CI smoke searches. Caller enforces the secret + dry-run contract. */
export function applyImmoFinderTestBudget(config: ImmoConfig): ImmoConfig {
  const discovery = config.discovery;
  const portalQueries = discovery?.portalQueries ?? [];
  const newhomeQuery = portalQueries.find((query) => /site:newhome\.ch/i.test(query));
  const fallbackPortalQuery = portalQueries.find((query) => query !== newhomeQuery);
  return {
    ...config,
    sources: config.sources.slice(0, 3).map((source) => ({ ...source, maxDetailPages: 1 })),
    fetch: {
      ...config.fetch,
      browserRenderHosts: ['newhome.ch'],
      browserRenderMinTextChars: 1200,
      maxBrowserRendersPerRun: 1,
    },
    discovery: discovery ? {
      ...discovery,
      communesPerRun: 1,
      resultsPerQuery: Math.min(discovery.resultsPerQuery, 3),
      maxPagesPerRun: Math.min(discovery.maxPagesPerRun, 3),
      maxCandidatesPerQuery: Math.min(discovery.maxCandidatesPerQuery ?? 3, 3),
      queries: discovery.queries.slice(0, 1),
      portalQueries: [newhomeQuery, fallbackPortalQuery].filter((query): query is string => Boolean(query)),
      fallbackPortalQueries: [],
    } : undefined,
    limits: { ...config.limits, maxDetailPagesPerSource: Math.min(config.limits.maxDetailPagesPerSource, 1) },
    contactEnrichment: config.contactEnrichment
      ? { ...config.contactEnrichment, enabled: false, maxExtraSearchesPerRun: 0, maxReverseImagePerRun: 0 }
      : undefined,
    runMaxDurationMs: Math.min(config.runMaxDurationMs ?? 60_000, 60_000),
    priorityWaveMs: Math.min(config.priorityWaveMs ?? 30_000, 30_000),
  };
}
