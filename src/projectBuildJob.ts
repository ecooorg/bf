/** Shared client-side handling for the staged App Builder's HTTP 202 job contract. */
import { stagedArchitectNote } from './architectNote.ts';

export type BuildJobResult = {
  jobId?: string;
  status?: string;
  stage?: string;
  downloadUrl?: string;
  goalImplemented?: boolean | null;
  /** A3 Complex Software Architect outcome. */
  outcome?: 'SUCCESS' | 'PARTIAL' | 'FAILED' | null;
  error?: { code?: string; message?: string } | string | null;
  callsUsed?: number;
  callsBudget?: number;
  units?: Array<{ id: string; path?: string | null; status?: string; attempts?: number }>;
  report?: {
    status?: string;
    outcome?: 'SUCCESS' | 'PARTIAL' | 'FAILED' | null;
    failureReason?: string | null;
    failedStage?: string | null;
    checksDeclared?: string[];
    checksRun?: string[];
    checksNotRun?: string[];
  } | null;
  diagnosticsUrl?: string;
  note?: string;
  taskId?: string;
  codeTask?: { status?: string; statusReason?: string; [key: string]: unknown };
  stack?: string;
  failedStage?: string | null;
  failureReason?: string | null;
};

async function getData<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin' });
  const payload = (await response.json().catch(() => ({}))) as { success?: boolean; data?: T; error?: string };
  if (!response.ok || payload.success === false || payload.data === undefined) {
    throw new Error(payload.error || `Build status request failed (${response.status})`);
  }
  return payload.data;
}

export async function waitForProjectBuild(
  projectId: string,
  initial: BuildJobResult,
  onProgress?: (job: BuildJobResult) => void,
): Promise<BuildJobResult> {
  if (!initial.jobId) return initial;
  onProgress?.(initial);
  const statusUrl = `/api/projects/${encodeURIComponent(projectId)}/code/build/${encodeURIComponent(initial.jobId)}`;
  let consecutiveErrors = 0;
  for (let i = 0; i < 240; i++) {
    try {
      const job = await getData<BuildJobResult>(statusUrl);
      consecutiveErrors = 0;
      onProgress?.(job);
      if (['done', 'failed', 'cancelled'].includes(String(job.status))) {
        const errMsg =
          typeof job.error === 'string'
            ? job.error
            : job.error && typeof job.error === 'object'
              ? job.error.message
              : undefined;
        const note = stagedArchitectNote({
          outcome: job.outcome ?? job.report?.outcome ?? null,
          goalImplemented: job.goalImplemented,
          status: job.status,
          failureReason: job.report?.failureReason ?? job.failureReason ?? null,
          failedStage: job.report?.failedStage ?? job.failedStage ?? null,
          errorMessage: errMsg ?? null,
        });
        return { ...job, note };
      }
    } catch (error) {
      consecutiveErrors++;
      if (consecutiveErrors >= 5) {
        return {
          ...initial,
          status: 'unknown',
          outcome: 'FAILED',
          note: `The build was started, but status could not be retrieved after five attempts. Reopen the project and check diagnostics for job ${initial.jobId}. (${String((error as Error)?.message || error)})`,
        };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return {
    ...initial,
    status: 'running',
    note: `Build is still running (job ${initial.jobId}). Open the project and check status again; do not submit the same task repeatedly.`,
  };
}
