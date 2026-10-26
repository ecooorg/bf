// P96: the same compact, evidence-complete handoff is written to NEXT_PATCH.md and GitHub Actions Summary.
// No AI/API calls. Secrets are redacted before any evidence is published.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.env.CI_LOGS_DIR || 'artifacts/ci-checks');
fs.mkdirSync(dir, { recursive: true });
const read = (name) => { try { return fs.readFileSync(path.join(dir, name), 'utf8'); } catch { return ''; } };
const json = (name) => { try { return JSON.parse(read(name)); } catch { return null; } };
const redact = (value) => String(value ?? '')
  .replace(/\u001b\[[0-9;]*m/g, '').replace(/\r/g, '')
  .replace(/(GEMINI_API_KEY|GOOGLE_API_KEY|GROQ_API_KEY|OPENAI_API_KEY|API_KEY|SESSION_SECRET|APP_PASSWORD|DATABASE_URL)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
  .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
  .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[REDACTED_GOOGLE_KEY]')
  .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, '[REDACTED_API_KEY]');
const oneLine = (s, max = 500) => redact(s).replace(/[`\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const resultsDoc = json('results.json');
const rows = Array.isArray(resultsDoc?.results) ? resultsDoc.results : [];
const uniqueRows = [...new Map(rows.map((r) => [`${r.id}:${r.status}`, r])).values()];
const logs = fs.readdirSync(dir).filter((f) => f.endsWith('.log')).sort();
const activeStage = resultsDoc?.active && !uniqueRows.some((r) => r.id === resultsDoc.active.id) ? resultsDoc.active : null;
const interruptedRow = activeStage ? { ...activeStage, status: /test timed out after|testTimeoutFailure/i.test(read(path.basename(activeStage.log || ''))) ? 'TIMEOUT' : 'INTERRUPTED', durationMs: 0, exitCode: null, signal: null, log: activeStage.log || `${activeStage.id}.log`, note: 'Runner ended before this probe recorded a final result; inspect captured log tail.' } : null;
const failedRows = [...uniqueRows.filter((r) => ['FAIL','TIMEOUT'].includes(r.status)), ...(interruptedRow ? [interruptedRow] : [])];
const stepOutcomes = { dag: process.env.DAG_OUTCOME || 'unknown' };
const workflowLogNames = ['version-consistency.log','ci-install.log','ci-dag.log'];
const workflowErrors = [];
const errorRe = /(^\s*not ok\s+\d+\s+-|AssertionError|ERR_[A-Z_]+|error TS\d+|(?:^|\s)Error:|Expected values|expected:|actual:|operator:|test timed out after|testTimeoutFailure|ELIFECYCLE|uncaught exception|Cannot find name|SyntaxError|TypeError|ReferenceError|failed with exit code|\[FAIL\]|\[TIMEOUT\])/i;
function excerptForLog(text, status) {
  const lines = redact(text).split('\n');
  const selected = new Set();
  // Keep each TAP failure's assertion body and stack, not only generic node:test frames.
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*not ok\s+\d+\s+-|AssertionError|test timed out after|testTimeoutFailure|Cannot find name|SyntaxError:|TypeError:|ReferenceError:/i.test(lines[i])) {
      const start = Math.max(0, i - 1);
      const end = Math.min(lines.length, i + (/not ok|AssertionError/i.test(lines[i]) ? 26 : 12));
      for (let j = start; j < end; j++) if (lines[j].trim()) selected.add(j);
    }
  }
  if (status === 'TIMEOUT' || /test timed out after|testTimeoutFailure/i.test(text)) {
    const nonempty = lines.map((line, i) => ({ line, i })).filter((x) => x.line.trim());
    for (const x of nonempty.slice(-35)) selected.add(x.i);
  }
  if (!selected.size) {
    const nonempty = lines.map((line, i) => ({ line, i })).filter((x) => x.line.trim() && errorRe.test(x.line));
    for (const x of nonempty.slice(0, 16)) { selected.add(Math.max(0, x.i - 1)); selected.add(x.i); }
  }
  return [...selected].sort((a,b) => a-b).map((i) => `${i+1}:${oneLine(lines[i], 300)}`).slice(0, 36);
}
function sourceContext(stage, logText) {
  let file = stage.sourceFile || null;
  let lineNo = null;
  const cleanLog = redact(logText);
  const stackLoc = cleanLog.match(/TestContext\.<anonymous> \(([^\s()]+\.(?:mjs|cjs|js|ts)):(\d+):(\d+)\)/);
  const loc = stackLoc || cleanLog.match(/(?:file:\/\/)?([^\s'"()]+\.(?:mjs|cjs|js|ts)):(\d+):(\d+)/);
  if (loc) {
    const suffix = loc[1].replace(/\\/g, '/');
    const marker = suffix.match(/(?:^|\/)(tests|scripts|server|src)\/.+$/);
    if (marker) file = marker[0].replace(/^\//, '');
    lineNo = Number(loc[2]);
  }
  if (!file) return [];
  file = file.replace(/^\//, '').replace(/^.*?((?:tests|scripts|server|src)\/)/, '$1');
  const full = path.resolve(root, file);
  if (!full.startsWith(root + path.sep) || !fs.existsSync(full)) return [];
  const lines = fs.readFileSync(full, 'utf8').split('\n');
  if (!lineNo || lineNo <= 1) {
    const pattern = stage.targetPattern;
    if (pattern) {
      const p = pattern.split('|')[0];
      const idx = lines.findIndex((line) => line.includes(p));
      if (idx >= 0) lineNo = idx + 1;
    }
  }
  if (!lineNo) return [`SOURCE=${file}; source line unavailable`];
  const start = Math.max(1, lineNo - 15), end = Math.min(lines.length, lineNo + 25);
  return [`SOURCE=${file}:${lineNo}-${end}`, ...lines.slice(start - 1, end).map((line, idx) => `${start+idx}${start+idx===lineNo?' >>>':'    '} ${oneLine(line, 220)}`)];
}
for (const name of workflowLogNames) {
  const text = read(name);
  if (!text) continue;
  const evidence = excerptForLog(text, /timeout/i.test(text) ? 'TIMEOUT' : 'FAIL');
  if (evidence.length && (/(?:error|failed|not ok|timeout|timed out|ERR_|AssertionError|\[FAIL\]|\[TIMEOUT\])/i.test(text))) {
    workflowErrors.push({ log: name, evidence: evidence.slice(0, 12) });
  }
}
const envFailed = Object.entries(stepOutcomes).filter(([, value]) => value === 'failure' || value === 'cancelled').map(([key]) => key);
const workflowFailed = ['failure','cancelled'].includes(process.env.CI_STATUS);
let status = process.env.CI_STATUS === 'cancelled' ? 'CANCELLED' : (workflowFailed || failedRows.length || activeStage || !resultsDoc ? 'FAILED' : 'PASSED');
// P105: fail-closed evidence assessment. A run that would be PASSED but whose evidence is missing, malformed or contradictory is UNVERIFIED.
const evidenceLib = await import('./evidenceLib.mjs').catch(() => null);
const evidenceUnavailable = (code, detail) => ({ required: true, completeness: 'unavailable', problems: [{ severity: 'critical', code, detail }], records: [], refs: [], evidenceOk: false });
let evidence;
try { evidence = evidenceLib ? evidenceLib.assessEvidence(dir, resultsDoc) : evidenceUnavailable('EVIDENCE_LIBRARY_UNAVAILABLE', 'evidenceLib.mjs failed to load'); } catch (error) { evidence = evidenceUnavailable('ASSESSMENT_CRASH', String(error && error.message || error)); }
// P107: BLOCKED, SKIPPED_BY_POLICY, NOT_RUN, UNKNOWN and PARTIAL rows are never PASS; a run that contains one is not a success.
const NOT_VERIFIED = ['BLOCKED', 'SKIPPED_BY_POLICY', 'NOT_RUN', 'UNKNOWN', 'PARTIAL'];
const notVerifiedRows = uniqueRows.filter((r) => NOT_VERIFIED.includes(r.status));
if (status === 'PASSED' && evidence.required && !evidence.evidenceOk) status = 'UNVERIFIED';
if (status === 'PASSED' && notVerifiedRows.length) status = 'UNVERIFIED';
const sha = oneLine(process.env.GITHUB_SHA || resultsDoc?.commit || 'local/unknown', 80);
const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : 'unavailable';
const count = (s) => uniqueRows.filter((r) => r.status === s).length;
const failedStageNames = [...new Set([...failedRows.map((r) => `${r.id}:${r.status}`), ...envFailed.map((s) => `workflow-${s}:FAIL`)])];
const skipped = uniqueRows.filter((r) => r.status === 'SKIPPED' || NOT_VERIFIED.includes(r.status)).map((r) => (r.status === 'SKIPPED' ? r.id : `${r.id}:${r.status}${r.note ? ` (${oneLine(r.note, 120)})` : ''}`));
const handoff = [];
handoff.push('# BiForge ASSISTANT HANDOFF');
handoff.push(`PATCH_STATUS=${status}`, `COMMIT=${sha}`, `WORKFLOW_RUN=${runUrl}`);
const lockVersion = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')).lockfileVersion; } catch { return 'unknown'; } })();
handoff.push(`RUNTIME=node ${oneLine(process.version,40)}; platform=${process.platform}; package-lock-version=${lockVersion}`);
handoff.push(`PHASES=dag:${stepOutcomes.dag}`);
handoff.push(`DIAGNOSTIC_RESULTS=${count('PASS')} PASS, ${count('FAIL')} FAIL, ${count('TIMEOUT')} TIMEOUT, ${count('SKIPPED')} SKIPPED, ${count('BLOCKED')} BLOCKED, ${count('SKIPPED_BY_POLICY')} SKIPPED_BY_POLICY`);
handoff.push(`FAILED_STAGES=${failedStageNames.join('; ') || 'none recorded'}`);
handoff.push(`TIMEOUTS=${failedRows.filter((r) => r.status === 'TIMEOUT').map((r) => `${r.id}:${Math.round((r.durationMs||0)/1000)}s; origin=${r.timeoutOrigin||'unknown'}; node-test-limit=${r.nodeTestTimeoutMs ?? 'n/a'}ms; watchdog-limit=${r.watchdogTimeoutMs ?? r.timeoutMs ?? 'unknown'}ms`).join(' | ') || 'none'}`);
handoff.push(`SKIPPED_STAGES=${skipped.join(', ') || 'none'}`);
handoff.push(`ACTIVE_AT_RUN_END=${activeStage ? `${activeStage.id}; phase=${activeStage.phase}; log=${activeStage.log}; timeout-limit=${activeStage.timeoutMs}ms` : 'none'}`);
handoff.push(`MISSING_LOGS=${uniqueRows.filter((r) => r.log && ['PASS','FAIL','TIMEOUT'].includes(r.status) && !fs.existsSync(path.join(dir, path.basename(r.log)))).map((r) => path.basename(r.log)).join(', ') || 'none'}`);
const errorSections = [];
for (const stage of failedRows) {
  const logName = path.basename(stage.log || `${stage.id}.log`);
  const text = read(logName);
  errorSections.push(`--- ${stage.id} ${stage.status}; duration=${Math.round((stage.durationMs||0)/1000)}s; exit=${stage.exitCode ?? 'unknown'}; signal=${stage.signal||'none'}; timeout=${stage.timeoutOrigin||'none'}; node-test-limit=${stage.nodeTestTimeoutMs ?? 'n/a'}ms; watchdog-limit=${stage.watchdogTimeoutMs ?? stage.timeoutMs ?? 'unknown'}ms; log=${logName}`);
  errorSections.push(`COMMAND_ARGV=${oneLine(JSON.stringify(stage.command ? [stage.command, ...(stage.args || [])] : (stage.script || 'unknown')), 900)}`);
  if (stage.note) errorSections.push(`RUNNER_NOTE=${oneLine(stage.note,500)}`);
  const evidence = excerptForLog(text, stage.status === 'INTERRUPTED' ? 'TIMEOUT' : stage.status);
  errorSections.push(...(evidence.length ? evidence : ['LOG_EVIDENCE=empty or unavailable']));
  errorSections.push(...sourceContext(stage, text));
  if (stage.id === 'version-consistency' && !text.trim()) {
    const pkg = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); } catch { return {}; } })();
    const configText = (() => { try { return fs.readFileSync(path.join(root, 'src/config.ts'), 'utf8'); } catch { return ''; } })();
    const appVersion = (configText.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1] || 'unknown';
    const changelog = (() => { try { return fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'); } catch { return ''; } })();
    const release = (changelog.match(/^## (P[0-9]+(?:\.[0-9]+)*)/m) || [])[1] || 'unknown';
    errorSections.push(`VERSION_CHECK_CONTEXT=package.json version=${pkg.version ?? 'unknown'}; src/config.ts APP_VERSION=${appVersion}; CHANGELOG first release=${release}`);
    errorSections.push('VERSION_CHECK_SOURCE=scripts/check-version.mjs; rerun: node scripts/check-version.mjs');
  }
  if (stage.lastOutput?.length) errorSections.push(`LAST_OUTPUT=${stage.lastOutput.slice(-12).map((x) => oneLine(x,220)).join(' || ')}`);
}
if (failedStageNames.some((name) => name.startsWith('version-consistency:')) && !workflowErrors.some((group) => group.log === 'version-consistency.log')) {
  const versionLog = read('version-consistency.log');
  errorSections.push('--- WORKFLOW_LOG=version-consistency.log');
  errorSections.push(...(versionLog.trim() ? excerptForLog(versionLog, 'FAIL') : ['LOG_EVIDENCE=empty or unavailable; inspect ci-dag.log for the actual check-version output.']));
}
for (const group of workflowErrors) {
  // Avoid duplicating the diagnostic gate output already represented by per-probe logs unless it has independent evidence.
  if (group.log === 'ci-dag.log' && failedRows.length) continue;
  errorSections.push(`--- WORKFLOW_LOG=${group.log}`);
  errorSections.push(...group.evidence.slice(0, 10));
}
if (!errorSections.length && status === 'FAILED') errorSections.push('ERROR_EVIDENCE=No detailed stage record found; inspect workflow step outcomes and logs named below.');
// Make the handoff useful without requiring the source archive: record the repo's check command,
// the exact failing stage commands when available, and source excerpts around each reported location.
const packageJson = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); } catch { return {}; } })();
const rerunCommands = [];
for (const stage of failedRows) {
  const id = String(stage.id || '');
  const script = id.startsWith('test:') || id.startsWith('check:') ? id : null;
  const command = stage.command ? [stage.command, ...(stage.args || [])].join(' ') : (id === 'version-consistency' ? 'node scripts/check-version.mjs' : (script && packageJson.scripts?.[script] ? `npm run ${script}` : null));
  if (command) rerunCommands.push(`${id}: ${command}`);
}
handoff.push(`REPO_CHECK_COMMAND=${oneLine(packageJson.scripts?.check || 'unavailable', 1800)}`);
handoff.push(`FAILED_STAGE_RERUN_COMMANDS=${rerunCommands.length ? rerunCommands.map((x) => oneLine(x, 1000)).join(' | ') : 'not recorded; use log/source evidence below'}`);
handoff.push('HANDOFF_RULE=This file is the primary handoff. It includes redacted failure evidence/source excerpts plus current and recent CI metrics when available. diagnostics.zip is packaged on green and red runs and contains all available logs/evidence; use it for full context. Treat absent evidence as unknown and never claim unrun checks passed.');
handoff.push('EVIDENCE_BEGIN', ...errorSections, 'EVIDENCE_END');
const criticalLogSet = failedRows.some((r) => r.phase === 'critical') ? uniqueRows.filter((r) => r.phase === 'critical' && r.log).map((r) => r.log) : [];
handoff.push(`LOG_FILES=${[...new Set([...criticalLogSet, ...failedRows.map((r) => path.basename(r.log || `${r.id}.log`)), ...workflowErrors.map((g) => g.log)])].filter((name) => fs.existsSync(path.join(dir,name))).join(', ') || logs.join(', ') || 'none'}`);
handoff.push(`EVIDENCE=${evidence.completeness}; records=${evidence.refs.join(', ') || 'none advertised'}; problems=${evidence.problems.length}`);
handoff.push(`EVIDENCE_PROBLEMS=${evidence.problems.length ? evidence.problems.slice(0, 8).map((x) => `${x.code}: ${oneLine(x.detail, 200)}`).join(' | ') : 'none'}`);
handoff.push(`ROOT_CAUSE_CONFIDENCE=${failedRows.some((r) => r.status === 'TIMEOUT') ? 'assertion evidence may be confirmed; timeout cause remains unproven unless final active test/operation is identified' : failedRows.length ? 'use assertion and source context; do not infer intent beyond evidence' : status === 'FAILED' ? 'workflow failure recorded but diagnostic stage evidence incomplete' : 'no failure recorded'}`);
const nextActionText = status === 'UNVERIFIED' ? (notVerifiedRows.length ? 'Some checks were BLOCKED, SKIPPED_BY_POLICY, NOT_RUN or UNKNOWN; the run is not a success. Resolve the named prerequisite or policy, not product logic.' : 'Checks reported success but the evidence is missing, malformed or contradictory. Treat the result as unverified; fix the evidence producer, not product logic.') : (status === 'PASSED' ? 'No corrective patch indicated by these checks; verify required release gates.' : 'Fix only evidenced failures; use source context and exact command. For timeouts, investigate the last active test/output and cleanup before changing product logic.');
handoff.push(`NEXT_ACTION=${nextActionText}`);
let handoffJson = 'unavailable';
try {
  if (evidenceLib) {
    const handoffReport = evidenceLib.buildHandoffReport({
      patchStatus: status,
      summary: `${status}: ${count('PASS')} PASS, ${count('FAIL')} FAIL, ${count('TIMEOUT')} TIMEOUT, ${count('SKIPPED')} SKIPPED, ${count('BLOCKED')} BLOCKED, ${count('SKIPPED_BY_POLICY')} SKIPPED_BY_POLICY; evidence ${evidence.completeness}`,
      evidence, failedStages: failedStageNames, blockedStages: skipped, nextAction: nextActionText,
      limitations: evidence.problems.length ? evidence.problems.slice(0, 8).map((x) => `${x.code}: ${x.detail}`).join('; ') : (evidence.required ? 'none recorded' : 'legacy results without evidence records'),
    });
    const verdict = evidenceLib.validateHandoffReport(handoffReport);
    if (verdict.ok) { fs.writeFileSync(path.join(dir, 'handoff-report.json'), JSON.stringify(handoffReport, null, 2) + '\n'); handoffJson = JSON.stringify(handoffReport); }
    else handoffJson = `invalid: ${oneLine(verdict.errors.slice(0, 2).join(' | '), 300)}`;
  }
} catch (error) { handoffJson = `error: ${oneLine(error && error.message || error, 200)}`; }
// P108.2: include green and red CI metrics plus the latest five-cycle history in the primary handoff.
const history = json('ci-history.json');
const metrics = json('ci-metrics.json');
if (history?.current) {
  history.current.status = status;
  history.current.reportStatus = status;
  history.current.checks = metrics?.checks || history.current.checks;
  history.current.checkResults = metrics?.checkResults || history.current.checkResults;
  history.updatedAt = new Date().toISOString();
  fs.writeFileSync(path.join(dir, 'ci-history.json'), JSON.stringify(history, null, 2) + '\n');
}
if (metrics?.run) {
  metrics.run.status = status;
  metrics.run.reportStatus = status;
  fs.writeFileSync(path.join(dir, 'ci-metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
}
if (history) {
  const c = history.current?.checks || {};
  handoff.push(`CI_CYCLES_REQUESTED=${history.requestedCycles || 5}`);
  handoff.push(`CI_CYCLES_INCLUDED=${history.includedCycles || 1}`);
  handoff.push(`CI_HISTORY_STATUS=${history.historyStatus || 'UNKNOWN'}`);
  handoff.push(`CI_CURRENT_DAG_DURATION_MS=${history.current?.dagWallClockMs ?? 'unknown'}`);
  handoff.push(`CI_CURRENT_JOB_ELAPSED_MS=${history.current?.jobElapsedAtCollectionMs ?? 'unknown; current job start time unavailable'}`);
  handoff.push(`CI_CURRENT_CHECKS=total:${c.total ?? 0},executed:${c.executed ?? c.completed ?? 0},completed:${c.completed ?? 0},pass:${c.pass ?? 0},fail:${c.fail ?? 0},timeout:${c.timeout ?? 0},blocked:${c.blocked ?? 0},skipped:${c.skipped ?? 0},skipped_by_policy:${c.skipped_by_policy ?? 0},not_run:${c.not_run ?? 0},unknown:${c.unknown ?? 0}`);
  for (const run of history.previousRuns || []) {
    const rc = run.checks || {};
    handoff.push(`CI_RECENT_RUN=${run.runId};conclusion:${run.conclusion || 'UNKNOWN'};workflow_ms:${run.workflowDurationMs ?? 'unknown'};job_ms:${run.jobDurationMs ?? 'unknown'};dag_ms:${run.dagWallClockMs ?? 'unknown'};checks_total:${rc.total ?? 'unknown'};pass:${rc.pass ?? 'unknown'};fail:${rc.fail ?? 'unknown'};timeout:${rc.timeout ?? 'unknown'};blocked:${rc.blocked ?? 'unknown'};metrics:${run.artifactSource || run.metricsSource || 'unavailable'}`);
  }
  if (history.historyError) handoff.push(`CI_HISTORY_ERROR=${oneLine(history.historyError, 300)}`);
  handoff.push('CI_HISTORY_RULE=Historical metrics absent from legacy artifacts remain unknown; workflow duration and DAG/check duration are distinct metrics.');
}
handoff.push(`HANDOFF_JSON=${handoffJson}`);
const report = handoff.join('\n') + '\n';
fs.writeFileSync(path.join(dir, 'NEXT_PATCH.md'), report);
console.log(`Wrote ${path.relative(root, path.join(dir,'NEXT_PATCH.md'))} (${Buffer.byteLength(report)} bytes); status=${status}`);
