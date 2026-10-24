/** Provider-agnostic staged engine. No generated source is executed. */
import { SCHEMA_VERSION, type BuildInput, type BuildReport, type JobState, type Plan, type Spec, type Unit } from './core-types.ts';
import { isModelError, type Ports } from './core-ports.ts';
import { makeCacheKey, sha256 } from './core-cache.ts';
import { promptFor } from './core-prompts.ts';
import { parseFileMarkers } from './core-markers.ts';
import { validatePlan } from './core-plan.ts';
import { conservativeProfile } from './profile-default.ts';
import { packZip } from './pack-zip.ts';

export interface BuildResult { state: JobState; report: BuildReport; archive: Uint8Array | null }
export interface EngineOptions { profileId?: string; modelId?: string; maxCallsPerJob?: number; maxAttemptsPerUnit?: number; promptVersion?: string }

function asObject<T>(text: string): T | null { try { return JSON.parse(text) as T; } catch { return null; } }
function event(ports: Ports, jobId: string, type: string, data?: Record<string, unknown>): void { void ports.events.emit({ jobId, type, level: 'info', data }); }

export async function runBuild(input: BuildInput, ports: Ports, options: EngineOptions = {}): Promise<BuildResult> {
  const started = ports.clock.now();
  const profile = conservativeProfile(options.profileId ?? 'conservative');
  const budget = Math.max(1, Math.min(options.maxCallsPerJob ?? profile.maxCallsPerJob, profile.maxCallsPerJob));
  const state: JobState = { schemaVersion: SCHEMA_VERSION, id: input.jobId, projectId: input.projectId, userId: input.userId, status: 'running', stage: 'preflight', spec: null, plan: null, callsUsed: 0, callsBudget: budget, error: null, report: null, artifactId: null, createdAt: new Date(started).toISOString(), updatedAt: new Date(started).toISOString(), heartbeatAt: new Date(started).toISOString() };
  const files = new Map<string, { content: string; unitId: string }>();
  const unitReports: BuildReport['units'] = [];
  let failureReason: string | undefined;
  const call = async (role: 'planner' | 'coder', context: string, version?: string) => {
    if (state.callsUsed >= budget) return null;
    const p = promptFor(role, context);
    state.callsUsed++;
    const result = await ports.model.complete({ role, system: p.system, prompt: p.prompt, maxOutputTokens: profile.maxOutputTokens });
    if (isModelError(result)) {
      if (result.code === 'rate_limited') {
        // Waits count against elapsed wall-clock time but not against generation-call budget.
        const wait = Math.max(0, result.retryAfterMs ?? 1000);
        state.callsUsed--;
        await ports.clock.sleep(wait);
        if (state.callsUsed >= budget) return null;
        state.callsUsed++;
        const retry = await ports.model.complete({ role, system: p.system, prompt: p.prompt, maxOutputTokens: profile.maxOutputTokens });
        if (isModelError(retry)) { failureReason = `${retry.code}: ${retry.message}`; return null; }
        return { ...retry, promptVersion: version ?? p.version };
      }
      failureReason = `${result.code}: ${result.message}`;
      return null;
    }
    return { ...result, promptVersion: version ?? p.version };
  };
  try {
    event(ports, input.jobId, 'stage_changed', { stage: 'spec' }); state.stage = 'spec';
    let specResult = await call('planner', `Create a concise project specification as JSON with schemaVersion, title, goal, language, stack, features[], nonGoals[], acceptance[]. Task: ${input.taskText}`);
    let spec = specResult ? asObject<Spec>(specResult.text) : null;
    if (!spec && state.callsUsed < budget) { specResult = await call('planner', `Return corrected valid JSON only for a Spec with schemaVersion=1. Task: ${input.taskText}`); spec = specResult ? asObject<Spec>(specResult.text) : null; }
    if (!spec || spec.schemaVersion !== SCHEMA_VERSION || !Array.isArray(spec.acceptance)) throw new Error(failureReason ?? 'invalid_spec');
    state.spec = spec;

    event(ports, input.jobId, 'stage_changed', { stage: 'plan' }); state.stage = 'plan';
    const planResult = await call('planner', `Create a Plan JSON with schemaVersion=1, specHash="${sha256(JSON.stringify(spec))}", units[], order[]. Each unit requires id, kind="file", path, purpose, dependsOn[], exports[], contract, maxOutputTokens, status="pending", attempts=0. Task spec: ${JSON.stringify(spec)}`);
    const plan = planResult ? asObject<Plan>(planResult.text) : null;
    const checked = plan ? validatePlan(plan, profile) : { ok: false, issues: [{ code: 'invalid_plan', message: failureReason ?? 'invalid_plan' }] };
    if (!plan || !checked.ok) throw new Error(checked.issues.map((i) => i.message).join('; ') || 'invalid_plan');
    state.plan = { ...plan, order: checked.order ?? plan.order };

    event(ports, input.jobId, 'stage_changed', { stage: 'code' }); state.stage = 'code';
    const byId = new Map(state.plan.units.map((u) => [u.id, u]));
    for (const id of state.plan.order) {
      const unit = byId.get(id)!; unit.status = 'running'; unit.attempts++;
      event(ports, input.jobId, 'unit_started', { unitId: id, path: unit.path });
      const key = makeCacheKey({ unitInput: { spec, unit: { ...unit, status: undefined, attempts: undefined } }, promptVersion: options.promptVersion, modelId: options.modelId ?? profile.id });
      const cached = await ports.store.getUnitResult(key);
      let content = cached?.content;
      let modelId = cached ? undefined : undefined;
      if (!content) {
        const output = await call('coder', `Implement unit ${JSON.stringify(unit)} for spec ${JSON.stringify(spec)}. Dependencies contracts only: ${JSON.stringify(unit.dependsOn.map((dep) => byId.get(dep)).map((u) => ({ id: u?.id, contract: u?.contract })))}. Output exactly one marker block for path ${unit.path}.`);
        if (!output) { unit.status = 'failed'; unitReports.push({ id, status: 'failed', attempts: unit.attempts }); break; }
        modelId = output.modelId;
        const parsed = parseFileMarkers(output.text);
        const found = parsed.files.find((f) => f.path === unit.path);
        if (!found || parsed.truncated) { unit.status = 'failed'; unitReports.push({ id, status: 'failed', attempts: unit.attempts, modelId }); failureReason = parsed.issues.join(', ') || 'missing_expected_file_or_truncated'; break; }
        content = found.content;
        await ports.store.putUnitResult({ jobId: input.jobId, unitId: id, cacheKey: key, content, contentHash: sha256(content), createdAt: new Date(ports.clock.now()).toISOString() });
      }
      files.set(unit.path!, { content, unitId: id }); unit.status = 'done'; unit.cacheKey = key;
      unitReports.push({ id, status: 'done', attempts: unit.attempts, modelId, cacheHit: Boolean(cached) });
      event(ports, input.jobId, 'unit_done', { unitId: id, cacheHit: Boolean(cached) });
    }
  } catch (error) { failureReason = error instanceof Error ? error.message : String(error); }

  const allFilesDone = Boolean(state.plan?.units.length) && state.plan!.units.every((u) => u.status === 'done' || u.status === 'skipped');
  const status = allFilesDone ? 'complete' : files.size ? 'partial' : 'failed';
  const report: BuildReport = { schemaVersion: SCHEMA_VERSION, jobId: input.jobId, status, goalImplemented: allFilesDone, files: [...files].map(([path, f]) => ({ path, bytes: new TextEncoder().encode(f.content).byteLength, sha256: sha256(f.content), unitId: f.unitId })), units: unitReports, validators: [], callsUsed: state.callsUsed, durationMs: Math.max(0, ports.clock.now() - started), ...(failureReason ? { failureReason } : {}) };
  state.status = status === 'complete' ? 'done' : status === 'partial' ? 'failed' : 'failed'; state.stage = 'done'; state.report = report; state.updatedAt = new Date(ports.clock.now()).toISOString(); state.heartbeatAt = state.updatedAt;
  event(ports, input.jobId, 'job_done', { status, goalImplemented: report.goalImplemented });
  const archive = files.size ? await packZip([...files].map(([path, f]) => ({ path, content: f.content })), report) : null;
  return { state, report, archive };
}
