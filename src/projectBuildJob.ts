/** Shared client-side handling for the staged App Builder's HTTP 202 job contract. */
export type BuildJobResult = {
  jobId?: string; status?: string; stage?: string; downloadUrl?: string;
  goalImplemented?: boolean | null; error?: { code?: string; message?: string } | string | null;
  report?: { status?: string; failureReason?: string | null } | null;
  diagnosticsUrl?: string; note?: string; taskId?: string; codeTask?: { status?: string; statusReason?: string; [key: string]: unknown }; stack?: string;
};

async function getData<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin' });
  const payload = await response.json().catch(() => ({})) as { success?: boolean; data?: T; error?: string };
  if (!response.ok || payload.success === false || payload.data === undefined) throw new Error(payload.error || `Build status request failed (${response.status})`);
  return payload.data;
}

export async function waitForProjectBuild(projectId: string, initial: BuildJobResult, onProgress?: (job: BuildJobResult) => void): Promise<BuildJobResult> {
  if (!initial.jobId) return initial;
  const statusUrl = `/api/projects/${encodeURIComponent(projectId)}/code/build/${encodeURIComponent(initial.jobId)}`;
  let consecutiveErrors = 0;
  for (let i = 0; i < 240; i++) {
    try {
      const job = await getData<BuildJobResult>(statusUrl);
      consecutiveErrors = 0;
      onProgress?.(job);
      if (['done', 'failed', 'cancelled'].includes(String(job.status))) {
        if (job.status === 'done' && job.downloadUrl) return { ...job, note: job.goalImplemented === true ? 'Build complete and validated. Download the source ZIP.' : `ZIP produced, but validation did not confirm the full goal. ${job.report?.failureReason || ''}`.trim() };
        return { ...job, note: `Build ${job.status}. ${typeof job.error === 'string' ? job.error : (job.error && typeof job.error === 'object' ? job.error.message : undefined) || job.report?.failureReason || 'No ZIP was produced.'} Check diagnostics and revise the task or retry later.` };
      }
    } catch (error) {
      consecutiveErrors++;
      if (consecutiveErrors >= 5) return { ...initial, status: 'unknown', note: `The build was started, but status could not be retrieved after five attempts. Reopen the project and check diagnostics for job ${initial.jobId}. (${String((error as Error)?.message || error)})` };
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return { ...initial, status: 'running', note: `Build is still running (job ${initial.jobId}). Open the project and check status again; do not submit the same task repeatedly.` };
}
