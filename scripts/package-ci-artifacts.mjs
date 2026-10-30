// P108.2: always publish a complete, redacted diagnostics bundle for green and red CI.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
let JSZip = null; try { JSZip = (await import('jszip')).default; } catch {}
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.env.CI_LOGS_DIR || 'artifacts/ci-checks');
const reportPath = path.join(dir, 'PATCH_EVIDENCE.md');
const finalReportPath = path.join(dir, 'BIForge-PATCH-EVIDENCE.md');
const zipPath = path.join(dir, 'biforge-ci-logs.zip');
fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(reportPath)) throw new Error('PATCH_EVIDENCE.md must be generated before packaging artifacts');
const readJson = (name) => { try { return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')); } catch { return null; } };
const report = fs.readFileSync(reportPath, 'utf8');
const reportStatus = report.match(/^PATCH_STATUS=([^\r\n]+)/m)?.[1] || 'UNKNOWN';
const jobStatus = process.env.CI_STATUS || 'unknown';
const status = reportStatus === 'PASSED' && jobStatus === 'failure' ? 'WORKFLOW_FAILED_AFTER_HANDOFF' : (reportStatus === 'PASSED' && jobStatus === 'cancelled' ? 'WORKFLOW_CANCELLED_AFTER_HANDOFF' : reportStatus);
const resultDoc = readJson('results.json');
const resultRows = Array.isArray(resultDoc?.results) ? resultDoc.results : [];
const statuses = ['PASS','FAIL','TIMEOUT','BLOCKED','SKIPPED','SKIPPED_BY_POLICY','NOT_RUN','UNKNOWN','INTERRUPTED'];
const counts = Object.fromEntries(statuses.map(s => [s.toLowerCase(), resultRows.filter(r => String(r.status || 'UNKNOWN').toUpperCase() === s).length]));
counts.total = resultRows.length; counts.executed = counts.pass + counts.fail + counts.timeout; counts.completed = counts.executed;
const fallbackCurrent = { runId:process.env.GITHUB_RUN_ID || null, runUrl:process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null, sha:process.env.GITHUB_SHA || null, status, collectedAt:new Date().toISOString(), dagWallClockMs:Number.isFinite(resultDoc?.wallClockMs)?resultDoc.wallClockMs:null, checks:counts, checkResults:resultRows.map(r=>({id:r.id,status:r.status||'UNKNOWN',durationMs:r.durationMs??null,critical:Boolean(r.critical),log:r.log||null})) };
let history = readJson('ci-history.json');
let metrics = readJson('ci-metrics.json');
if (!metrics) { metrics = { schemaVersion:1, generatedAt:new Date().toISOString(), run:fallbackCurrent, checks:counts, checkResults:fallbackCurrent.checkResults }; }
if (!history) { history = { schemaVersion:1, generatedAt:new Date().toISOString(), requestedCycles:5, includedCycles:1, current:fallbackCurrent, previousRuns:[], historyStatus:'UNAVAILABLE_COLLECTOR_MISSING', historyError:'CI history collector did not produce output; current results are still included.', limitations:['Historical data unavailable; missing metrics are unknown, never PASS.'] }; }
if (history?.current) {
  history.current.status = status;
  history.current.reportStatus = reportStatus;
  history.current.workflowJobStatusAtPackaging = process.env.CI_STATUS || 'unknown';
  history.current.finalStatusKnownAtPackaging = true;
  history.current.packagedAt = new Date().toISOString();
  if (Number.isFinite(history.current.jobElapsedAtCollectionMs)) history.current.jobElapsedMs = history.current.jobElapsedAtCollectionMs;
  history.generatedAt = new Date().toISOString();
  history.current.checks = metrics?.checks || history.current.checks;
  history.current.checkResults = metrics?.checkResults || history.current.checkResults;
  fs.writeFileSync(path.join(dir, 'ci-history.json'), JSON.stringify(history, null, 2) + '\n');
}
if (metrics?.run) {
  metrics.run.status = status;
  metrics.run.reportStatus = reportStatus;
  metrics.run.workflowJobStatusAtPackaging = process.env.CI_STATUS || 'unknown';
  metrics.run.packagedAt = new Date().toISOString();
  if (history?.current?.jobElapsedMs != null) metrics.run.jobElapsedMs = history.current.jobElapsedMs;
  fs.writeFileSync(path.join(dir, 'ci-metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
}
// Keep the single handoff self-sufficient even if a report generator fallback was used.
const finalHistoryLines = [
  `CI_WORKFLOW_JOB_STATUS_AT_PACKAGING=${process.env.CI_STATUS || 'unknown'}`,
  `CI_ARCHIVE_STATUS=${status}`,
  `CI_REPORT_STATUS=${reportStatus}`, 
  `CI_ARCHIVE_CONTENTS=BIForge-PATCH-EVIDENCE.md,biforge-ci-logs.zip`,
];
let finalReport = fs.readFileSync(reportPath, 'utf8').replace(/\n?CI_ARCHIVE_METADATA_BEGIN[\s\S]*?CI_ARCHIVE_METADATA_END\n?/g, '\n');
finalReport = `${finalReport.trimEnd()}\nCI_ARCHIVE_METADATA_BEGIN\n${finalHistoryLines.join('\n')}\nCI_ARCHIVE_METADATA_END\n`;
fs.writeFileSync(reportPath, finalReport);
const redact = (value) => String(value)
  .replace(/\u001b\[[0-9;]*m/g, '').replace(/\r/g, '')
  .replace(/([\"']?[A-Z0-9_]*(?:API_KEY|TOKEN|PASSWORD|SECRET|PRIVATE_KEY|ACCESS_KEY|AUTHORIZATION|DATABASE_URL)[A-Z0-9_]*[\"']?\s*[:=]\s*[\"']?)([^\"'\s,;]+)([\"']?)/gi, '$1[REDACTED]$3')
  .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
  .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[REDACTED_GOOGLE_KEY]')
  .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, '[REDACTED_API_KEY]')
  .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, '[REDACTED_GITHUB_TOKEN]')
  .replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED_AWS_KEY]')
  .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
  .replace(/(postgres(?:ql)?:\/\/[^:\s/@]+):[^@\s/]+@/gi, '$1:[REDACTED]@');
// The outer artifact is also consumed directly; sanitize its handoff and JSON, not only the inner ZIP.
for (const name of ['PATCH_EVIDENCE.md', 'ci-metrics.json', 'ci-history.json']) {
  const full = path.join(dir, name);
  if (fs.existsSync(full)) fs.writeFileSync(full, redact(fs.readFileSync(full, 'utf8')));
}
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
const zip = JSZip ? new JSZip() : null;
const files = fs.readdirSync(dir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name !== 'diagnostics.zip' && !entry.name.endsWith('.zip'))
  .map((entry) => entry.name).sort();
const failedRows = resultRows.filter((r) => ['FAIL', 'TIMEOUT'].includes(String(r.status || '').toUpperCase()));
const activeAtEnd = resultDoc?.active || resultDoc?.activeAll?.[0] || null;
const failedStages = failedRows.map((r) => ({
  id: r.id,
  status: r.status,
  durationMs: r.durationMs ?? null,
  critical: Boolean(r.critical),
  log: r.log || null,
  script: r.script || [r.command, ...(r.args || [])].filter(Boolean).join(' ') || null,
  note: r.note || null,
  rerun: r.script || (r.command ? [r.command, ...(r.args || [])].join(' ') : null),
}));
const logTail = (name, max = 40) => {
  try {
    const lines = fs.readFileSync(path.join(dir, name), 'utf8').split(/\r?\n/);
    return lines.slice(-max).join('\n');
  } catch { return null; }
};
const failingLogTails = Object.fromEntries(
  failedStages.filter((s) => s.log).map((s) => [s.log, logTail(s.log)]),
);
const nextAction = report.match(/^NEXT_ACTION=([^\r\n]+)/m)?.[1]
  || (failedStages.length
    ? `Fix failed stages: ${failedStages.map((s) => s.id + ':' + s.status).join(', ')}. Rerun: ${failedStages.map((s) => s.rerun).filter(Boolean).join(' ; ') || 'npm run test:pipeline'}`
    : 'No failed stages recorded in results.json');
const assistantBrief = [
  '# ASSISTANT BRIEF (CI diagnostics)',
  '',
  `status: ${status}`,
  `commit: ${process.env.GITHUB_SHA || metrics?.run?.sha || 'local/unknown'}`,
  `runId: ${process.env.GITHUB_RUN_ID || metrics?.run?.runId || 'null'}`,
  `runUrl: ${metrics?.run?.runUrl || 'null'}`,
  `workflowJobStatusAtPackaging: ${process.env.CI_STATUS || 'unknown'}`,
  `checks: total=${counts.total} pass=${counts.pass} fail=${counts.fail} timeout=${counts.timeout} blocked=${counts.blocked} skipped=${counts.skipped}`,
  `failedStages: ${failedStages.length ? failedStages.map((s) => s.id + ':' + s.status).join(', ') : 'none'}`,
  `activeAtEnd: ${activeAtEnd ? JSON.stringify(activeAtEnd) : 'none'}`,
  `nextAction: ${nextAction}`,
  '',
  'Rerun commands:',
  ...(failedStages.length ? failedStages.map((s) => `- ${s.id}: ${s.rerun || '(no command recorded)'}`) : ['- (none)']),
  '',
  'Read order: ASSISTANT-BRIEF.md → diagnostics-index.json → BIForge-PATCH-EVIDENCE.md / PATCH_EVIDENCE.md → failing *.log tails → evidence-dag.json.',
  '',
].join('\n');

const index = {
  schemaVersion: 4,
  artifactType: 'biforge-ci-full-logs',
  status,
  commit: process.env.GITHUB_SHA || metrics?.run?.sha || 'local/unknown',
  runId: process.env.GITHUB_RUN_ID || metrics?.run?.runId || null,
  runUrl: metrics?.run?.runUrl || null,
  createdAt: new Date().toISOString(),
  workflowJobStatusAtPackaging: process.env.CI_STATUS || 'unknown',
  completeness: 'all available files in CI_LOGS_DIR; unavailable checks and historical metrics remain explicitly unknown',
  checks: counts,
  failedStages,
  activeAtEnd,
  nextAction,
  failingLogTails,
  files: [],
};
for (const name of files) {
  const full = path.join(dir, name);
  const raw = fs.readFileSync(full);
  // All CI diagnostic inputs are text/JSON; preserve any unexpected binary file as bytes without attempting text redaction.
  const isText = /\.(?:log|json|md|txt|ya?ml|xml|csv|mjs|js|ts)$/i.test(name);
  const data = isText ? Buffer.from(redact(raw.toString('utf8')), 'utf8') : raw;
  if (zip) zip.file(name, data);
  else fs.writeFileSync(path.join(dir, name), data);
  index.files.push({ name, bytes: data.length, redacted: isText });
}
const briefBytes = Buffer.from(assistantBrief, 'utf8');
index.files.push({ name: 'ASSISTANT-BRIEF.md', bytes: briefBytes.length, redacted: true });
// diagnostics-index.json is generated last; its own byte count is recorded after serialization (stable once files list is final).
let indexJson = Buffer.from(JSON.stringify(index, null, 2) + '\n', 'utf8');
index.files.push({ name: 'diagnostics-index.json', bytes: indexJson.length, redacted: true });
indexJson = Buffer.from(JSON.stringify(index, null, 2) + '\n', 'utf8');
index.files[index.files.length - 1].bytes = indexJson.length;
indexJson = Buffer.from(JSON.stringify(index, null, 2) + '\n', 'utf8');
index.files[index.files.length - 1].bytes = indexJson.length;
if (zip) {
  zip.file('ASSISTANT-BRIEF.md', briefBytes);
  zip.file('diagnostics-index.json', indexJson);
  const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  fs.writeFileSync(zipPath, bytes);
} else {
  fs.writeFileSync(path.join(dir, 'ASSISTANT-BRIEF.md'), briefBytes);
  fs.writeFileSync(path.join(dir, 'diagnostics-index.json'), indexJson);
  const names = [...files, 'ASSISTANT-BRIEF.md', 'diagnostics-index.json'];
  const packed = spawnSync('zip', ['-q', '-j', zipPath, ...names], { cwd: dir, encoding: 'utf8' });
  if (packed.status !== 0) throw new Error(`Neither JSZip nor system zip could package diagnostics: ${packed.stderr || packed.error?.message || packed.status}`);
}
// The outer GitHub artifact always contains the primary handoff, diagnostics, metrics and five-cycle history.
for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (!['PATCH_EVIDENCE.md', 'biforge-ci-logs.zip'].includes(entry.name)) fs.rmSync(path.join(dir, entry.name), { force: true });
}
if (fs.existsSync(reportPath)) fs.renameSync(reportPath, finalReportPath);
console.log(`Created biforge-ci-logs.zip (${index.files.length} diagnostic files, ${fs.statSync(zipPath).size} bytes); status=${status}; history=${history?.historyStatus || 'unavailable'}.`);
console.log(`CI report artifact files: ${fs.readdirSync(dir).sort().join(', ')}`);
