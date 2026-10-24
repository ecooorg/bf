/** P88: auditable, data-driven real-task benchmark. Missing evidence stays unavailable. */
import fs from 'node:fs';
import path from 'node:path';

const STATUSES = new Set(['measured', 'estimated', 'unavailable', 'not-run']);
const WORKFLOWS = new Set(['baseline', 'context-engine']);
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const unique = (values) => [...new Set(values)];
const round = (n) => Math.round(n * 100) / 100;

export function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
}

export function validateTaskSet(data) {
  const errors = [];
  if (!isObject(data) || data.schemaVersion !== 1 || !Array.isArray(data.tasks)) {
    return ['Task set must be an object with schemaVersion 1 and a tasks array.'];
  }
  const ids = new Set();
  for (const [index, task] of data.tasks.entries()) {
    const prefix = `tasks[${index}]`;
    if (!isObject(task)) { errors.push(`${prefix} must be an object.`); continue; }
    if (typeof task.id !== 'string' || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(task.id)) errors.push(`${prefix}.id must be a stable lowercase id.`);
    else if (ids.has(task.id)) errors.push(`${prefix}.id duplicates ${task.id}.`); else ids.add(task.id);
    for (const key of ['category', 'prompt', 'reviewStatus']) if (typeof task[key] !== 'string' || !task[key].trim()) errors.push(`${prefix}.${key} is required.`);
    if (!['draft', 'reviewed'].includes(task.reviewStatus)) errors.push(`${prefix}.reviewStatus must be draft or reviewed.`);
    if (task.baseRevision !== null && typeof task.baseRevision !== 'string') errors.push(`${prefix}.baseRevision must be a string or null.`);
    for (const key of ['goldDependencies', 'protectedInvariants', 'acceptanceCriteria', 'requiredChecks']) {
      if (!Array.isArray(task[key])) errors.push(`${prefix}.${key} must be an array.`);
      else if (task[key].some((v) => typeof v !== 'string' || !v.trim())) errors.push(`${prefix}.${key} must contain non-empty strings only.`);
    }
    if (task.reviewStatus === 'reviewed') {
      if (!task.baseRevision || !/^[0-9a-f]{7,64}$/i.test(task.baseRevision)) errors.push(`${prefix}: reviewed tasks need a pinned commit SHA (7–64 hex characters).`);
      if (!task.goldDependencies?.length) errors.push(`${prefix}: reviewed tasks need at least one reviewed gold dependency.`);
      if (!task.acceptanceCriteria?.length) errors.push(`${prefix}: reviewed tasks need acceptance criteria.`);
      if (!task.requiredChecks?.length) errors.push(`${prefix}: reviewed tasks need required checks.`);
    }
  }
  if (data.tasks.length === 0) errors.push('Task set must contain at least one task.');
  return errors;
}

function validateMeasurement(value, label, errors) {
  if (value === undefined || value === null) return;
  if (!isObject(value) || !STATUSES.has(value.status)) { errors.push(`${label} must have a valid status.`); return; }
  if (value.status === 'measured' && (typeof value.value !== 'number' || !Number.isFinite(value.value) || value.value < 0)) errors.push(`${label}.value must be a non-negative number when measured.`);
  if (value.status === 'estimated' && (typeof value.value !== 'number' || !Number.isFinite(value.value) || value.value < 0)) errors.push(`${label}.value must be a non-negative number when estimated.`);
  if (value.status === 'unavailable' && value.value !== undefined && value.value !== null) errors.push(`${label} must not claim a value when unavailable.`);
}

export function validateRunSet(data, taskSet) {
  const errors = [];
  if (!isObject(data) || data.schemaVersion !== 1 || !Array.isArray(data.runs)) return ['Results must be an object with schemaVersion 1 and a runs array.'];
  const taskIds = new Set(taskSet.tasks.map((t) => t.id));
  const runIds = new Set();
  for (const [index, run] of data.runs.entries()) {
    const prefix = `runs[${index}]`;
    if (!isObject(run)) { errors.push(`${prefix} must be an object.`); continue; }
    if (typeof run.runId !== 'string' || !run.runId.trim()) errors.push(`${prefix}.runId is required.`);
    else if (runIds.has(run.runId)) errors.push(`${prefix}.runId duplicates ${run.runId}.`); else runIds.add(run.runId);
    if (!taskIds.has(run.taskId)) errors.push(`${prefix}.taskId does not exist in task set.`);
    if (!WORKFLOWS.has(run.workflow)) errors.push(`${prefix}.workflow must be baseline or context-engine.`);
    for (const key of ['baseRevision', 'promptVersion', 'model', 'toolchain', 'environment']) if (typeof run[key] !== 'string' || !run[key].trim()) errors.push(`${prefix}.${key} is required for comparability.`);
    if (run.startedAt && Number.isNaN(Date.parse(run.startedAt))) errors.push(`${prefix}.startedAt is not a valid timestamp.`);
    if (run.acceptedAt && Number.isNaN(Date.parse(run.acceptedAt))) errors.push(`${prefix}.acceptedAt is not a valid timestamp.`);
    if (run.startedAt && run.acceptedAt && Date.parse(run.acceptedAt) < Date.parse(run.startedAt)) errors.push(`${prefix}.acceptedAt must not precede startedAt.`);
    if (!isObject(run.metrics)) { errors.push(`${prefix}.metrics must be an object.`); continue; }
    for (const key of ['inputTokens', 'outputTokens', 'agentTurns', 'humanInterventions', 'manualContextMinutes', 'humanReviewMinutes', 'reworkMinutes']) validateMeasurement(run.metrics[key], `${prefix}.metrics.${key}`, errors);
    for (const key of ['stageLocalized', 'falseSuccess', 'acceptancePassed', 'requiredChecksPassed']) {
      const value = run.metrics[key];
      if (value !== undefined && value !== null && typeof value !== 'boolean') errors.push(`${prefix}.metrics.${key} must be boolean, null, or omitted.`);
    }
    if (run.changedFiles !== undefined && (!Array.isArray(run.changedFiles) || run.changedFiles.some((v) => typeof v !== 'string'))) errors.push(`${prefix}.changedFiles must be an array of paths.`);
    if (run.unrelatedChangedFiles !== undefined && (!Array.isArray(run.unrelatedChangedFiles) || run.unrelatedChangedFiles.some((v) => typeof v !== 'string'))) errors.push(`${prefix}.unrelatedChangedFiles must be an array of paths.`);
    if (run.dependenciesFound !== undefined && (!Array.isArray(run.dependenciesFound) || run.dependenciesFound.some((v) => typeof v !== 'string'))) errors.push(`${prefix}.dependenciesFound must be an array of paths.`);
    if (run.reviewOutcome !== undefined && !['accepted', 'rejected', 'abandoned', 'pending'].includes(run.reviewOutcome)) errors.push(`${prefix}.reviewOutcome is invalid.`);
  }
  return errors;
}

function measuredValues(runs, key) {
  return runs.map((run) => run.metrics?.[key]).filter((m) => m?.status === 'measured' && Number.isFinite(m.value)).map((m) => m.value);
}
function mean(values) { return values.length ? round(values.reduce((a, b) => a + b, 0) / values.length) : null; }
function rate(values) { const observed = values.filter((v) => typeof v === 'boolean'); return observed.length ? { numerator: observed.filter(Boolean).length, denominator: observed.length, rate: round(observed.filter(Boolean).length / observed.length), unavailable: values.length - observed.length } : { numerator: 0, denominator: 0, rate: null, unavailable: values.length }; }

export function buildBenchmarkReport(taskSet, resultSet = { schemaVersion: 1, runs: [] }) {
  const taskErrors = validateTaskSet(taskSet);
  if (taskErrors.length) throw new Error(`Invalid task set:\n- ${taskErrors.join('\n- ')}`);
  const resultErrors = validateRunSet(resultSet, taskSet);
  if (resultErrors.length) throw new Error(`Invalid results:\n- ${resultErrors.join('\n- ')}`);
  const tasksById = new Map(taskSet.tasks.map((task) => [task.id, task]));
  const runs = resultSet.runs.map((run) => {
    const task = tasksById.get(run.taskId);
    const gold = task.goldDependencies || [];
    const found = unique(run.dependenciesFound || []);
    const dependencyRecall = task.reviewStatus === 'reviewed' && gold.length
      ? round(gold.filter((file) => found.includes(file)).length / gold.length) : null;
    const falsePositiveRate = task.reviewStatus === 'reviewed' && found.length
      ? round(found.filter((file) => !gold.includes(file)).length / found.length) : null;
    const start = run.startedAt ? Date.parse(run.startedAt) : NaN;
    const accepted = run.acceptedAt ? Date.parse(run.acceptedAt) : NaN;
    const elapsed = Number.isFinite(start) && Number.isFinite(accepted) ? round((accepted - start) / 60000) : null;
    return {
      runId: run.runId, taskId: run.taskId, workflow: run.workflow, reviewOutcome: run.reviewOutcome || 'pending',
      comparability: task.reviewStatus === 'reviewed' && task.baseRevision === run.baseRevision ? 'base-revision-match-review-required' : 'NOT_COMPARABLE_OR_TASK_NOT_REVIEWED',
      wallClockMinutes: elapsed === null ? { status: 'unavailable', value: null } : { status: 'measured', value: elapsed },
      metrics: run.metrics,
      dependencyRecall: dependencyRecall === null ? { status: 'unavailable', value: null, reason: 'Task gold set is not reviewed or is empty.' } : { status: 'measured', value: dependencyRecall },
      dependencyFalsePositiveRate: falsePositiveRate === null ? { status: 'unavailable', value: null, reason: 'Task gold set is not reviewed or no dependencies were recorded.' } : { status: 'measured', value: falsePositiveRate },
      changedFileCount: Array.isArray(run.changedFiles) ? run.changedFiles.length : null,
      unrelatedChangedFiles: run.unrelatedChangedFiles || [],
      dataWarnings: [
        ...(!run.startedAt || !run.acceptedAt ? ['Wall-clock duration unavailable: start and accepted timestamps are required.'] : []),
        ...(!run.model || !run.toolchain || !run.environment ? ['Model/toolchain/environment metadata incomplete.'] : []),
        ...(task.reviewStatus !== 'reviewed' ? ['Task gold set is draft; dependency metrics are unavailable.'] : []),
      ],
    };
  });
  const taskReview = taskSet.tasks.filter((task) => task.reviewStatus === 'reviewed').length;
  const total = runs.length;
  const bools = (key) => runs.map((run) => run.metrics?.[key]);
  const summary = {
    runCount: total,
    taskCount: taskSet.tasks.length,
    reviewedTaskCount: taskReview,
    reviewCoverage: taskSet.tasks.length ? round(taskReview / taskSet.tasks.length) : null,
    acceptedRuns: runs.filter((run) => run.reviewOutcome === 'accepted').length,
    abandonedRuns: runs.filter((run) => run.reviewOutcome === 'abandoned').length,
    meanWallClockMinutes: mean(runs.filter((r) => r.wallClockMinutes.status === 'measured').map((r) => r.wallClockMinutes.value)),
    meanAgentTurns: mean(measuredValues(resultSet.runs, 'agentTurns')),
    meanHumanInterventions: mean(measuredValues(resultSet.runs, 'humanInterventions')),
    meanManualContextMinutes: mean(measuredValues(resultSet.runs, 'manualContextMinutes')),
    meanHumanReviewMinutes: mean(measuredValues(resultSet.runs, 'humanReviewMinutes')),
    meanReworkMinutes: mean(measuredValues(resultSet.runs, 'reworkMinutes')),
    stageLocalizationRate: rate(bools('stageLocalized')),
    falseSuccessRate: rate(bools('falseSuccess')),
    acceptancePassRate: rate(bools('acceptancePassed')),
    requiredChecksPassRate: rate(bools('requiredChecksPassed')),
    inputTokens: measuredValues(resultSet.runs, 'inputTokens').length ? { status: 'measured', sum: measuredValues(resultSet.runs, 'inputTokens').reduce((a, b) => a + b, 0), count: measuredValues(resultSet.runs, 'inputTokens').length } : { status: 'unavailable', reason: 'No named-provider/tokenizer trace supplied measured input tokens.' },
    outputTokens: measuredValues(resultSet.runs, 'outputTokens').length ? { status: 'measured', sum: measuredValues(resultSet.runs, 'outputTokens').reduce((a, b) => a + b, 0), count: measuredValues(resultSet.runs, 'outputTokens').length } : { status: 'unavailable', reason: 'No named-provider/tokenizer trace supplied measured output tokens.' },
    pairedComparisons: buildPairedComparisons(resultSet.runs, tasksById),
    warning: 'Pilot report only. No improvement, statistical significance, or regression gate is inferred from missing, draft, or unmatched observations.',
  };
  return { schemaVersion: 1, kind: 'real-task-benchmark-report', benchmark: taskSet.name || 'BiForge P88 real-task benchmark', generatedAt: new Date().toISOString(), datasetStatus: taskReview === taskSet.tasks.length && taskReview > 0 ? 'REVIEWED_TASK_SET' : 'PILOT_REVIEW_REQUIRED', summary, runs, methodology: { measuredValuesOnly: true, estimatedAndUnavailableValuesExcludedFromAverages: true, staticSourceLinesAreNotTokens: true, noThresholdsOrCiGate: true } };
}

function buildPairedComparisons(runs, tasksById) {
  const groups = new Map();
  for (const run of runs) {
    const key = `${run.taskId}\0${run.workflow}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(run);
  }
  const result = [];
  for (const taskId of unique(runs.map((run) => run.taskId))) {
    const baseline = groups.get(`${taskId}\0baseline`) || [];
    const context = groups.get(`${taskId}\0context-engine`) || [];
    if (!baseline.length || !context.length) continue;
    const task = tasksById.get(taskId);
    const candidates = [];
    for (const left of baseline) for (const right of context) {
      const same = task.reviewStatus === 'reviewed' && task.baseRevision === left.baseRevision && left.baseRevision === right.baseRevision && left.promptVersion === right.promptVersion && left.model === right.model && left.toolchain === right.toolchain && left.environment === right.environment;
      candidates.push({ baselineRunId: left.runId, contextEngineRunId: right.runId, comparable: same, reason: same ? 'Matched metadata; human review still required before attributing causality.' : 'Base revision, prompt version, model, toolchain, environment or task review status differs.' });
    }
    result.push({ taskId, pairs: candidates });
  }
  return result;
}
