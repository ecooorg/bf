/**
 * C131 WP3 offline pipeline: snapshot → classify → owner → level.
 * Pure, zero network. Used by the production source-first runner and invariant replay.
 */

import { classifyPage, type PageSnapshot, type ClassifyConfig, type ClassifyResult } from './classify.ts';
import { extractOwnerEvidence, promoteLevel, type OwnerEvidence } from './owner.ts';
import type { R7RejectCode } from './taxonomy.ts';

export interface PipelineInput {
  snapshot: PageSnapshot;
  config: ClassifyConfig;
  sourceId?: string;
}

export interface PipelineOutput {
  level: 'L0' | 'L1' | 'L2' | 'L3';
  rejectCode: R7RejectCode | null;
  legacyReason: string | null;
  classify: ClassifyResult;
  owner: OwnerEvidence | null;
  sourceId: string | null;
}

/**
 * Run the pure admission path on one page snapshot.
 */
export function processSnapshot(input: PipelineInput): PipelineOutput {
  const classify = classifyPage(input.snapshot, input.config);
  if (classify.level === 'L0') {
    return {
      level: 'L0',
      rejectCode: classify.rejectCode,
      legacyReason: classify.legacyReason,
      classify,
      owner: null,
      sourceId: input.sourceId || null,
    };
  }

  const owner = extractOwnerEvidence(
    input.snapshot.title,
    input.snapshot.pageText.slice(0, 4_000),
    input.config.stopAgencies,
    input.sourceId,
  );
  const level = promoteLevel(classify.level, owner);

  return {
    level,
    rejectCode: null,
    legacyReason: null,
    classify,
    owner,
    sourceId: input.sourceId || null,
  };
}

/**
 * Batch offline replay over retained snapshots (invariant checks).
 */
export function replaySnapshots(
  items: Array<{ snapshot: PageSnapshot; sourceId?: string }>,
  config: ClassifyConfig,
): {
  total: number;
  byLevel: Record<string, number>;
  byReject: Partial<Record<R7RejectCode, number>>;
  results: PipelineOutput[];
} {
  const byLevel: Record<string, number> = { L0: 0, L1: 0, L2: 0, L3: 0 };
  const byReject: Partial<Record<R7RejectCode, number>> = {};
  const results: PipelineOutput[] = [];

  for (const item of items) {
    const out = processSnapshot({ snapshot: item.snapshot, config, sourceId: item.sourceId });
    results.push(out);
    byLevel[out.level] = (byLevel[out.level] || 0) + 1;
    if (out.rejectCode) {
      byReject[out.rejectCode] = (byReject[out.rejectCode] || 0) + 1;
    }
  }

  return { total: items.length, byLevel, byReject, results };
}
