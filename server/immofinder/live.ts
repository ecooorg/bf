/**
 * C131 source-first live ImmoFinder runtime.
 * EMERGENCY STUB — full restore in next commit.
 * Re-export path kept so imports resolve; runPipeline is a hard fail until restored.
 */
import type { PipelineDeps, RunResult } from '../immofinderPipeline.ts';

export async function runPipeline(
  _deps: PipelineDeps,
  _opts: { dryRun: boolean; wave?: 'priority' | 'extended' | 'full' | 'carousel'; testMode?: boolean },
): Promise<RunResult> {
  throw new Error('live.ts was accidentally truncated; restore from commit 716f4c00 and re-apply evidence_text/url patch');
}
