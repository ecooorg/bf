// P94: publish one compact CI artifact. Keep the report; bundle only failed-stage evidence.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import JSZip from 'jszip';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.env.CI_LOGS_DIR || 'artifacts/ci-checks');
const reportPath = path.join(dir, 'NEXT_PATCH.md');
const zipPath = path.join(dir, 'diagnostics.zip');
fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(reportPath)) throw new Error('NEXT_PATCH.md must be generated before packaging artifacts');
const readJson = (name) => { try { return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')); } catch { return null; } };
const resultsDoc = readJson('results.json');
const rows = Array.isArray(resultsDoc?.results) ? resultsDoc.results : [];
const failedRows = rows.filter((r) => r.status !== 'PASS' && r.status !== 'SKIPPED');
const report = fs.readFileSync(reportPath, 'utf8');
const failed = /\*\*Status:\*\* FAILED|PATCH_STATUS=FAILED|\*\*Status:\*\* CANCELLED|PATCH_STATUS=CANCELLED|PATCH_STATUS=UNVERIFIED/.test(report) || failedRows.length > 0;
const redact = (text) => String(text).replace(/\u001b\[[0-9;]*m/g, '').replace(/(GEMINI_API_KEY|GOOGLE_API_KEY|GROQ_API_KEY|OPENAI_API_KEY|API_KEY|SESSION_SECRET|APP_PASSWORD)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]').replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]').replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[REDACTED_GOOGLE_KEY]').replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, '[REDACTED_API_KEY]');

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
if (failed) {
  const zip = new JSZip();
  const selected = new Set(['results.json', 'diagnostic-results.json', 'secondary-results.json', 'ci-diagnostic-gate.log', 'ci-secondary-diagnostic.log']);
  // On any failure, preserve the complete first-wave comparison set, including passing probes.
  for (const name of ['critical-router-selection.log', 'critical-router-policy-call-limit.log', 'critical-gemini-timeout.log', 'critical-app-builder-recovery.log']) selected.add(name);
  for (const row of failedRows) if (row.log) selected.add(path.basename(row.log));
  // P105: the evidence records and the structured handoff travel with the failure bundle.
  for (const name of fs.readdirSync(dir)) if (/^evidence-.*\.json$/.test(name) || name === 'handoff-report.json') selected.add(name);
  // Include workflow-level logs only when they contain failure signals; install/migration logs are kept on failure for setup diagnosis.
  for (const name of ['ci-install.log', 'ci-migrate.log', 'ci-dag.log']) {
    const full = path.join(dir, name);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, 'utf8');
    if (/(error|failed|failure|not ok|timeout|timed out|ERR!|ELIFECYCLE|error TS\d+)/i.test(text) || ['ci-install.log', 'ci-migrate.log'].includes(name)) selected.add(name);
  }
  const index = { schemaVersion: 1, commit: process.env.GITHUB_SHA || 'local/unknown', runId: process.env.GITHUB_RUN_ID || null, status: 'FAILED', createdAt: new Date().toISOString(), files: [] };
  for (const name of [...selected].sort()) {
    const full = path.join(dir, name);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    const data = redact(fs.readFileSync(full, 'utf8'));
    zip.file(name, data);
    index.files.push({ name, bytes: Buffer.byteLength(data) });
  }
  zip.file('diagnostics-index.json', JSON.stringify(index, null, 2) + '\n');
  const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  fs.writeFileSync(zipPath, bytes);
  console.log(`Created diagnostics.zip (${index.files.length} evidence files, ${bytes.length} bytes).`);
} else {
  console.log('CI passed; no diagnostics.zip needed.');
}

// Only the report and optional diagnostic bundle remain in the upload directory.
for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (!['NEXT_PATCH.md', 'diagnostics.zip'].includes(entry.name)) fs.rmSync(path.join(dir, entry.name), { force: true });
}
console.log(`Compact artifact ready: ${fs.readdirSync(dir).sort().join(', ')}`);
