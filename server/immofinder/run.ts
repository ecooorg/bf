/**
 * C131 WP3 run planner skeleton — budgets, delta detection by index-page URL-set hash,
 * source ordering. Does not execute fetches or mutate store; the production worker
 * enters through live.ts. This pure planner is not currently wired into that route.
 */

import { contentHash, hostFromUrl, isHostBlocked, type HostState } from './access.ts';
import type { R7RejectCode } from './taxonomy.ts';

export interface SourceDescriptor {
  id: string;
  phase: number;
  indexUrls: string[];
  detailPattern?: string;
  maxDetailPages: number;
}

export interface RunBudget {
  maxSerperQueries: number;
  maxDetailPages: number;
  maxBrowserRenders: number;
  maxDurationMs: number;
  maxCostUsd: number;
}

export const DEFAULT_BUDGET: RunBudget = {
  maxSerperQueries: 40,
  maxDetailPages: 80,
  maxBrowserRenders: 4,
  maxDurationMs: 600_000,
  maxCostUsd: 0.5,
};

export interface IndexFingerprint {
  sourceId: string;
  indexUrl: string;
  urlSetHash: string;
  urlCount: number;
  capturedAt: string;
}

export function indexUrlSetHash(detailUrls: string[]): string {
  const sorted = [...new Set(detailUrls.map((u) => u.trim().toLowerCase()))].sort();
  return contentHash(sorted.join('\n'));
}

export function shouldSkipIndex(
  sourceId: string,
  indexUrl: string,
  currentUrls: string[],
  prior: IndexFingerprint | null,
): { skip: boolean; reason: string | null; fingerprint: IndexFingerprint } {
  const hash = indexUrlSetHash(currentUrls);
  const fp: IndexFingerprint = {
    sourceId,
    indexUrl,
    urlSetHash: hash,
    urlCount: currentUrls.length,
    capturedAt: new Date().toISOString(),
  };
  if (prior && prior.urlSetHash === hash && prior.urlCount === currentUrls.length) {
    return { skip: true, reason: 'index_unchanged', fingerprint: fp };
  }
  return { skip: false, reason: null, fingerprint: fp };
}

export interface PlannedSource {
  id: string;
  phase: number;
  indexUrls: string[];
  maxDetailPages: number;
  blocked: boolean;
}

export function planSources(
  sources: SourceDescriptor[],
  hostStates: Map<string, HostState> = new Map(),
): PlannedSource[] {
  return sources
    .map((s) => {
      const hosts = s.indexUrls.map(hostFromUrl).filter(Boolean);
      const blocked = hosts.some((h) => isHostBlocked(h) || hostStates.get(h)?.status === 'blocked');
      return {
        id: s.id,
        phase: s.phase,
        indexUrls: s.indexUrls,
        maxDetailPages: s.maxDetailPages,
        blocked,
      };
    })
    .filter((s) => !s.blocked)
    .sort((a, b) => a.phase - b.phase || a.id.localeCompare(b.id));
}

export interface RunCounters {
  serperQueries: number;
  candidates: number;
  fetched: number;
  kept: number;
  byReject: Partial<Record<R7RejectCode, number>>;
  costUsd: number;
  durationMs: number;
}

export function emptyCounters(): RunCounters {
  return {
    serperQueries: 0,
    candidates: 0,
    fetched: 0,
    kept: 0,
    byReject: {},
    costUsd: 0,
    durationMs: 0,
  };
}

export function budgetExhausted(c: RunCounters, b: RunBudget): string | null {
  if (c.serperQueries >= b.maxSerperQueries) return 'serper_cap';
  if (c.fetched >= b.maxDetailPages) return 'detail_cap';
  if (c.durationMs >= b.maxDurationMs) return 'time_cap';
  if (c.costUsd >= b.maxCostUsd) return 'cost_cap';
  return null;
}
