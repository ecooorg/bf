// P94 compact, evidence-rich CI handoff. Deterministic; no model/API calls.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.env.CI_LOGS_DIR || 'artifacts/ci-checks');
const outFile = path.join(dir, 'NEXT_PATCH.md');
const exists = (name) => fs.existsSync(path.join(dir, name));
const read = (name) => { try { return fs.readFileSync(path.join(dir, name), 'utf8'); } catch { return ''; } };
const json = (name) => { try { return JSON.parse(read(name)); } catch { return null; } };
const redact = (value) => String(value ?? '')
  .replace(/\u001b\[[0-9;]*m/g, '').replace(/\r/g, '')
  .replace(/(GEMINI_API_KEY|GOOGLE_API_KEY|GROQ_API_KEY|OPENAI_API_KEY|API_KEY|SESSION_SECRET|APP_PASSWORD)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
  .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
  .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[REDACTED_GOOGLE_KEY]')
  .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, '[REDACTED_API_KEY]');
const safe = (s, n = 420) => redact(s).replace(/`/g, "'").replace(/[\r\n]+/g, ' ').trim().slice(0, n);
const clip = (s, n = 3600) => { const t = redact(s).trim(); return t.length > n ? `…[trimmed to last ${n} chars]\n${t.slice(-n)}` : t; };

fs.mkdirSync(dir, { recursive: true });
const resultsDoc = json('results.json');
const stages = Array.isArray(resultsDoc?.results) ? resultsDoc.results : [];
const uniqueStages = [...new Map(stages.map((s) => [`${s.id}:${s.status}`, s])).values()];
const failedStages = uniqueStages.filter((s) => s.status !== 'PASS' && s.status !== 'SKIPPED');
const workflowLogs = [
  'ci-install.log', 'ci-diagnostic-gate.log', 'ci-secondary-diagnostic.log', 'ci-migrate.log',
  'ci-check.log', 'ci-live.log', 'ci-api.log', 'ci-build.log',
];
const presentLogs = fs.readdirSync(dir).filter((f) => f.endsWith('.log')).sort();
const failedDetails = [];
const rootCauseHints = [];

function extractEvidence(logText, status) {
  const lines = redact(logText).split('\n');
  const evidence = [];
  const interesting = /(^\s*not ok\s+\d+\s+-|AssertionError|ERR_[A-Z_]+|error TS\d+|Error:|Expected:|Actual:|expected\s|actual\s|operator:|\bcode: 'ERR|timed out|TIMEOUT|ELIFECYCLE|Assertion failed|failed to|uncaught exception|Cancelled|cancelled|\bat\s+.*\([^)]*:\d+:\d+\)|\bexpected:|\bactual:|\+ actual|\- expected|duration_ms|# tests |# pass |# fail |# cancelled )/i;
  for (let i = 0; i < lines.length; i++) {
    if (!interesting.test(lines[i])) continue;
    const start = Math.max(0, i - (/(not ok|AssertionError|error TS|timed out)/i.test(lines[i]) ? 2 : 1));
    const end = Math.min(lines.length, i + (/(not ok|AssertionError|error TS)/i.test(lines[i]) ? 14 : 4));
    for (let j = start; j < end; j++) if (lines[j].trim()) evidence.push(safe(lines[j]));
  }
  const deduped = [...new Set(evidence)];
  if (status === 'TIMEOUT' || /test timed out after|SIGKILL|timed out/i.test(logText)) {
    const lastOk = [...lines].reverse().find((l) => /^\s*(?:ok\s+\d+\s+-|ok\s+-|\d+ tests? passed)/i.test(l.trim()));
    const lastOutput = lines.filter((l) => l.trim()).slice(-18).map((l) => safe(l));
    if (lastOk) deduped.unshift(`LAST_SUCCESSFUL_TEST=${safe(lastOk)}`);
    deduped.push(...lastOutput.map((l) => `TAIL=${l}`));
  }
  return [...new Set(deduped)].slice(-42);
}

for (const stage of failedStages) {
  const logName = path.basename(stage.log || `${stage.id}.log`);
  const text = read(logName);
  const evidence = extractEvidence(text, stage.status);
  failedDetails.push({ ...stage, logName, evidence });
  if (stage.status === 'TIMEOUT' || /test timed out after|timed out/i.test(text)) {
    rootCauseHints.push(`${stage.id}: timeout observed; root cause not proven from current logs. Check final test output, pending requests, open handles and child-process cleanup.`);
  }
  if (!evidence.length && text) rootCauseHints.push(`${stage.id}: failure has no recognised assertion/error markers; inspect ${logName}.`);
}

const workflowErrors = [];
for (const name of workflowLogs) {
  const text = read(name);
  if (!text) continue;
  const matches = extractEvidence(text, 'FAIL');
  if (matches.length) workflowErrors.push({ log: name, evidence: matches.slice(-8) });
}

const stepOutcomes = {
  diagnostic: process.env.DIAGNOSTIC_OUTCOME || 'unknown',
  secondary: process.env.SECONDARY_OUTCOME || 'unknown',
  check: process.env.CHECK_OUTCOME || 'unknown',
  live: process.env.LIVE_OUTCOME || 'unknown',
  api: process.env.API_OUTCOME || 'unknown',
  build: process.env.BUILD_OUTCOME || 'unknown',
};
const workflowFailed = process.env.CI_STATUS === 'failure' || process.env.CI_STATUS === 'cancelled';
const status = workflowFailed || failedStages.length > 0 || !resultsDoc ? (process.env.CI_STATUS === 'cancelled' ? 'CANCELLED' : 'FAILED') : 'PASSED';
const sha = safe(process.env.GITHUB_SHA || 'local/unknown', 80);
const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : 'unavailable';
const count = (s) => uniqueStages.filter((x) => x.status === s).length;
const lines = [
  '# BiForge NEXT_PATCH', '',
  `- **Status:** ${status}`,
  `- **Commit:** ${sha}`,
  `- **Workflow run:** ${runUrl}`,
  `- **Generated (UTC):** ${new Date().toISOString()}`,
  `- **Diagnostic results:** ${count('PASS')} PASS / ${count('FAIL')} FAIL / ${count('TIMEOUT')} TIMEOUT / ${count('SKIPPED')} SKIPPED`,
  `- **Phases:** minimum=${stepOutcomes.diagnostic}; secondary=${stepOutcomes.secondary}; remaining-check=${stepOutcomes.check}; live=${stepOutcomes.live}; api=${stepOutcomes.api}; build=${stepOutcomes.build}`,
  '', '## Execution order',
  '- Wave 0 runs targeted router-selection, policy/call-limit, Gemini-timeout, and App Builder recovery probes before broad suites, typecheck, or database migrations.',
  '- If any Wave 0 probe fails, broad minimum suites are skipped; otherwise all minimum suites run independently and collect failures/timeouts.',
  '', '## Failures with evidence'
];
if (failedDetails.length) {
  for (const s of failedDetails) {
    lines.push(`- **${safe(s.status)} — ${safe(s.id)}**; duration ${Math.round((s.durationMs || 0) / 1000)}s; exit ${s.exitCode ?? 'unknown'}; log: \`${safe(s.log || s.logName)}\``);
    if (s.note) lines.push(`  - Spawn/runner note: ${safe(s.note)}`);
    if (s.evidence.length) for (const clue of s.evidence.slice(-14)) lines.push(`  - ${clue}`);
    else lines.push('  - No reliable error detail extracted; full failed log is in diagnostics.zip.');
  }
} else if (!resultsDoc) lines.push('- `results.json` is missing or unreadable; the runner may not have completed.');
else lines.push('- No failed diagnostic stage recorded. Check workflow-level outcomes and security scan.');

lines.push('', '## Exact evidence files');
if (presentLogs.length) for (const name of presentLogs) lines.push(`- \`${name}\``);
else lines.push('- No .log files were produced.');
lines.push('', '## Workflow-level evidence');
if (workflowErrors.length) for (const group of workflowErrors) {
  lines.push(`- **${group.log}**`);
  for (const clue of group.evidence.slice(-6)) lines.push(`  - ${clue}`);
} else lines.push('- No additional workflow-level error markers found.');
lines.push('', '## Root-cause confidence');
if (rootCauseHints.length) for (const hint of [...new Set(rootCauseHints)].slice(0, 8)) lines.push(`- ${hint}`);
else if (status === 'FAILED') lines.push('- No root cause is asserted without supporting error evidence. Review the included assertion output before changing product logic.');
else lines.push('- No failure root cause indicated by the collected diagnostic stages.');

lines.push('', '## Next action');
if (status === 'PASSED') lines.push('- Diagnostic and workflow checks report no failure. Review the run summary before release.');
else {
  lines.push('- Fix confirmed failures first; do not treat a timeout as a proven code defect without its last output/context.');
  lines.push('- The `diagnostics.zip` artifact contains failed-stage logs and a machine-readable index. Download it only if this report does not contain enough evidence.');
  lines.push('- Do not mark the patch complete until the required full CI and build pass.');
}

lines.push('', '---', '', '## ASSISTANT HANDOFF — COPY THIS BLOCK', '```text',
  `PATCH_STATUS=${status}`,
  `COMMIT=${sha}`,
  `FAILED_STAGES=${failedDetails.map((s) => `${safe(s.id)}:${safe(s.status)}`).join('; ') || (resultsDoc ? 'none recorded' : 'results.json missing')}`,
  `TIMEOUTS=${failedDetails.filter((s) => s.status === 'TIMEOUT' || /test timed out after|timed out/i.test(read(s.logName))).map((s) => `${safe(s.id)}:${Math.round((s.durationMs || 0) / 1000)}s`).join('; ') || 'none recorded'}`,
  `TOP_ERRORS=${failedDetails.flatMap((s) => [`[${safe(s.id)}:${safe(s.status)} duration=${Math.round((s.durationMs || 0) / 1000)}s log=${safe(s.log || s.logName)}]`, ...s.evidence.slice(-12)]).concat(workflowErrors.flatMap((g) => g.evidence.slice(-4).map((e) => `[${safe(g.log)}] ${e}`))).slice(0, 44).join(' | ').slice(0, 7600) || 'No concise error lines extracted; inspect diagnostics.zip.'}`,
  `LOG_FILES=${[...new Set([...failedDetails.map((s) => s.logName), ...workflowErrors.map((g) => g.log)])].join(', ') || 'none'}`,
  `SKIPPED_STAGES=${uniqueStages.filter((s) => s.status === 'SKIPPED').map((s) => safe(s.id)).join(', ') || 'none'}`,
  `ROOT_CAUSE_CONFIDENCE=${rootCauseHints.length ? 'unconfirmed-for-timeouts; inspect evidence per failure' : failedDetails.length ? 'assertion/error evidence captured; confirm before editing product logic' : 'no failures recorded'}`, 
  `DIAGNOSTICS_ARTIFACT=${status === 'FAILED' ? 'diagnostics.zip' : 'none'}`,
  `NEXT_ACTION=${status === 'PASSED' ? 'Review run summary; no corrective patch indicated by this report.' : 'Use assertion details and failed-stage logs in diagnostics.zip to fix confirmed root causes; rerun diagnostic gate.'}`,
  '```', ''
);
const report = lines.join('\n');
fs.writeFileSync(outFile, report);
console.log(`Wrote ${path.relative(root, outFile)} (${Buffer.byteLength(report)} bytes); status=${status}`);

