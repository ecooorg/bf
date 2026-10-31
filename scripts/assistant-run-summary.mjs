/**
 * Build a single paste-friendly summary for the assistant when the navigator
 * cannot attach ZIP artifacts — only text can be pasted into chat.
 *
 * Reads logs under CI_LOGS_DIR (default artifacts/ci-checks), optional dual-compare
 * report, package.json, and writes:
 *   ASSISTANT_PASTE.txt  — compact, high-signal text (prefer this in chat)
 *   ASSISTANT_SUMMARY.json — machine-readable twin
 *
 * Env: CI_LOGS_DIR, CI_STATUS, GITHUB_* (run metadata)
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.env.CI_LOGS_DIR || 'artifacts/ci-checks');
const dualDir = path.resolve(root, process.env.DUAL_OUT_DIR || 'architect-dual-compare');
fs.mkdirSync(dir, { recursive: true });

const MAX_PASTE = Math.max(8_000, Math.min(60_000, Number(process.env.ASSISTANT_PASTE_MAX) || 28_000));
const MAX_LOG_SNIP = 2_400;
const MAX_FILES = 40;

function read(p, max = 200_000) {
  try {
    const t = fs.readFileSync(p, 'utf8');
    return t.length > max ? t.slice(0, max) + '\n…[truncated]' : t;
  } catch {
    return '';
  }
}

function listLogs(base) {
  if (!fs.existsSync(base)) return [];
  const out = [];
  const walk = (d, depth = 0) => {
    if (depth > 3) return;
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      let st;
      try { st = fs.statSync(p); } catch { continue; }
      if (st.isDirectory()) walk(p, depth + 1);
      else if (/\.(log|txt|md|json)$/i.test(name) && st.size > 0) out.push(p);
    }
  };
  walk(base);
  return out.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs).slice(0, MAX_FILES);
}

function extractFailures(text) {
  const lines = text.split(/\r?\n/);
  const hits = [];
  const re = /not ok |FAIL|AssertionError|Error:|TIMEOUT|test:core|test:web|workflow-dag|Traceback|TypeError|SyntaxError|exit code [1-9]/i;
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) {
      const chunk = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 8)).join('\n');
      hits.push(chunk);
      i += 6;
    }
  }
  return hits.slice(0, 12);
}

function compressHits(hits) {
  const seen = new Set();
  const out = [];
  for (const h of hits) {
    const key = h.replace(/\s+/g, ' ').slice(0, 160);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h.trim().slice(0, MAX_LOG_SNIP));
  }
  return out;
}

const pkg = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); }
  catch { return {}; }
})();

const status = String(process.env.CI_STATUS || process.env.JOB_STATUS || 'unknown').toLowerCase();
const meta = {
  workflow: process.env.GITHUB_WORKFLOW || null,
  runId: process.env.GITHUB_RUN_ID || null,
  runUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null,
  sha: (process.env.GITHUB_SHA || '').slice(0, 12) || null,
  ref: process.env.GITHUB_REF || null,
  event: process.env.GITHUB_EVENT_NAME || null,
  patch: pkg.patch || null,
  version: pkg.version || null,
  generatedAt: new Date().toISOString(),
  jobStatus: status,
};

const logFiles = listLogs(dir);
const dualReport = read(path.join(dualDir, 'report.md'), 12_000);
const dualJson = read(path.join(dualDir, 'report.json'), 20_000);
const patchEvidence = read(path.join(dir, 'PATCH_EVIDENCE.md'), 40_000)
  || read(path.join(dir, 'BIForge-PATCH-EVIDENCE.md'), 40_000);

const allHits = [];
for (const f of logFiles) {
  const text = read(f, 120_000);
  for (const h of extractFailures(text)) {
    allHits.push({ file: path.relative(root, f), snippet: h });
  }
}
const compressed = compressHits(allHits.map((h) => `FILE ${h.file}\n${h.snippet}`));

let dualRec = null;
try {
  if (dualJson) dualRec = JSON.parse(dualJson).recommendation || null;
} catch { /* ignore */ }

const summary = {
  schemaVersion: 1,
  artifactType: 'assistant-run-summary',
  meta,
  logFileCount: logFiles.length,
  logFiles: logFiles.map((f) => path.relative(root, f)),
  failureSnippets: compressed,
  dualCompareRecommendation: dualRec,
  hasPatchEvidence: Boolean(patchEvidence.trim()),
  pasteHint: 'Navigator: copy ASSISTANT_PASTE.txt body into the assistant chat when ZIP attach is unavailable.',
};

const lines = [];
lines.push('# ASSISTANT_PASTE — BiForge workflow summary');
lines.push(`STATUS=${meta.jobStatus}`);
lines.push(`PATCH=${meta.patch || '?'} VERSION=${meta.version || '?'}`);
lines.push(`WORKFLOW=${meta.workflow || '?'}`);
lines.push(`SHA=${meta.sha || '?'}`);
lines.push(`RUN=${meta.runUrl || meta.runId || '?'}`);
lines.push(`GENERATED=${meta.generatedAt}`);
lines.push('');
lines.push('## What failed (compressed)');
if (!compressed.length) {
  lines.push(meta.jobStatus === 'success' || meta.jobStatus === 'passed'
    ? 'No failure signatures extracted from logs.'
    : 'No failure signatures found in log text; inspect raw logs in the artifact ZIP.');
} else {
  compressed.forEach((c, i) => {
    lines.push(`### fail-${i + 1}`);
    lines.push(c);
    lines.push('');
  });
}
if (dualRec) {
  lines.push('## Architect dual-compare recommendation');
  lines.push(JSON.stringify(dualRec));
  lines.push('');
}
if (dualReport.trim()) {
  lines.push('## Dual-compare report (truncated)');
  lines.push(dualReport.trim().slice(0, 4_000));
  lines.push('');
}
if (patchEvidence.trim()) {
  lines.push('## PATCH_EVIDENCE (truncated)');
  lines.push(patchEvidence.trim().slice(0, 8_000));
  lines.push('');
}
lines.push('## Log files in artifact');
for (const f of summary.logFiles.slice(0, 30)) lines.push(`- ${f}`);
lines.push('');
lines.push('## Navigator instruction');
lines.push('If you cannot attach the ZIP, paste this entire ASSISTANT_PASTE.txt into the assistant chat.');
lines.push('Prefer this file over paraphrasing CI in your own words.');
lines.push('');

let paste = lines.join('\n');
if (paste.length > MAX_PASTE) {
  paste = paste.slice(0, MAX_PASTE) + '\n\n…[ASSISTANT_PASTE truncated to fit chat paste limit]\n';
}

fs.writeFileSync(path.join(dir, 'ASSISTANT_PASTE.txt'), paste, 'utf8');
fs.writeFileSync(path.join(dir, 'ASSISTANT_SUMMARY.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
console.log(`assistant-run-summary → ${path.relative(root, path.join(dir, 'ASSISTANT_PASTE.txt'))} (${paste.length} chars)`);

// Optional: collapse directory to outer ASSISTANT_PASTE.txt + biforge-ci-logs.zip (for workflows without package-ci-artifacts).
if (String(process.env.PACK_OUTER_ARTIFACT || '').toLowerCase() === 'true') {
  const names = fs.readdirSync(dir).filter((n) => n !== 'biforge-ci-logs.zip' && n !== 'ASSISTANT_PASTE.txt');
  if (names.length) {
    const packed = spawnSync('zip', ['-q', '-r', 'biforge-ci-logs.zip', ...names], { cwd: dir, encoding: 'utf8' });
    if (packed.status === 0) {
      for (const n of names) fs.rmSync(path.join(dir, n), { recursive: true, force: true });
    } else {
      console.warn('PACK_OUTER_ARTIFACT zip failed:', packed.stderr || packed.status);
    }
  }
  if (!fs.existsSync(path.join(dir, 'ASSISTANT_PASTE.txt'))) fs.writeFileSync(path.join(dir, 'ASSISTANT_PASTE.txt'), paste, 'utf8');
  console.log(`outer artifact files: ${fs.readdirSync(dir).sort().join(', ')}`);
}

