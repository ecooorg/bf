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

/** Strip common model wrappers (markdown fences, leading prose) then JSON.parse. */
export function parseJsonLenient(text: string): { ok: true; value: unknown; cleaned: string } | { ok: false; error: string; cleaned: string } {
  let cleaned = String(text ?? '').trim();
  const fence = /^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```\s*$/;
  const m = fence.exec(cleaned);
  if (m) cleaned = m[1].trim();
  // If still wrapped, try first { ... } or [ ... ] span
  if (cleaned && cleaned[0] !== '{' && cleaned[0] !== '[') {
    const startObj = cleaned.indexOf('{');
    const startArr = cleaned.indexOf('[');
    let start = -1;
    if (startObj >= 0 && (startArr < 0 || startObj < startArr)) start = startObj;
    else if (startArr >= 0) start = startArr;
    if (start >= 0) {
      const open = cleaned[start];
      const close = open === '{' ? '}' : ']';
      const end = cleaned.lastIndexOf(close);
      if (end > start) cleaned = cleaned.slice(start, end + 1);
    }
  }
  try {
    return { ok: true, value: JSON.parse(cleaned), cleaned };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), cleaned };
  }
}

function asObject<T>(text: string): T | null {
  const r = parseJsonLenient(text);
  return r.ok && r.value != null && typeof r.value === 'object' ? (r.value as T) : null;
}

function previewText(text: string, max = 600): string {
  const t = String(text ?? '');
  return t.length <= max ? t : `${t.slice(0, max)}…[+${t.length - max} chars]`;
}

function strList(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  return v.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)));
}

/** Validate and lightly coerce a Spec. Coerces schemaVersion "1" → 1 and missing arrays to []. */
export function validateSpec(raw: unknown): { ok: true; spec: Spec; coerced: string[] } | { ok: false; issues: string[]; keys: string[]; coerced: string[] } {
  const coerced: string[] = [];
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, issues: ['not_an_object'], keys: [], coerced };
  }
  const o = raw as Record<string, unknown>;
  const keys = Object.keys(o);
  const issues: string[] = [];

  let schemaVersion = o.schemaVersion;
  if (schemaVersion === '1' || schemaVersion === 1) {
    if (schemaVersion === '1') coerced.push('schemaVersion:string_1_to_number');
    schemaVersion = 1;
  } else {
    issues.push(`schemaVersion:got_${JSON.stringify(schemaVersion)}_expected_${SCHEMA_VERSION}`);
  }

  const title = typeof o.title === 'string' ? o.title.trim() : '';
  if (!title) issues.push('title:missing_or_empty');
  const goal = typeof o.goal === 'string' ? o.goal.trim() : '';
  if (!goal) issues.push('goal:missing_or_empty');
  const language = typeof o.language === 'string' && o.language.trim() ? o.language.trim() : 'en';
  if (typeof o.language !== 'string' || !o.language.trim()) coerced.push('language:default_en');
  const stack = typeof o.stack === 'string' && o.stack.trim() ? o.stack.trim() : 'static_site';
  if (typeof o.stack !== 'string' || !o.stack.trim()) coerced.push('stack:default_static_site');

  let features = strList(o.features);
  if (features == null) { features = []; coerced.push('features:default_empty_array'); }
  let nonGoals = strList(o.nonGoals);
  if (nonGoals == null) { nonGoals = []; coerced.push('nonGoals:default_empty_array'); }
  let acceptance = strList(o.acceptance);
  if (acceptance == null) {
    issues.push('acceptance:not_array');
    acceptance = [];
  } else if (acceptance.length === 0) {
    issues.push('acceptance:empty');
  }

  if (issues.length) return { ok: false, issues, keys, coerced };
  return {
    ok: true,
    coerced,
    spec: {
      schemaVersion: SCHEMA_VERSION,
      title,
      goal,
      language,
      stack,
      features,
      nonGoals,
      acceptance,
    },
  };
}

function event(ports: Ports, jobId: string, type: string, data?: Record<string, unknown>, level: 'info' | 'warn' | 'error' = 'info'): void {
  void ports.events.emit({ jobId, type, level, data });
}

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
  const call = async (role: 'planner' | 'coder', context: string, version?: string, expectedPath?: string) => {
    const p = promptFor(role, context, expectedPath);
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
    const specPrompt = `Create a concise project specification as JSON with schemaVersion:1 (number), title, goal, language, stack, features[], nonGoals[], acceptance[] (non-empty string array of testable criteria). Return only JSON. Task: ${input.taskText}`;
    let specResult = await call('planner', specPrompt);
    const diagnoseAttempt = (attempt: number, rawText: string | null | undefined, modelId?: string) => {
      const text = rawText ?? '';
      const parsed = text ? parseJsonLenient(text) : { ok: false as const, error: 'empty_model_text', cleaned: '' };
      const validated = parsed.ok ? validateSpec(parsed.value) : null;
      event(ports, input.jobId, 'spec_attempt', {
        attempt,
        modelId: modelId ?? null,
        textChars: text.length,
        textPreview: previewText(text, 800),
        parseOk: parsed.ok,
        parseError: 'error' in parsed ? parsed.error : null,
        cleanedChars: parsed.cleaned.length,
        cleanedPreview: previewText(parsed.cleaned, 400),
        validateOk: validated?.ok ?? false,
        issues: validated && 'issues' in validated ? validated.issues : [],
        keys: validated ? ('keys' in validated ? validated.keys : Object.keys(validated.spec)) : [],
        coerced: validated?.coerced ?? [],
        callsUsed: state.callsUsed,
        callsBudget: budget,
      }, validated?.ok ? 'info' : 'warn');
      return { parsed, validated };
    };

    let attempt = 1;
    let { parsed, validated } = diagnoseAttempt(attempt, specResult?.text, specResult && 'modelId' in specResult ? (specResult as { modelId?: string }).modelId : undefined);
    let accepted: Spec | null = validated?.ok ? validated.spec : null;

    // Bounded repair: parseable-but-invalid OR unparseable → one recovery call with concrete issues (A3).
    if (!accepted && state.callsUsed < budget && !cancelled) {
      const issues = validated && 'issues' in validated
        ? validated.issues
        : [!('error' in parsed) ? 'unknown_validation_failure' : `unparseable:${parsed.error}`];
      const recoveryPrompt = [
        'Return corrected valid JSON only for a Spec.',
        'Required: schemaVersion must be the number 1 (not a string), title (string), goal (string), language (string), stack (string), features (array of strings), nonGoals (array of strings), acceptance (non-empty array of strings).',
        `Previous issues: ${issues.join('; ')}.`,
        `Task: ${input.taskText}`,
      ].join(' ');
      event(ports, input.jobId, 'spec_repair', { issues, recoveryPromptChars: recoveryPrompt.length, callsUsed: state.callsUsed, callsBudget: budget }, 'warn');
      specResult = await call('planner', recoveryPrompt);
      attempt = 2;
      ({ parsed, validated } = diagnoseAttempt(attempt, specResult?.text, specResult && 'modelId' in specResult ? (specResult as { modelId?: string }).modelId : undefined));
      accepted = validated?.ok ? validated.spec : null;
    }

    if (!accepted) {
      const issues = validated && 'issues' in validated
        ? validated.issues
        : [!('error' in parsed) ? 'unknown_validation_failure' : `unparseable:${parsed.error}`, ...(failureReason ? [failureReason] : [])];
      const detail = {
        stage: 'spec',
        attempts: attempt,
        issues,
        textPreview: previewText(specResult?.text ?? '', 800),
        parseOk: parsed.ok,
        callsUsed: state.callsUsed,
        callsBudget: budget,
      };
      state.error = { code: 'invalid_spec', message: `invalid_spec: ${issues.join('; ')}`.slice(0, 300), detail };
      event(ports, input.jobId, 'spec_failed', detail, 'error');
      throw new Error(state.error.message);
    }
    if (validated && validated.ok && validated.coerced.length) {
      event(ports, input.jobId, 'spec_coerced', { coerced: validated.coerced });
    }
    state.spec = accepted; await save();
    event(ports, input.jobId, 'spec_accepted', { title: accepted.title, acceptanceCount: accepted.acceptance.length, stack: accepted.stack, coerced: validated && validated.ok ? validated.coerced : [] });
    }
    const spec = state.spec!;
    if (!state.plan?.units.length) {

    state.stage = 'plan'; state.error = null; await save(); event(ports, input.jobId, 'stage_changed', { stage: 'plan' });
    const planResult = await call('planner', `Create a Plan JSON with schemaVersion=1, specHash="${sha256(JSON.stringify(spec))}", units[], order[]. Each unit requires id, kind="file", path, purpose, dependsOn[], exports[], contract, maxOutputTokens, status="pending", attempts=0. Task spec: ${JSON.stringify(spec)}`);
    const planParsed = planResult?.text ? parseJsonLenient(planResult.text) : { ok: false as const, error: 'empty_model_text', cleaned: '' };
    event(ports, input.jobId, 'plan_attempt', {
      textChars: planResult?.text?.length ?? 0,
      textPreview: previewText(planResult?.text ?? '', 600),
      parseOk: planParsed.ok,
      parseError: 'error' in planParsed ? planParsed.error : null,
      callsUsed: state.callsUsed,
    }, planParsed.ok ? 'info' : 'warn');
    let plan = planParsed.ok && planParsed.value != null && typeof planParsed.value === 'object' ? (planParsed.value as Plan) : null;
    let checked: PlanValidationResult = plan ? validatePlan(plan, profile) : { ok: false, issues: [{ code: 'schema_version', message: failureReason ?? (!('error' in planParsed) ? 'invalid_plan' : `unparseable_plan:${planParsed.error}`) }] };
    if (!checked.ok) {
      event(ports, input.jobId, 'plan_validate_failed', { issues: checked.issues.map((i) => ({ code: i.code, message: i.message })), callsUsed: state.callsUsed }, 'warn');
    }
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
        const unitContext = `Implement unit ${JSON.stringify(unit)} for spec ${JSON.stringify(spec)}. Dependencies contracts only: ${JSON.stringify(unit.dependsOn.map((dep) => byId.get(dep)).map((u) => ({ id: u?.id, contract: u?.contract })))}. Output exactly one marker block for path ${unit.path}.`;
        const output = await call('coder', unitContext, undefined, unit.path);
        if (!output) {
          if (cancelled || options.signal?.aborted) { cancelled = true; failureReason = 'cancelled'; unit.status = 'pending'; await save(); break; }
          unit.status = 'failed'; unitReports.push({ id, status: 'failed', attempts: unit.attempts }); void ports.events.emit({ jobId: input.jobId, unitId: id, type: 'unit_failed', level: 'error', data: { reason: failureReason ?? 'model_unavailable' } }); await save(); break;
        }
        modelId = output.modelId;
        const evaluate = (text: string, attempt: number, finishReason?: string) => {
          const parsed = parseFileMarkers(text, unit.path);
          const found = parsed.files.find((f) => f.path === unit.path);
          const ok = Boolean(found) && !parsed.truncated;
          event(ports, input.jobId, 'unit_attempt', {
            unitId: id, path: unit.path, attempt, modelId: modelId ?? null, finishReason: finishReason ?? null,
            textChars: text.length, textPreview: previewText(text, 600), foundPaths: parsed.files.map((f) => f.path),
            truncated: parsed.truncated, issues: parsed.issues, coerced: parsed.coerced ?? [], ok, callsUsed: state.callsUsed,
          }, ok ? 'info' : 'warn');
          return { parsed, found, ok };
        };
        let ev = evaluate(output.text, 1, output.finishReason);
        if (!ev.ok && !cancelled && !options.signal?.aborted && state.callsUsed < budget) {
          // Bounded repair (A3 step 6): one more call that names what was wrong; the same requirements, nothing weakened.
          const problems = ev.parsed.issues.length ? ev.parsed.issues : [`expected_path_not_found:${unit.path} (found: ${ev.parsed.files.map((f) => f.path).join(', ') || 'none'})`];
          event(ports, input.jobId, 'unit_repair', { unitId: id, path: unit.path, issues: problems, callsUsed: state.callsUsed, callsBudget: budget }, 'warn');
          unit.attempts++;
          const repaired = await call('coder', `${unitContext}\nYour previous reply was rejected: ${problems.join('; ')}. Reply again with the complete file in the required block format.${ev.parsed.truncated ? ' The previous reply was cut off: keep the file compact so it fits in one reply.' : ''}`, undefined, unit.path);
          if (repaired) { modelId = repaired.modelId; ev = evaluate(repaired.text, 2, repaired.finishReason); }
          else if (cancelled) { unit.status = 'pending'; failureReason = 'cancelled'; await save(); break; }
        }
        const { parsed, found } = ev;
        if (!ev.ok || !found) {
          unit.status = 'failed'; unitReports.push({ id, status: 'failed', attempts: unit.attempts, modelId });
          failureReason = parsed.issues.length ? parsed.issues.join(', ') : `expected_path_not_found:${unit.path} (found: ${parsed.files.map((f) => f.path).join(', ') || 'none'})`;
          void ports.events.emit({ jobId: input.jobId, unitId: id, type: 'unit_failed', level: 'error', data: { reason: failureReason } }); await save(); break;
        }
        content = found.content;
        await ports.store.putUnitResult({ jobId: input.jobId, unitId: id, cacheKey: key, content, contentHash: sha256(content), createdAt: new Date(ports.clock.now()).toISOString() });
      }
      files.set(unit.path!, { content, unitId: id }); unit.status = 'done'; unit.cacheKey = key;
      unitReports.push({ id, status: 'done', attempts: unit.attempts, modelId, cacheHit: Boolean(cached) });
      event(ports, input.jobId, 'unit_done', { unitId: id, cacheHit: Boolean(cached) }); await save();
    }
  } catch (error) {
    if (options.signal?.aborted) { cancelled = true; failureReason = 'cancelled'; }
    else {
      failureReason = error instanceof Error ? error.message : String(error);
      if (!state.error) {
        state.error = {
          code: failureReason.startsWith('invalid_spec') ? 'invalid_spec' : 'engine_error',
          message: failureReason.slice(0, 300),
          detail: { stage: state.stage, callsUsed: state.callsUsed, callsBudget: budget },
        };
      }
    }
  }

  const allFilesDone = Boolean(state.plan?.units.length) && state.plan!.units.every((u) => u.status === 'done' || u.status === 'skipped');
  let validators: BuildReport['validators'] = [];
  if (files.size) {
    state.stage = 'check'; state.error = null; await save(); event(ports, input.jobId, 'stage_changed', { stage: 'check' });
    validators = runStaticValidators(new Map([...files].map(([p, f]) => [p, f.content])), state.spec);
  }

  // P118.5.6: bounded repair when dom-wiring fails — one model call per broken script (max 2), with real HTML ids.
  // Accept only if (a) no previously-passing required validator starts failing and (b) dom-wiring issue count drops.
  const domIssues = () => validators.find((v) => v.name === 'dom-wiring')?.issues ?? [];
  if (
    files.size > 0 &&
    allFilesDone &&
    !cancelled &&
    !options.signal?.aborted &&
    validators.some((v) => v.name === 'dom-wiring' && !v.ok) &&
    state.callsUsed < budget
  ) {
    const htmlIds: string[] = [];
    for (const [path, f] of files) {
      if (!/\.html?$/i.test(path)) continue;
      for (const m of f.content.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) htmlIds.push(m[1]);
    }
    const uniqueIds = [...new Set(htmlIds)];
    const brokenScripts = [...new Set(domIssues().map((i) => i.path).filter((p): p is string => Boolean(p) && /\.js$/i.test(p)))].slice(0, 2);
    for (const scriptPath of brokenScripts) {
      if (state.callsUsed >= budget || cancelled || options.signal?.aborted) break;
      const entry = files.get(scriptPath);
      if (!entry) continue;
      const issuesForScript = domIssues().filter((i) => i.path === scriptPath).map((i) => i.message);
      if (!issuesForScript.length) continue;
      const beforeCount = domIssues().length;
      const previouslyOk = new Set(validators.filter((v) => v.ok).map((v) => v.name));
      event(ports, input.jobId, 'dom_wiring_repair', {
        path: scriptPath,
        issues: issuesForScript,
        htmlIds: uniqueIds,
        callsUsed: state.callsUsed,
        callsBudget: budget,
      }, 'warn');
      const repairPrompt =
        `Fix DOM id mismatches in ${scriptPath} only. The HTML in this project defines these element ids (use them exactly, do not invent new ones): ${uniqueIds.length ? uniqueIds.map((id) => JSON.stringify(id)).join(', ') : '(none)'}.\n` +
        `Current problems:\n- ${issuesForScript.join('\n- ')}\n` +
        `Reply with the COMPLETE corrected file for path ${scriptPath} in the required marker block. Keep behaviour; only change the id strings so they match the HTML. Do not add new files.`;
      const repaired = await call('coder', repairPrompt, undefined, scriptPath);
      if (!repaired) continue;
      const parsed = parseFileMarkers(repaired.text, scriptPath);
      const found = parsed.files.find((f) => f.path === scriptPath);
      if (!found || parsed.truncated) {
        event(ports, input.jobId, 'dom_wiring_repair_rejected', { path: scriptPath, reason: parsed.truncated ? 'truncated' : 'path_missing', issues: parsed.issues }, 'warn');
        continue;
      }
      // Trial: temporarily apply, re-validate, accept only if strict improvement rule holds.
      const trial = new Map([...files].map(([p, f]) => [p, f.content] as [string, string]));
      trial.set(scriptPath, found.content);
      const trialValidators = runStaticValidators(trial, state.spec);
      const trialDom = trialValidators.find((v) => v.name === 'dom-wiring');
      const trialDomCount = trialDom?.issues.length ?? 0;
      const newlyBroken = trialValidators.filter((v) => !v.ok && previouslyOk.has(v.name)).map((v) => v.name);
      if (newlyBroken.length || trialDomCount >= beforeCount) {
        event(ports, input.jobId, 'dom_wiring_repair_rejected', {
          path: scriptPath,
          reason: newlyBroken.length ? `broke_validators:${newlyBroken.join(',')}` : 'no_improvement',
          beforeCount,
          afterCount: trialDomCount,
        }, 'warn');
        continue;
      }
      files.set(scriptPath, { content: found.content, unitId: entry.unitId });
      validators = trialValidators;
      event(ports, input.jobId, 'dom_wiring_repair_accepted', {
        path: scriptPath,
        beforeCount,
        afterCount: trialDomCount,
        callsUsed: state.callsUsed,
      });
      // Refresh unit report content is already via files; unitReports keep status done.
    }
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
  if (failureReason && !state.error) state.error = { code: cancelled ? 'cancelled' : (failureReason.startsWith('invalid_spec') ? 'invalid_spec' : (files.size === 0 ? 'empty_artifact' : 'build_incomplete')), message: failureReason.slice(0, 300), detail: { stage: state.stage, callsUsed: state.callsUsed, callsBudget: budget, failedStage: status === 'complete' ? undefined : (state.stage === 'done' ? (files.size ? 'check' : 'code') : state.stage) } };
  else if (failureReason && state.error && !state.error.message) state.error.message = failureReason.slice(0, 300);
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
