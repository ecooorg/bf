/** User-facing note for staged App Builder job terminal states (client-safe, no appBuilder import). */

export type ArchitectOutcome = 'SUCCESS' | 'PARTIAL' | 'FAILED';

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
