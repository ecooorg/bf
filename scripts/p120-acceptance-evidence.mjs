#!/usr/bin/env node
/**
 * P120.0.6 commit-bound acceptance evidence.
 * Modes:
 *   collect: write evidence from the P120 Acceptance workflow step outcomes.
 *   verify: validate the acceptance artifact in P120 Evidence and write a second, independently
 *           bound report for the workflow_run that triggered it.
 * Secrets, prompts, user data and model responses are never read or emitted.
 */
import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback = '') {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] || fallback) : fallback;
}
function requireFullSha(value, label) {
  if (!/^[0-9a-f]{40}$/i.test(value)) throw new Error(`${label} must be a full 40-character commit SHA`);
  return value.toLowerCase();
}
function requireDigits(value, label) {
  if (!/^\d+$/.test(value)) throw new Error(`${label} must be a numeric workflow identifier`);
  return value;
}
function ensureParent(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); }
function summaryLine(text) {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (target) fs.appendFileSync(target, `${text}\n`);
}
function emitSummary(title, verdict, sha, checks) {
  const lines = [`### ${title}`, `- Verdict: **${verdict}**`, `- Commit: \`${sha}\``, ...Object.entries(checks).map(([key, value]) => `- ${key}: **${value}**`)];
  const rendered = lines.join('\n');
  console.log(rendered);
  summaryLine(rendered);
}

function collect() {
  const sha = requireFullSha(process.env.GITHUB_SHA || '', 'GITHUB_SHA');
  const runId = requireDigits(process.env.GITHUB_RUN_ID || '', 'GITHUB_RUN_ID');
  const attempt = requireDigits(process.env.GITHUB_RUN_ATTEMPT || '', 'GITHUB_RUN_ATTEMPT');
  const checks = {
    dependencies: process.env.DEPENDENCIES_OUTCOME || 'NOT_RUN',
    verificationDag: process.env.DAG_OUTCOME || 'NOT_RUN',
    playwrightInstall: process.env.BROWSER_OUTCOME || 'NOT_RUN',
    p120UiSuite: process.env.UI_OUTCOME || 'NOT_RUN',
  };
  const verdict = Object.values(checks).every(value => value === 'success') ? 'PASS' : 'FAIL';
  const evidence = {
    schemaVersion: 1,
    gate: 'P120.0.6',
    verdict,
    commit: sha,
    workflow: { name: 'P120 Acceptance', runId, runAttempt: attempt },
    checks,
    generatedAt: new Date().toISOString(),
    rule: 'PASS requires every required check to have outcome success. This report records CI evidence and does not itself constitute Navigator formal acceptance.',
  };
  const out = arg('out', 'artifacts/p120-acceptance.json');
  ensureParent(out);
  fs.writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`);
  emitSummary('P120 Acceptance Evidence', verdict, sha, checks);
  if (verdict !== 'PASS') process.exitCode = 1;
}

function verify() {
  const expectedSha = requireFullSha(process.env.EXPECTED_SHA || '', 'EXPECTED_SHA');
  const expectedRunId = requireDigits(process.env.EXPECTED_ACCEPTANCE_RUN_ID || '', 'EXPECTED_ACCEPTANCE_RUN_ID');
  const expectedAttempt = requireDigits(process.env.EXPECTED_ACCEPTANCE_RUN_ATTEMPT || '', 'EXPECTED_ACCEPTANCE_RUN_ATTEMPT');
  const expectedConclusion = process.env.EXPECTED_ACCEPTANCE_CONCLUSION || '';
  const input = arg('input', 'artifacts/input/p120-acceptance.json');
  const out = arg('out', 'artifacts/p120-evidence.json');
  const checks = {};
  let source = null;
  let problems = [];
  try { source = JSON.parse(fs.readFileSync(input, 'utf8')); }
  catch { problems.push('acceptance_artifact_missing_or_invalid_json'); }
  if (source) {
    if (source.schemaVersion !== 1 || source.gate !== 'P120.0.6') problems.push('unsupported_evidence_schema_or_gate');
    if (source.workflow?.name !== 'P120 Acceptance') problems.push('unexpected_source_workflow_name');
    if (source.commit !== expectedSha) problems.push('acceptance_commit_mismatch');
    if (String(source.workflow?.runId) !== expectedRunId) problems.push('acceptance_run_id_mismatch');
    if (String(source.workflow?.runAttempt) !== expectedAttempt) problems.push('acceptance_run_attempt_mismatch');
    if (source.verdict !== 'PASS') problems.push('acceptance_report_not_pass');
    for (const key of ['dependencies', 'verificationDag', 'playwrightInstall', 'p120UiSuite']) {
      checks[key] = source.checks?.[key] || 'NOT_RECORDED';
      if (checks[key] !== 'success') problems.push(`required_check_not_success:${key}`);
    }
  }
  checks.acceptanceWorkflowConclusion = expectedConclusion || 'NOT_RECORDED';
  if (expectedConclusion !== 'success') problems.push('acceptance_workflow_conclusion_not_success');
  const verdict = problems.length === 0 ? 'PASS' : 'FAIL';
  const evidence = {
    schemaVersion: 1,
    gate: 'P120.0.6',
    verdict,
    formalAcceptance: 'PENDING_NAVIGATOR',
    commit: expectedSha,
    sourceWorkflow: { name: 'P120 Acceptance', runId: expectedRunId, runAttempt: expectedAttempt, conclusion: expectedConclusion || 'unknown' },
    checks,
    problems,
    generatedAt: new Date().toISOString(),
    rule: 'PASS requires matching commit SHA, source workflow identity and attempt, successful workflow conclusion, and success for every required check. Navigator formal acceptance is separate.',
  };
  ensureParent(out);
  fs.writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`);
  emitSummary('P120 Commit-Bound Evidence', verdict, expectedSha, { ...checks, problems: problems.length ? problems.join(', ') : 'none' });
  if (verdict !== 'PASS') process.exitCode = 1;
}

const mode = arg('mode');
if (mode === 'collect') collect();
else if (mode === 'verify') verify();
else {
  console.error('Usage: node scripts/p120-acceptance-evidence.mjs --mode collect|verify [--input file] [--out file]');
  process.exitCode = 2;
}
