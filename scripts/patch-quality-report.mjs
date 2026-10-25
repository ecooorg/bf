// Create a compact, deterministic handoff report for the next BiForge patch.
// No model/API calls, no secrets, bounded log excerpts. Designed to run with `if: always()`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.env.CI_LOGS_DIR || 'artifacts/ci-checks');
const outFile = path.join(dir, 'NEXT_PATCH.md');
const exists = (name) => fs.existsSync(path.join(dir, name));
const read = (name) => { try { return fs.readFileSync(path.join(dir, name), 'utf8'); } catch { return ''; } };
const clip = (s, max = 1800) => {
  const text = String(s ?? '').replace(/\u001b\[[0-9;]*m/g, '').replace(/\r/g, '').trim();
  return text.length > max ? `…(trimmed)\n${text.slice(-max)}` : text;
};
const safe = (s) => String(s ?? '').replace(/`/g, "'").replace(/[\r\n]+/g, ' ').slice(0, 240);
const json = (name) => { try { return JSON.parse(read(name)); } catch { return null; } };

fs.mkdirSync(dir, { recursive: true });
const resultsDoc = json('results.json');
const primaryDoc = json('diagnostic-results.json');
const secondaryDoc = json('secondary-results.json');
const stageMap = new Map();
for (const doc of [primaryDoc, secondaryDoc, resultsDoc]) {
  for (const stage of (Array.isArray(doc?.results) ? doc.results : [])) stageMap.set(stage.id, stage);
}
const stages = [...stageMap.values()];
const workflowLogs = ['ci-install.log', 'ci-diagnostic-gate.log', 'ci-secondary-diagnostic.log', 'ci-migrate.log', 'ci-check.log', 'ci-ai.log', 'ci-live.log', 'ci-api.log', 'ci-build.log'];
const presentLogs = fs.readdirSync(dir).filter((f) => f.endsWith('.log')).sort();
const failedStages = stages.filter((s) => s.status !== 'PASS');
const failures = [];
for (const s of failedStages) {
  const logName = path.basename(s.log || `${s.id}.log`);
  const logText = read(logName);
  const testLines = logText.split(/\n/).filter((line) => /(^|\s)(not ok \d+|✖|Error:|ERR!|error TS\d+|AssertionError|timed out|TIMEOUT|failed)/i.test(line));
  failures.push({ id: s.id, status: s.status, duration: s.durationMs, exitCode: s.exitCode, log: s.log || logName, clues: testLines.slice(-8).map((x) => safe(x)) });
}
const otherFailureSignals = [];
for (const name of workflowLogs) {
  const text = read(name);
  if (!text) continue;
  const lines = text.split(/\n/).filter((line) => /(^|\s)(not ok \d+|✖|Error:|ERR!|error TS\d+|AssertionError|timed out|failed|ELIFECYCLE)/i.test(line));
  if (lines.length) otherFailureSignals.push({ log: name, clues: lines.slice(-5).map((x) => safe(x)) });
}
const skippedStages = stages.filter((s) => s.status === 'SKIPPED' || s.status === 'SKIPPED_AFTER_FAILURE');
const inferredSkipped = [];
if (primaryDoc && (primaryDoc.failed?.length || primaryDoc.results?.some((s) => s.status === 'FAIL' || s.status === 'TIMEOUT'))) {
  inferredSkipped.push('secondary diagnostic: test:regression', 'secondary diagnostic: test:pipeline', 'remaining check chain', 'live database tests', 'Project Mode API tests', 'build');
} else if (secondaryDoc && (secondaryDoc.failed?.length || secondaryDoc.results?.some((s) => s.status === 'FAIL' || s.status === 'TIMEOUT'))) {
  inferredSkipped.push('remaining check chain', 'live database tests', 'Project Mode API tests', 'build');
} else if (primaryDoc && !secondaryDoc && !primaryDoc.failed?.length) {
  inferredSkipped.push('secondary diagnostic: test:regression', 'secondary diagnostic: test:pipeline', 'remaining check chain', 'live database tests', 'Project Mode API tests', 'build');
} else if (!primaryDoc) {
  inferredSkipped.push('minimum diagnostic gate', 'secondary diagnostic gate', 'remaining check chain', 'live database tests', 'Project Mode API tests', 'build');
}
const skippedLabels = [...new Set([...skippedStages.map((s) => safe(s.id)), ...inferredSkipped])];
const overallFailed = process.env.CI_STATUS === 'failure' || failedStages.length > 0 || !resultsDoc;
const status = overallFailed ? 'FAILED' : process.env.CI_STATUS === 'cancelled' ? 'CANCELLED' : 'PASSED';
const sha = safe(process.env.GITHUB_SHA || 'local/unknown');
const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : 'unavailable';
const lines = [
  '# BiForge NEXT_PATCH', '',
  `- **Status:** ${status}`,
  `- **Commit:** ${sha}`,
  `- **Workflow run:** ${runUrl}`,
  `- **Generated (UTC):** ${new Date().toISOString()}`,
  `- **Stages:** ${stages.filter((s) => s.status === 'PASS').length} PASS / ${stages.filter((s) => s.status === 'FAIL').length} FAIL / ${stages.filter((s) => s.status === 'TIMEOUT').length} TIMEOUT`,
  `- **Diagnostic phases:** minimum=${primaryDoc ? 'completed' : 'not run'}, secondary=${secondaryDoc ? 'completed' : 'not run'}`, '',
  '## Failed or incomplete stages'
];
if (failedStages.length) {
  for (const s of failedStages) {
    lines.push(`- **${safe(s.status)} — ${safe(s.id)}**; duration ${Math.round((s.durationMs || 0) / 1000)}s; exit ${s.exitCode ?? 'unknown'}; log: \`${safe(s.log || '')}\``);
    const f = failures.find((x) => x.id === s.id);
    for (const clue of f?.clues || []) lines.push(`  - ${clue}`);
  }
} else if (!resultsDoc) {
  lines.push('- `results.json` is missing or unreadable; the independent-check runner may not have started or completed.');
} else {
  lines.push('- No failed stages recorded in `results.json`. Check workflow-level steps below for failures.');
}
if (skippedLabels.length) {
  lines.push('', '## Skipped diagnostic stages');
  for (const label of skippedLabels) lines.push(`- ${label}`);
}
lines.push('', '## Workflow-level error clues');
if (otherFailureSignals.length) {
  for (const group of otherFailureSignals) {
    lines.push(`- **${group.log}**`);
    for (const clue of group.clues) lines.push(`  - ${clue}`);
  }
} else lines.push('- No common error markers found in top-level workflow logs.');
lines.push('', '## Available logs');
for (const name of [...new Set([...workflowLogs, ...presentLogs])]) {
  if (exists(name)) lines.push(`- \`${name}\` (${fs.statSync(path.join(dir, name)).size} bytes)`);
}
lines.push('', '## Suggested next actions');
if (status === 'PASSED') {
  lines.push('- Required CI checks passed. No corrective patch is indicated by this report. Review build and security steps before release.');
} else {
  lines.push('- Fix the earliest root cause, not downstream symptoms; preserve unrelated behavior.');
  lines.push('- Run each failed stage directly first, then the complete `npm run check` and `npm run build`.');
  lines.push('- If a stage timed out, inspect its final log lines for open handles, hanging servers, or a stalled child process.');
  lines.push('- Do not mark the patch complete until required checks pass.');
}
lines.push('', '---', '', '## ASSISTANT HANDOFF — COPY THIS BLOCK', '```text',
  `PATCH_STATUS=${status}`,
  `COMMIT=${sha}`,
  `FAILED_STAGES=${failedStages.map((s) => `${safe(s.id)}:${safe(s.status)}`).join('; ') || (resultsDoc ? 'none recorded' : 'results.json missing')}`,
  `DIAGNOSTIC_PHASES=minimum:${primaryDoc ? 'completed' : 'not_run'};secondary:${secondaryDoc ? 'completed' : 'not_run'}`,
  `SKIPPED_STAGES=${skippedLabels.join('; ') || 'none recorded'}`, 
  `TOP_ERRORS=${[...failures.flatMap((f) => f.clues), ...otherFailureSignals.flatMap((g) => g.clues)].slice(0, 14).join(' | ').slice(0, 2600) || 'No concise error lines extracted; inspect attached logs.'}`,
  `LOG_FILES=${[...new Set([...workflowLogs, ...presentLogs])].filter(exists).join(', ')}`,
  `NEXT_ACTION=${status === 'PASSED' ? 'Review final build/security status; no test-driven fix suggested.' : 'Use this report and attached logs to prepare the smallest corrective patch; rerun failed stages, then full check/build.'}`,
  '```', ''
);
fs.writeFileSync(outFile, lines.join('\n'));
console.log(`Wrote ${path.relative(root, outFile)} (${fs.statSync(outFile).size} bytes); status=${status}`);
