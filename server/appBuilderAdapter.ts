/** P93.3: connects the App Builder core ports to routeCall, PostgreSQL, artifacts and diagnostics. Active only with APP_BUILDER_ENGINE=staged. */
import crypto from 'node:crypto';
import { runBuild, SCHEMA_VERSION, type BuildInput, type ClockPort, type EventPayload, type EventPort, type JobState, type ModelPort, type ModelResult, type Ports, type StorePort } from '../appBuilder/index.ts';
import type { ProviderAdapter } from './adapter.ts';
import type { RegistryEntry } from './modelRegistry.ts';
import { routeCall, type RouterState } from './router.ts';
import { getPool } from './database.ts';
import { saveArtifact } from './artifactRepository.ts';
import { linkDiagnosticArtifact, recordDiagnostic } from './projectDiagnostics.ts';

export const stagedEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => env.APP_BUILDER_ENGINE === 'staged';
export const staleMs = (env: NodeJS.ProcessEnv = process.env): number => Math.max(5_000, Number(env.APP_BUILDER_STALE_MS) || 120_000);

export interface AdapterDeps { registry: RegistryEntry[]; adapters: Record<string, ProviderAdapter>; routerState: RouterState; modelId?: string; getPoolFn?: () => Promise<any> }

const iso = (v: unknown) => new Date(v as any).toISOString();
function rowToJob(r: any): JobState {
  return { schemaVersion: SCHEMA_VERSION, id: r.id, projectId: r.project_id, userId: r.user_id, status: r.status, stage: r.stage, spec: r.spec ?? null, plan: r.plan ?? null, callsUsed: r.calls_used, callsBudget: r.calls_budget, error: r.error ?? null, report: r.report ?? null, artifactId: r.artifact_id ?? null, createdAt: iso(r.created_at), updatedAt: iso(r.updated_at), heartbeatAt: iso(r.heartbeat_at) };
}

export function createStorePort(deps: Pick<AdapterDeps, 'getPoolFn'> = {}): StorePort & { taskText(jobId: string): Promise<string | null>; setTaskText(jobId: string, text: string): Promise<void> } {
  const pool = () => (deps.getPoolFn ?? getPool)();
  return {
    async saveJob(s) {
      // A cancelled job stays cancelled: late engine saves must not overwrite it.
      await (await pool()).query(
        `INSERT INTO app_build_jobs (id,project_id,user_id,status,stage,spec,plan,calls_used,calls_budget,error,report,artifact_id,schema_version,created_at,updated_at,heartbeat_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),now())
         ON CONFLICT (id) DO UPDATE SET status=CASE WHEN app_build_jobs.status='cancelled' THEN 'cancelled' ELSE EXCLUDED.status END, stage=EXCLUDED.stage, spec=EXCLUDED.spec, plan=EXCLUDED.plan, calls_used=EXCLUDED.calls_used, calls_budget=EXCLUDED.calls_budget, error=EXCLUDED.error, report=EXCLUDED.report, artifact_id=EXCLUDED.artifact_id, updated_at=now(), heartbeat_at=now()`,
        [s.id, s.projectId, s.userId, s.status, s.stage, s.spec && JSON.stringify(s.spec), s.plan && JSON.stringify(s.plan), s.callsUsed, s.callsBudget, s.error && JSON.stringify(s.error), s.report && JSON.stringify(s.report), s.artifactId, s.schemaVersion ?? SCHEMA_VERSION, s.createdAt]);
    },
    async loadJob(id) { const r = await (await pool()).query('SELECT * FROM app_build_jobs WHERE id=$1', [id]); return r.rows[0] ? rowToJob(r.rows[0]) : null; },
    async listResumable(olderThanMs) {
      const r = await (await pool()).query(`SELECT * FROM app_build_jobs WHERE status IN ('queued','running') AND heartbeat_at < now() - ($1::int * interval '1 millisecond') ORDER BY created_at LIMIT 20`, [Math.trunc(olderThanMs)]);
      return r.rows.map(rowToJob);
    },
    async putUnitResult(x) { await (await pool()).query('INSERT INTO app_build_unit_results (job_id,unit_id,cache_key,content,content_hash,created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [x.jobId, x.unitId, x.cacheKey, x.content, x.contentHash, x.createdAt]); },
    async getUnitResult(key) {
      const r = await (await pool()).query('SELECT job_id,unit_id,cache_key,content,content_hash,created_at FROM app_build_unit_results WHERE cache_key=$1 ORDER BY created_at DESC LIMIT 1', [key]);
      const x = r.rows[0]; return x ? { jobId: x.job_id, unitId: x.unit_id, cacheKey: x.cache_key, content: x.content, contentHash: x.content_hash, createdAt: iso(x.created_at) } : null;
    },
    async putArtifact(jobId, bytes, meta) {
      const job = await this.loadJob(jobId); if (!job) throw new Error('job not found');
      const artifactId = `app_zip_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
      await saveArtifact({ projectId: job.projectId, artifactId, filename: meta.filename, mime: meta.contentType, data: new Uint8Array(bytes), createdBy: 'app_builder_staged', derivedFrom: [`project:${job.projectId}`, `job:${jobId}`] });
      return artifactId;
    },
    async taskText(id) { const r = await (await pool()).query('SELECT task_text FROM app_build_jobs WHERE id=$1', [id]); return r.rows[0]?.task_text ?? null; },
    async setTaskText(id, text) { await (await pool()).query('UPDATE app_build_jobs SET task_text=$2 WHERE id=$1', [id, text]); },
  };
}

/** Maps the router outcome onto the typed ModelPort errors. */
export function createModelPort(deps: AdapterDeps, projectId: string): ModelPort {
  return {
    async complete(a): Promise<ModelResult> {
      const json = a.role === 'planner';
      const cascade = a.role === 'coder' ? 'STRONG' : 'LIGHT';
      const configured = registryForGeminiCascade(cascade);
      const registry = configured.length ? configured.filter((e) => deps.registry.some((d) => d.providerId === e.providerId && d.modelId === e.modelId)) : [];
      const routed = await routeCall({ requestId: `app-build-${projectId}-${crypto.randomBytes(4).toString('hex')}`, system: a.system, prompt: a.prompt, json, maxOutputTokens: a.maxOutputTokens, metadata: { role: `app_builder_${a.role}`, projectId } },
        { registry, adapters: deps.adapters, state: deps.routerState, required: json ? ['json_output'] : [], maxCalls: 1, timeoutMs: 90_000, sensitivity: 'normal', paidApproved: [], deadlineAt: Date.now() + 95_000 });
      const r = routed.response;
      if (routed.status === 'ok' && r) {
        const out = typeof r.output === 'string' ? r.output : JSON.stringify(r.output);
        const length = /length|max_tokens/i.test(r.finishReason ?? '');
        return { text: out, finishReason: length ? 'length' : r.finishReason ?? 'stop', modelId: `${r.providerId}/${r.modelId}`, usage: { promptTokens: r.usage.input, completionTokens: r.usage.output, totalTokens: r.usage.input + r.usage.output } };
      }
      const d = routed.decision; const last = d.attempts[d.attempts.length - 1];
      const why = [`router:${routed.status}`, d.reason, ...d.attempts.map((x) => `${x.model}:${x.errorClass ?? x.status}`), ...d.rejected.slice(0, 3).map((x) => `rejected ${x.model}:${x.reason}`)].filter(Boolean).join('; ').slice(0, 300);
      const cls = r?.errorClass ?? last?.errorClass;
      if (cls === 'PROVIDER_QUOTA' || d.rejected.some((x) => x.reason === 'cooldown' || x.reason.startsWith('quota:'))) return { code: 'rate_limited', message: why, retryAfterMs: r?.retryAfterMs ?? 30_000 };
      if (cls === 'INVALID_REQUEST') return { code: 'bad_request', message: why };
      if (cls === 'INVALID_OUTPUT') return { code: 'truncated', message: why };
      if (/timeout|abort/i.test(r?.rawRef ?? '') || /timeout/i.test(why)) return { code: 'timeout', message: why };
      return { code: 'unavailable', message: why };
    },
  };
}

const DIAG: Record<string, { event: string; status: string }> = {
  job_started: { event: 'BUILD_JOB_STARTED', status: 'STARTED' }, stage_changed: { event: 'BUILD_STAGE', status: 'STARTED' },
  unit_done: { event: 'BUILD_UNIT_DONE', status: 'PASS' }, unit_failed: { event: 'BUILD_UNIT_FAILED', status: 'FAIL' }, job_done: { event: 'BUILD_FINISHED', status: 'PASS' },
};
/** The job id is the diagnostic operation id, so the diagnostic export can find build-report.json. */
export function createEventPort(): EventPort {
  return { async emit(e: EventPayload) {
    const m = DIAG[e.type]; if (!m) return;
    const stage = e.type === 'stage_changed' ? String(e.data?.stage ?? 'stage') : e.type === 'job_done' ? 'done' : e.unitId ? `unit_${e.unitId}` : 'build';
    const ok = e.type !== 'job_done' || e.data?.goalImplemented === true;
    await recordDiagnostic({ operationId: e.jobId, event: m.event, stage, status: e.type === 'job_done' ? (ok ? 'PASS' : 'WARN') : m.status, ...(e.type === 'unit_failed' ? { errorCode: 'UNIT_FAILED' } : {}) });
  } };
}
export const realClock: ClockPort = { now: () => Date.now(), sleep: (ms, signal) => new Promise((resolve) => { const t = setTimeout(resolve, ms); signal?.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true }); }) };

const running = new Set<string>();
const aborts = new Map<string, AbortController>();
export const isRunning = (id: string) => running.has(id);

export async function startStagedBuild(deps: AdapterDeps, input: { projectId: string; userId: string; taskText: string; jobId?: string }): Promise<{ jobId: string }> {
  const store = createStorePort(deps); const jobId = input.jobId ?? crypto.randomUUID(); const now = new Date().toISOString();
  await store.saveJob({ schemaVersion: SCHEMA_VERSION, id: jobId, projectId: input.projectId, userId: input.userId, status: 'queued', stage: 'preflight', spec: null, plan: null, callsUsed: 0, callsBudget: 25, error: null, report: null, artifactId: null, createdAt: now, updatedAt: now, heartbeatAt: now });
  await store.setTaskText(jobId, input.taskText);
  await createEventPort().emit({ jobId, type: 'job_started', level: 'info' });
  void executeJob(deps, jobId);
  return { jobId };
}

/** Runs (or resumes) a job; completed units come from app_build_unit_results and cost no model calls. */
export async function executeJob(deps: AdapterDeps, jobId: string): Promise<void> {
  if (running.has(jobId)) return; running.add(jobId);
  const ac = new AbortController(); aborts.set(jobId, ac);
  const store = createStorePort(deps);
  try {
    const job = await store.loadJob(jobId); if (!job || job.status === 'done' || job.status === 'cancelled') return;
    const taskText = (await store.taskText(jobId)) ?? '';
    const ports: Ports = { model: createModelPort(deps, job.projectId), store, events: createEventPort(), clock: realClock };
    const input: BuildInput = { schemaVersion: SCHEMA_VERSION, jobId, projectId: job.projectId, userId: job.userId, taskText };
    const result = await runBuild(input, ports, { modelId: deps.modelId ?? process.env.APP_BUILDER_MODEL_ID ?? 'router', resumeFrom: job, signal: ac.signal, isCancelled: async () => (await store.loadJob(jobId))?.status === 'cancelled' });
    if (result.archive && result.state.status !== 'cancelled') {
      try {
        const artifactId = await store.putArtifact(jobId, result.archive, { filename: 'app-source.zip', contentType: 'application/zip' });
        result.state.artifactId = artifactId; await store.saveJob(result.state); await linkDiagnosticArtifact(jobId, artifactId);
      } catch (e) { result.state.error = { code: 'artifact_save_failed', message: String((e as Error)?.message ?? e).slice(0, 200) }; result.state.status = 'failed'; await store.saveJob(result.state); }
    }
  } catch (e) {
    try { const j = await store.loadJob(jobId); if (j && j.status !== 'cancelled') await store.saveJob({ ...j, status: 'failed', error: { code: 'engine_error', message: String((e as Error)?.message ?? e).slice(0, 300) } }); } catch { /* nothing more to do */ }
  } finally { running.delete(jobId); aborts.delete(jobId); }
}

export async function cancelStagedBuild(deps: Pick<AdapterDeps, 'getPoolFn'>, jobId: string): Promise<boolean> {
  const pool = await (deps.getPoolFn ?? getPool)();
  const r = await pool.query(`UPDATE app_build_jobs SET status='cancelled', updated_at=now() WHERE id=$1 AND status IN ('queued','running')`, [jobId]);
  aborts.get(jobId)?.abort();
  return (r.rowCount ?? 0) > 0;
}

/** Called at startup when the flag is on: restarts jobs whose heartbeat went stale (process restart). */
export async function resumeStaleJobs(deps: AdapterDeps): Promise<number> {
  const stale = await createStorePort(deps).listResumable(staleMs()); let n = 0;
  for (const j of stale) if (!running.has(j.id)) { void executeJob(deps, j.id); n++; }
  return n;
}

export function publicJob(j: JobState, projectId: string) {
  const units = (j.plan?.units ?? []).map((u) => ({ id: u.id, path: u.path ?? null, status: u.status, attempts: u.attempts }));
  return { jobId: j.id, status: j.status, stage: j.stage, units, callsUsed: j.callsUsed, callsBudget: j.callsBudget, error: j.error, goalImplemented: j.report?.goalImplemented ?? null, report: j.report ? { status: j.report.status, failureReason: j.report.failureReason ?? null, validators: j.report.validators } : null,
    diagnosticsUrl: `/api/projects/diagnostics/export?jobId=${encodeURIComponent(j.id)}`,
    ...(j.artifactId ? { downloadUrl: `/api/projects/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(j.artifactId)}/download` } : {}), updatedAt: j.updatedAt };
}

/** build-report.json for the diagnostic ZIP: the given job, else the most recently updated job with a report. */
export async function buildReportForDiagnostics(jobId?: string, deps: Pick<AdapterDeps, 'getPoolFn'> = {}): Promise<{ path: string; text: string }[]> {
  try {
    const pool = await (deps.getPoolFn ?? getPool)();
    const r = jobId ? await pool.query('SELECT id,report FROM app_build_jobs WHERE id=$1 AND report IS NOT NULL', [jobId]) : await pool.query('SELECT id,report FROM app_build_jobs WHERE report IS NOT NULL ORDER BY updated_at DESC LIMIT 1');
    return r.rows[0] ? [{ path: 'build/build-report.json', text: JSON.stringify({ jobId: r.rows[0].id, ...r.rows[0].report }, null, 2) }] : [];
  } catch { return []; }
}
