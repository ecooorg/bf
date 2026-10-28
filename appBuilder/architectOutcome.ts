/**
 * P118 — A3 Complex Software Architect completion mapping (pure).
 * SUCCESS never without a non-empty downloadable deliverable; PARTIAL is explicit.
 */
import type { ArchitectOutcome } from './core-types.ts';

export type { ArchitectOutcome };

export type PipelineOutcomeInput = {
  fileCount: number;
  hasDownload: boolean;
  /** Model slice applied custom files toward the user goal. */
  sliceStatus: 'applied' | 'skipped' | 'failed';
  sliceReason?: string;
};

export type PipelineOutcomeResult = {
  outcome: ArchitectOutcome;
  goalImplemented: boolean;
  failedStage?: string;
  failureReason?: string;
  note: string;
};

/** Map pipeline (IR → scaffold → optional slice → ZIP) to A3 outcome. */
export function pipelineArchitectOutcome(input: PipelineOutcomeInput): PipelineOutcomeResult {
  const { fileCount, hasDownload, sliceStatus, sliceReason = '' } = input;
  if (fileCount <= 0 || !hasDownload) {
    return {
      outcome: 'FAILED',
      goalImplemented: false,
      failedStage: fileCount <= 0 ? 'generate' : 'package',
      failureReason: fileCount <= 0 ? 'empty_artifact' : 'download_unavailable',
      note: 'No downloadable project archive was produced. Check diagnostics and retry with a clearer goal.',
    };
  }
  if (sliceStatus === 'applied') {
    return {
      outcome: 'SUCCESS',
      goalImplemented: true,
      note: 'IR → scaffold → model-written files → ZIP. Upload to GitHub and connect Render/Railway manually. Generated code was not executed on BiForge.',
    };
  }
  const reason = sliceReason || (sliceStatus === 'failed' ? 'model slice failed' : 'model slice skipped');
  return {
    outcome: 'PARTIAL',
    goalImplemented: false,
    failedStage: 'slice',
    failureReason: sliceStatus === 'failed' ? 'SLICE_FAILED' : 'SLICE_SKIPPED',
    note: `PARTIAL: ZIP is a generic starter; your goal was not fully implemented (${reason}). Download only if a starter is enough; otherwise revise the goal and retry.`,
  };
}

export type StagedNoteInput = {
  outcome?: ArchitectOutcome | null;
  goalImplemented?: boolean | null;
  status?: string;
  failureReason?: string | null;
  failedStage?: string | null;
  errorMessage?: string | null;
};

/** User-facing note for staged job terminal states. */
export function stagedArchitectNote(input: StagedNoteInput): string {
  const outcome = input.outcome;
  if (outcome === 'SUCCESS' || (input.status === 'done' && input.goalImplemented === true)) {
    return 'Build complete and validated. Download the source ZIP.';
  }
  if (outcome === 'PARTIAL' || (input.status === 'done' && input.goalImplemented === false)) {
    const why = input.failureReason ? ` ${input.failureReason}` : '';
    return `PARTIAL: ZIP produced, but validation did not confirm the full goal.${why}`.trim();
  }
  const stage = input.failedStage ? ` Failed stage: ${input.failedStage}.` : '';
  const why = input.failureReason || input.errorMessage || 'No ZIP was produced.';
  return `Build ${input.status || 'failed'}.${stage} ${why} Check diagnostics and revise the task or retry.`.replace(/\s+/g, ' ').trim();
}
