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
const stepOutcomes = {
  diagnostic: process.env.DIAGNOSTIC_OUTCOME || 'unknown', secondary: process.env.SECONDARY_OUTCOME || 'unknown',
  check: process.env.CHECK_OUTCOME || 'unknown', live: process.env.LIVE_OUTCOME || 'unknown',
  api: process.env.API_OUTCOME || 'unknown', build: process.env.BUILD_OUTCOME || 'unknown',
};
const workflowLogNames = ['ci-install.log','ci-diagnostic-gate.log','ci-secondary-diagnostic.log','ci-migrate.log','ci-check.log','ci-live.log','ci-api.log','ci-build.log'];
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
const status = process.env.CI_STATUS === 'cancelled' ? 'CANCELLED' : (workflowFailed || failedRows.length || activeStage || !resultsDoc ? 'FAILED' : 'PASSED');
const sha = oneLine(process.env.GITHUB_SHA || resultsDoc?.commit || 'local/unknown', 80);
const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : 'unavailable';
const count = (s) => uniqueRows.filter((r) => r.status === s).length;
const failedStageNames = [...new Set([...failedRows.map((r) => `${r.id}:${r.status}`), ...envFailed.map((s) => `workflow-${s}:FAIL`)])];
const skipped = uniqueRows.filter((r) => r.status === 'SKIPPED').map((r) => r.id);
const handoff = [];
handoff.push('# BiForge ASSISTANT HANDOFF');
handoff.push(`PATCH_STATUS=${status}`, `COMMIT=${sha}`, `WORKFLOW_RUN=${runUrl}`);
const lockVersion = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')).lockfileVersion; } catch { return 'unknown'; } })();
handoff.push(`RUNTIME=node ${oneLine(process.version,40)}; platform=${process.platform}; package-lock-version=${lockVersion}`);
handoff.push(`PHASES=diagnostic:${stepOutcomes.diagnostic}; secondary:${stepOutcomes.secondary}; check:${stepOutcomes.check}; live:${stepOutcomes.live}; api:${stepOutcomes.api}; build:${stepOutcomes.build}`);
handoff.push(`DIAGNOSTIC_RESULTS=${count('PASS')} PASS, ${count('FAIL')} FAIL, ${count('TIMEOUT')} TIMEOUT, ${count('SKIPPED')} SKIPPED`);
handoff.push(`FAILED_STAGES=${failedStageNames.join('; ') || 'none recorded'}`);
handoff.push(`TIMEOUTS=${failedRows.filter((r) => r.status === 'TIMEOUT').map((r) => `${r.id}:${Math.round((r.durationMs||0)/1000)}s; origin=${r.timeoutOrigin||'unknown'}; node-test-limit=${r.nodeTestTimeoutMs ?? 'n/a'}ms; watchdog-limit=${r.watchdogTimeoutMs ?? r.timeoutMs ?? 'unknown'}ms`).join(' | ') || 'none'}`);
handoff.push(`SKIPPED_STAGES=${skipped.join(', ') || 'none'}`);
handoff.push(`ACTIVE_AT_RUN_END=${activeStage ? `${activeStage.id}; phase=${activeStage.phase}; log=${activeStage.log}; timeout-limit=${activeStage.timeoutMs}ms` : 'none'}`);
handoff.push(`MISSING_LOGS=${['critical-router-selection.log','critical-router-policy-call-limit.log','critical-gemini-timeout.log','critical-app-builder-recovery.log'].filter((name) => !fs.existsSync(path.join(dir,name))).join(', ') || 'none'}`);
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
  if (stage.lastOutput?.length) errorSections.push(`LAST_OUTPUT=${stage.lastOutput.slice(-12).map((x) => oneLine(x,220)).join(' || ')}`);
}
for (const group of workflowErrors) {
  // Avoid duplicating the diagnostic gate output already represented by per-probe logs unless it has independent evidence.
  if (group.log === 'ci-diagnostic-gate.log' && failedRows.length) continue;
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
  const command = stage.command ? [stage.command, ...(stage.args || [])].join(' ') : (script && packageJson.scripts?.[script] ? `npm run ${script}` : null);
  if (command) rerunCommands.push(`${id}: ${command}`);
}
handoff.push(`REPO_CHECK_COMMAND=${oneLine(packageJson.scripts?.check || 'unavailable', 1800)}`);
handoff.push(`FAILED_STAGE_RERUN_COMMANDS=${rerunCommands.length ? rerunCommands.map((x) => oneLine(x, 1000)).join(' | ') : 'not recorded; use log/source evidence below'}`);
handoff.push('HANDOFF_RULE=This file is the primary handoff. It includes redacted failure evidence and source excerpts. Treat absent evidence as unknown; do not claim unrun checks passed. Ask for diagnostics.zip only if this report explicitly says logs/evidence are missing or the failure cannot be resolved from included evidence.');
handoff.push('EVIDENCE_BEGIN', ...errorSections, 'EVIDENCE_END');
const criticalLogSet = failedRows.some((r) => r.phase === 'critical') ? ['critical-router-selection.log','critical-router-policy-call-limit.log','critical-gemini-timeout.log','critical-app-builder-recovery.log'] : [];
handoff.push(`LOG_FILES=${[...new Set([...criticalLogSet, ...failedRows.map((r) => path.basename(r.log || `${r.id}.log`)), ...workflowErrors.map((g) => g.log)])].filter((name) => fs.existsSync(path.join(dir,name))).join(', ') || logs.join(', ') || 'none'}`);
handoff.push(`ROOT_CAUSE_CONFIDENCE=${failedRows.some((r) => r.status === 'TIMEOUT') ? 'assertion evidence may be confirmed; timeout cause remains unproven unless final active test/operation is identified' : failedRows.length ? 'use assertion and source context; do not infer intent beyond evidence' : status === 'FAILED' ? 'workflow failure recorded but diagnostic stage evidence incomplete' : 'no failure recorded'}`);
handoff.push(`NEXT_ACTION=${status === 'PASSED' ? 'No corrective patch indicated by these checks; verify required release gates.' : 'Fix only evidenced failures; use source context and exact command. For timeouts, investigate the last active test/output and cleanup before changing product logic.'}`);
const report = handoff.join('\n') + '\n';
fs.writeFileSync(path.join(dir, 'NEXT_PATCH.md'), report);
console.log(`Wrote ${path.relative(root, path.join(dir,'NEXT_PATCH.md'))} (${Buffer.byteLength(report)} bytes); status=${status}`);
