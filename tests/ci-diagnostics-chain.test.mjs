import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import JSZip from 'jszip';
import { buildCommit, installLogCapture, diagnosticArchive, verifyDiagnosticArchive, recordDiagnostic, REQUIRED_DIAGNOSTIC_ENTRIES } from '../server/projectDiagnostics.ts';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bf-chain-'));

test('diagnostic ZIP: real content, hashes match extracted bytes, skipped section explains gaps', async () => {
  await recordDiagnostic({ operationId: 'chain-op-1', event: 'CHAIN_TEST', stage: 'test', status: 'PASS', bytes: 7 });
  const buf = await diagnosticArchive('chain-op-2');
  assert.deepEqual(await verifyDiagnosticArchive(buf), []);
  const zip = await JSZip.loadAsync(buf, { checkCRC32: true });
  for (const n of REQUIRED_DIAGNOSTIC_ENTRIES) assert.ok(zip.file(n), n);
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  assert.equal(manifest.operationId, 'chain-op-2');
  for (const e of manifest.entries) {
    const bytes = await zip.file(e.path).async('nodebuffer');
    assert.equal(bytes.length, e.bytes); assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), e.sha256);
  }
  assert.ok(manifest.skipped.length > 0 && manifest.skipped.every((s) => s.item && s.reason));
  assert.ok(manifest.provenance && manifest.provenance.operations && manifest.provenance.applicationLogs, 'manifest carries explicit per-stream provenance');
  assert.equal(manifest.source, manifest.provenance.operations, 'legacy source stays aligned with operations provenance');
  assert.ok(zip.file('assistant/ASSISTANT-BRIEF.md'), 'assistant brief present');
  assert.ok(zip.file('assistant/assistant-context.json'), 'assistant context present');
  const brief = await zip.file('assistant/ASSISTANT-BRIEF.md').async('string');
  assert.match(brief, /ASSISTANT BRIEF/);
  assert.match(brief, /overall:/);
  const ctx = JSON.parse(await zip.file('assistant/assistant-context.json').async('string'));
  assert.equal(ctx.schemaVersion, 1);
  assert.ok(ctx.envFlags && typeof ctx.envFlags.hasDatabaseUrl === 'boolean');
  assert.ok(Array.isArray(ctx.nextActionHints) && ctx.nextActionHints.length > 0);
  const lines = (await zip.file('logs/application.jsonl').async('string')).trim().split('\n').map((l) => JSON.parse(l));
  assert.ok(lines.some((e) => e.operationId === 'chain-op-1' && e.event === 'CHAIN_TEST' && e.bytes === 7), 'recorded event reaches the exported log');
});

test('diagnostic ZIP verification rejects empty, truncated, tampered and incomplete archives', async () => {
  const good = await diagnosticArchive();
  assert.match((await verifyDiagnosticArchive(Buffer.alloc(0)))[0], /empty/);
  assert.match((await verifyDiagnosticArchive(good.subarray(0, Math.floor(good.length / 2))))[0], /unreadable/);
  const z = await JSZip.loadAsync(good); z.file('README.txt', 'tampered');
  const tampered = await z.generateAsync({ type: 'nodebuffer' });
  assert.ok((await verifyDiagnosticArchive(tampered)).some((p) => /hash mismatch README\.txt/.test(p)));
  const z2 = await JSZip.loadAsync(good); z2.remove('logs/application.jsonl');
  assert.ok((await verifyDiagnosticArchive(await z2.generateAsync({ type: 'nodebuffer' }))).some((p) => /missing entry logs\/application\.jsonl/.test(p)));
});

test('ci-summary publishes PATCH_EVIDENCE.md without writing the handoff to console', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'PATCH_EVIDENCE.md'), '# BiForge CI PATCH EVIDENCE\nPATCH_STATUS=FAILED\nNEXT_ACTION=fix only\n');
  const summaryPath = path.join(dir, 'github-summary.md');
  fs.writeFileSync(summaryPath, '');
  const r = spawnSync('node', [path.join(root, 'scripts/ci-summary.mjs')], {
    env: { ...process.env, CI_STATUS: 'failure', CI_LOGS_DIR: dir, GITHUB_STEP_SUMMARY: summaryPath },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  assert.equal(r.stderr, '');
  assert.equal(fs.readFileSync(summaryPath, 'utf8'), '', 'GitHub Actions summary must remain completely empty');
});

test('ci-summary creates a useful PATCH_EVIDENCE.md stub when the report is missing without console output', () => {
  const dir = tmp();
  const r = spawnSync('node', [path.join(root, 'scripts/ci-summary.mjs')], {
    env: { ...process.env, CI_STATUS: 'failure', CI_LOGS_DIR: dir },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  assert.match(fs.readFileSync(path.join(dir, 'PATCH_EVIDENCE.md'), 'utf8'), /PATCH_EVIDENCE\.md missing/);
});

test('diagnostic ZIP carries real captured console output, redacted', async () => {
  installLogCapture();
  process.env.GEMINI_API_KEY = 'AIzaSyFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE12';
  console.warn('chain-marker boot warning', process.env.GEMINI_API_KEY);
  const zip = await JSZip.loadAsync(await diagnosticArchive());
  const log = await zip.file('logs/server-console.log').async('string');
  assert.match(log, /\[warn\] chain-marker boot warning/);
  assert.ok(!log.includes('AIzaSyFAKE'), 'secret must be redacted');
  const summary = JSON.parse(await zip.file('diagnostics/diagnostic-summary.json').async('string'));
  assert.ok(summary.runtime.node && summary.runtime.appVersion !== 'unknown');
  assert.ok(summary.checks.some((c) => c.name === 'database-connectivity'));
});

test('build commit comes from the platform env (Render first), shortened to 7; unknown otherwise', () => {
  assert.equal(buildCommit({ RENDER_GIT_COMMIT: '3ab7083f00112233445566778899aabbccddeeff' }), '3ab7083');
  assert.equal(buildCommit({ RAILWAY_GIT_COMMIT_SHA: 'abcdef1234567' }), 'abcdef1');
  assert.equal(buildCommit({}), 'unknown');
});

