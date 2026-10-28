/** Provider-agnostic staged engine. No generated source is executed. */
import { SCHEMA_VERSION, type BuildInput, type BuildReport, type JobState, type Plan, type Spec, type Unit } from './core-types.ts';
import { isModelError, type Ports } from './core-ports.ts';
import { makeCacheKey, sha256 } from './core-cache.ts';
import { promptFor } from './core-prompts.ts';
import { parseFileMarkers } from './core-markers.ts';
import { validatePlan, type PlanValidationResult } from './core-plan.ts';
import { conservativeProfile } from './profile-default.ts';
import { packZip } from './pack-zip.ts';
import { templatePlan } from './stack-static-site.ts';
import { runStaticValidators, REQUIRED_VALIDATORS } from './validator-static-site.ts';

export interface BuildResult { state: JobState; report: BuildReport; archive: Uint8Array | null }
export interface EngineOptions { profileId?: string; modelId?: string; maxCallsPerJob?: number; maxAttemptsPerUnit?: number; promptVersion?: string; resumeFrom?: JobState | null; signal?: AbortSignal; isCancelled?: () => boolean | Promise<boolean> }

function asObject<T>(text: string): T | null { try { return JSON.parse(text) as T; } catch { return null; } }
function event(ports: Ports, jobId: string, type: string, data?: Record<string, unknown>): void { void ports.events.emit({ jobId, type, level: 'info', data }); }

export async function runBuild(input: BuildInput, ports: Ports, options: EngineOptions = {}): Promise<BuildResult> {
  const started = ports.clock.now();
  const profile = conservativeProfile(options.profileId ?? 'conservative');
  const budget = Math.max(1, Math.min(options.maxCallsPerJob ?? profile.maxCallsPerJob, profile.maxCallsPerJob));
  const state: JobState = { schemaVersion: SCHEMA_VERSION, id: input.jobId, projectId: input.projectId, userId: input.userId, status: 'running', stage: 'preflight', spec: null, plan: null, callsUsed: 0, callsBudget: budget, error: null, report: null, artifactId: null, createdAt: new Date(started).toISOString(), updatedAt: new Date(started).toISOString(), heartbeatAt: new Date(started).toISOString() };
  const resume = options.resumeFrom && options.resumeFrom.id === input.jobId ? options.resumeFrom : null;
  if (resume) { state.spec = resume.spec; state.plan = resume.plan; state.callsUsed = resume.callsUsed; state.createdAt = resume.createdAt; }
  let cancelled = false;
  const save = async () => { state.updatedAt = new Date(ports.clock.now()).toISOString(); state.heartbeatAt = state.updatedAt; try { await ports.store.saveJob(state); } catch (e) { void ports.events.emit({ jobId: input.jobId, type: 'store_warning', level: 'warn', data: { message: e instanceof Error ? e.message.slice(0, 160) : 'saveJob failed' } }); } };
  const files = new Map<string, { content: string; unitId: string }>();
  const unitReports: BuildReport['units'] = [];
  let failureReason: string | undefined;
  let templateUsed: string | undefined;
  const call = async (role: 'planner' | 'coder', context: string, version?: string) => {
    const p = promptFor(role, context);
    const maxAttempts = 2; // bounded: one original call plus at most one recovery call
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (options.signal?.aborted || (options.isCancelled && await options.isCancelled())) {
        cancelled = true;
        failureReason = 'cancelled';
        return null;
      }
      if (state.callsUsed >= budget) return null;
      const concise = attempt > 0;
      const prompt = concise
        ? `${p.prompt.slice(0, 6500)}\n\nRECOVERY: keep the answer minimal and valid. Return only the requested JSON/file marker; omit explanations and optional features.`
        : p.prompt;
      state.callsUsed++;
      const result = await ports.model.complete({ role, system: p.system, prompt, maxOutputTokens: profile.maxOutputTokens, signal: options.signal });
      if (!isModelError(result)) return { ...result, promptVersion: version ?? p.version };

      const retryable = result.code === 'rate_limited' || result.code === 'timeout' || result.code === 'unavailable' || result.code === 'truncated';
      if (!retryable || attempt + 1 >= maxAttempts || state.callsUsed >= budget) {
        failureReason = `${result.code}: ${result.message}`;
        return null;
      }

      if (result.code === 'rate_limited') {
        // Show the wait in the persisted job so the browser can explain that work is ongoing.
        const requestedWait = Math.max(1000, result.retryAfterMs ?? 5_000);
        const maxWait = Math.max(1_000, Math.min(180_000, Number(process.env.APP_BUILDER_MAX_RATE_WAIT_MS) || 180_000));
        if (requestedWait > maxWait) {
          failureReason = `rate_limited: retry suggested after ${Math.ceil(requestedWait / 1000)}s, beyond the configured wait window; retry this build later. ${result.message}`;
          return null;
        }
        state.error = { code: 'waiting_rate_limit', message: `Waiting ${Math.ceil(requestedWait / 1000)} seconds for model quota before retrying…` };
        state.stage = 'waiting_model';
        event(ports, input.jobId, 'model_wait', { reason: 'rate_limit', waitMs: requestedWait, role });
        await save();
        await ports.clock.sleep(requestedWait, options.signal);
        if (options.signal?.aborted || (options.isCancelled && await options.isCancelled())) { cancelled = true; failureReason = 'cancelled'; return null; }
        state.error = null;
        state.stage = role === 'planner' ? 'planning' : 'code';
        await save();
      } else {
        const pause = Math.min(4_000, 900 * (attempt + 1) + Math.floor((ports.clock.now() % 700)));
        state.error = { code: 'retrying_model', message: `The model did not return a usable response (${result.code}). Retrying once with a shorter request…` };
        event(ports, input.jobId, 'model_retry', { reason: result.code, waitMs: pause, role });
        await save();
        await ports.clock.sleep(pause, options.signal);
        state.error = null;
        await save();
      }
    }
    return null;
  };
  try {
    await save();
    if (!state.spec) {
    state.stage = 'spec'; state.error = null; await save(); event(ports, input.jobId, 'stage_changed', { stage: 'spec' });
    let specResult = await call('planner', `Create a concise project specification as JSON with schemaVersion, title, goal, language, stack, features[], nonGoals[], acceptance[]. Task: ${input.taskText}`);
    let spec = specResult ? asObject<Spec>(specResult.text) : null;
    if (!spec && state.callsUsed < budget) { specResult = await call('planner', `Return corrected valid JSON only for a Spec with schemaVersion=1. Task: ${input.taskText}`); spec = specResult ? asObject<Spec>(specResult.text) : null; }
    if (!spec || spec.schemaVersion !== SCHEMA_VERSION || !Array.isArray(spec.acceptance)) throw new Error(failureReason ?? 'invalid_spec');
    state.spec = spec; await save();
    }
    const spec = state.spec!;
    if (!state.plan?.units.length) {

    state.stage = 'plan'; state.error = null; await save(); event(ports, input.jobId, 'stage_changed', { stage: 'plan' });
    const planResult = await call('planner', `Create a Plan JSON with schemaVersion=1, specHash="${sha256(JSON.stringify(spec))}", units[], order[]. Each unit requires id, kind="file", path, purpose, dependsOn[], exports[], contract, maxOutputTokens, status="pending", attempts=0. Task spec: ${JSON.stringify(spec)}`);
    let plan = planResult ? asObject<Plan>(planResult.text) : null;
    let checked: PlanValidationResult = plan ? validatePlan(plan, profile) : { ok: false, issues: [{ code: 'schema_version', message: failureReason ?? 'invalid_plan' }] };
    if (!plan || !checked.ok) {
      // static_site template fallback (P93.2b); the reason stays visible in the report.
      const why = checked.issues.map((i) => i.message).join('; ') || 'invalid_plan';
      plan = templatePlan(spec); checked = validatePlan(plan, profile);
      if (!checked.ok) throw new Error(why);
      failureReason = undefined; templateUsed = why;
      event(ports, input.jobId, 'plan_fallback', { reason: why });
    }
    state.plan = { ...plan, order: checked.order ?? plan.order }; await save();
    }

    state.stage = 'code'; state.error = null; await save(); event(ports, input.jobId, 'stage_changed', { stage: 'code' });
    const byId = new Map(state.plan.units.map((u) => [u.id, u]));
    for (const id of state.plan.order) {
      if (options.signal?.aborted || (options.isCancelled && await options.isCancelled())) { cancelled = true; failureReason = 'cancelled'; break; }
      const unit = byId.get(id)!; unit.status = 'running'; unit.attempts++;
      event(ports, input.jobId, 'unit_started', { unitId: id, path: unit.path });
      const key = makeCacheKey({ unitInput: { spec, unit: { ...unit, status: undefined, attempts: undefined, cacheKey: undefined, resultRef: undefined } }, promptVersion: options.promptVersion, modelId: options.modelId ?? profile.id });
      const cached = await ports.store.getUnitResult(key);
      let content = cached?.content;
      let modelId: string | undefined = undefined;
      if (!content) {
        const output = await call('coder', `Implement unit ${JSON.stringify(unit)} for spec ${JSON.stringify(spec)}. Dependencies contracts only: ${JSON.stringify(unit.dependsOn.map((dep) => byId.get(dep)).map((u) => ({ id: u?.id, contract: u?.contract })))}. Output exactly one marker block for path ${unit.path}.`);
        if (!output) {
          if (cancelled || options.signal?.aborted) { cancelled = true; failureReason = 'cancelled'; unit.status = 'pending'; await save(); break; }
          unit.status = 'failed'; unitReports.push({ id, status: 'failed', attempts: unit.attempts }); void ports.events.emit({ jobId: input.jobId, unitId: id, type: 'unit_failed', level: 'error', data: { reason: failureReason ?? 'model_unavailable' } }); await save(); break;
        }
        modelId = output.modelId;
        const parsed = parseFileMarkers(output.text);
        const found = parsed.files.find((f) => f.path === unit.path);
        if (!found || parsed.truncated) { unit.status = 'failed'; unitReports.push({ id, status: 'failed', attempts: unit.attempts, modelId }); failureReason = parsed.issues.join(', ') || 'missing_expected_file_or_truncated'; void ports.events.emit({ jobId: input.jobId, unitId: id, type: 'unit_failed', level: 'error', data: { reason: failureReason } }); await save(); break; }
        content = found.content;
        await ports.store.putUnitResult({ jobId: input.jobId, unitId: id, cacheKey: key, content, contentHash: sha256(content), createdAt: new Date(ports.clock.now()).toISOString() });
      }
      files.set(unit.path!, { content, unitId: id }); unit.status = 'done'; unit.cacheKey = key;
      unitReports.push({ id, status: 'done', attempts: unit.attempts, modelId, cacheHit: Boolean(cached) });
      event(ports, input.jobId, 'unit_done', { unitId: id, cacheHit: Boolean(cached) }); await save();
    }
  } catch (error) { if (options.signal?.aborted) { cancelled = true; failureReason = 'cancelled'; } else { failureReason = error instanceof Error ? error.message : String(error); } }

  const allFilesDone = Boolean(state.plan?.units.length) && state.plan!.units.every((u) => u.status === 'done' || u.status === 'skipped');
  let validators: BuildReport['validators'] = [];
  if (files.size) {
    state.stage = 'check'; state.error = null; await save(); event(ports, input.jobId, 'stage_changed', { stage: 'check' });
    validators = runStaticValidators(new Map([...files].map(([p, f]) => [p, f.content])), state.spec);
  }
  const checksDeclared = [...REQUIRED_VALIDATORS];
  const checksRun = validators.map((v) => v.name);
  const ran = new Set(checksRun);
  const checksNotRun = checksDeclared.filter((n) => !ran.has(n));
  // P118: SUCCESS requires non-empty generated files AND required validators all ran and ok.
  const validatorsOk = files.size > 0 && allFilesDone && checksNotRun.length === 0 && validators.every((v) => v.ok);
  if (files.size === 0 && !failureReason) failureReason = cancelled ? 'cancelled' : 'empty_artifact';
  if (allFilesDone && files.size > 0 && !validatorsOk && !failureReason) failureReason = `validators_failed: ${validators.filter((v) => !v.ok).map((v) => v.name).join(', ') || checksNotRun.join(', ') || 'not run'}`;
  const status = cancelled ? 'partial' : validatorsOk ? 'complete' : files.size ? 'partial' : 'failed';
  const outcome = status === 'complete' ? 'SUCCESS' as const : status === 'partial' ? 'PARTIAL' as const : 'FAILED' as const;
  const failedStage = status === 'complete' ? undefined : (state.stage === 'done' ? (files.size ? 'check' : 'code') : state.stage);
  const note = failureReason ?? (templateUsed ? `plan_fallback_used: ${templateUsed}` : undefined);
  const report: BuildReport = {
    schemaVersion: SCHEMA_VERSION,
    jobId: input.jobId,
    status,
    outcome,
    goalImplemented: validatorsOk,
    files: [...files].map(([path, f]) => ({ path, bytes: new TextEncoder().encode(f.content).byteLength, sha256: sha256(f.content), unitId: f.unitId })),
    units: unitReports,
    validators,
    checksDeclared,
    checksRun,
    checksNotRun,
    callsUsed: state.callsUsed,
    durationMs: Math.max(0, ports.clock.now() - started),
    ...(note ? { failureReason: note } : {}),
    ...(failedStage ? { failedStage } : {}),
  };
  // Hard gate: never mark job done when outcome is not SUCCESS.
  state.status = cancelled ? 'cancelled' : status === 'complete' ? 'done' : 'failed';
  if (failureReason && !state.error) state.error = { code: cancelled ? 'cancelled' : (files.size === 0 ? 'empty_artifact' : 'build_incomplete'), message: failureReason.slice(0, 300) };
  state.stage = 'done'; state.report = report; state.updatedAt = new Date(ports.clock.now()).toISOString(); state.heartbeatAt = state.updatedAt;
  await save();
  event(ports, input.jobId, 'job_done', { status, outcome, goalImplemented: report.goalImplemented });
  const archive = files.size ? await packZip([...files].map(([path, f]) => ({ path, content: f.content })), report) : null;
  if (report.outcome === 'SUCCESS' && (!archive || !archive.byteLength)) {
    report.outcome = 'FAILED';
    report.status = 'failed';
    report.goalImplemented = false;
    report.failureReason = (report.failureReason ? report.failureReason + '; ' : '') + 'archive_missing';
    state.status = 'failed';
    state.error = { code: 'archive_missing', message: 'SUCCESS requires a non-empty archive' };
    state.report = report;
    await save();
  }
  return { state, report, archive };
}
