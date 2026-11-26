/**
 * C131 WP5 dry-run — parallel admission via pure processSnapshot without touching store.
 * Used to compare new-engine levels/rejects against live candidates before cut-over.
 * Zero network; caller supplies already-fetched snapshots.
 */

import { processSnapshot, type PipelineInput, type PipelineOutput } from './pipeline.ts';
import type { ClassifyConfig } from './classify.ts';
import type { R7RejectCode } from './taxonomy.ts';

export interface DryRunItem {
  snapshot: PipelineInput['snapshot'];
  sourceId?: string;
  /** Optional legacy reason string for side-by-side comparison. */
  legacyReason?: string | null;
  legacyKept?: boolean;
}

export interface DryRunRow {
  url: string;
  level: PipelineOutput['level'];
  rejectCode: R7RejectCode | null;
  rooms: number | null;
  locality: string | null;
  private: boolean;
  contactRoute: string;
  legacyReason: string | null;
  legacyKept: boolean | null;
  agree: boolean | null;
}

export interface DryRunReport {
  total: number;
  byLevel: Record<string, number>;
  byReject: Partial<Record<R7RejectCode, number>>;
  agreeCount: number;
  disagreeCount: number;
  rows: DryRunRow[];
}

/**
 * Run the new pure engine over a batch of snapshots (offline, deterministic).
 * When legacyReason/legacyKept are provided, agreement is recorded for cut-over confidence.
 */
export function dryRunBatch(items: DryRunItem[], config: ClassifyConfig): DryRunReport {
  const byLevel: Record<string, number> = { L0: 0, L1: 0, L2: 0, L3: 0 };
  const byReject: Partial<Record<R7RejectCode, number>> = {};
  const rows: DryRunRow[] = [];
  let agreeCount = 0;
  let disagreeCount = 0;

  for (const item of items) {
    const out = processSnapshot({
      snapshot: item.snapshot,
      config,
      sourceId: item.sourceId,
    });
    byLevel[out.level] = (byLevel[out.level] || 0) + 1;
    if (out.rejectCode) {
      byReject[out.rejectCode] = (byReject[out.rejectCode] || 0) + 1;
    }

    const newKept = out.level === 'L1' || out.level === 'L2' || out.level === 'L3';
    let agree: boolean | null = null;
    if (typeof item.legacyKept === 'boolean') {
      agree = item.legacyKept === newKept;
      if (agree) agreeCount += 1;
      else disagreeCount += 1;
    }

    rows.push({
      url: item.snapshot.finalUrl || item.snapshot.requestedUrl,
      level: out.level,
      rejectCode: out.rejectCode,
      rooms: typeof out.classify.rooms?.value === 'number' ? out.classify.rooms.value : null,
      locality: typeof out.classify.locality?.value === 'string' ? out.classify.locality.value : null,
      private: Boolean(out.owner?.isPrivateOwner),
      contactRoute: out.owner?.contactRoute || 'none',
      legacyReason: item.legacyReason ?? null,
      legacyKept: typeof item.legacyKept === 'boolean' ? item.legacyKept : null,
      agree,
    });
  }

  return {
    total: items.length,
    byLevel,
    byReject,
    agreeCount,
    disagreeCount,
    rows,
  };
}
