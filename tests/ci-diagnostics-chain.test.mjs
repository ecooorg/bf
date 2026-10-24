import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import JSZip from 'jszip';
import { releaseLabel, buildCommit, installLogCapture, diagnosticArchive, verifyDiagnosticArchive, recordDiagnostic, REQUIRED_DIAGNOSTIC_ENTRIES } from '../server/projectDiagnostics.ts';
import { inspectLogs, renderStageTable } from '../scripts/ci-summary.mjs';
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

test('ci-summary: reports failed stages and states why logs are missing', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'ci-install.log'), 'added 1 package\n');
  fs.writeFileSync(path.join(dir, 'ci-check.log'), 'not ok 1 - broken thing\n');
  fs.writeFileSync(path.join(dir, 'ci-live.log'), '');
  fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ results: [{ id: 'test:core', status: 'FAIL', exitCode: 1, log: 'artifacts/ci-checks/test_core.log' }, { id: 'lint', status: 'PASS', log: 'x' }] }));
  const info = inspectLogs(dir);
  assert.deepEqual(info.present.map((p) => p.file).sort(), ['ci-check.log', 'ci-install.log']);
  assert.match(info.missing.find((m) => m.file === 'ci-build.log').reason, /did not run/);
  assert.match(info.missing.find((m) => m.file === 'ci-live.log').reason, /empty/);
  const table = renderStageTable(info);
  assert.match(table, /FAIL test:core \(exit 1\)/); assert.match(table, /missing ci-build\.log/);
  const r = spawnSync('node', [path.join(root, 'scripts/ci-summary.mjs')], { env: { ...process.env, CI_STATUS: 'failure', CI_LOGS_DIR: dir }, encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /::error title=BiForge CI::CI: red\. First failed: broken thing/);
  assert.match(r.stdout, /FAIL test:core/);
  const none = inspectLogs(path.join(dir, 'nope'));
  assert.match(none.stagesError, /results\.json missing/); assert.equal(none.missing.length, 6);
});

test('CI workflow: every log is written into the uploaded directory, upload runs always and fails when empty', () => {
  const ci = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  const runner = fs.readFileSync(path.join(root, 'scripts/run-independent-checks.mjs'), 'utf8');
  assert.match(runner, /path\.join\(root, 'artifacts', 'ci-checks'\)/);
  const upload = ci.slice(ci.indexOf('actions/upload-artifact'));
  assert.match(upload, /path: artifacts\/ci-checks\//); assert.match(upload, /if-no-files-found: error/);
  assert.match(ci.slice(0, ci.indexOf('actions/upload-artifact')).split('\n').slice(-3).join('\n'), /if: always\(\)/);
  for (const log of ['install', 'migrate', 'check', 'live', 'api', 'build']) assert.match(ci, new RegExp(`set -o pipefail; [^\\n]*\\| tee artifacts/ci-checks/ci-${log}\\.log`), log);
  assert.ok(!/\|\| true/.test(ci));
  const steps = [...ci.matchAll(/timeout-minutes: (\d+)/g)].map((m) => Number(m[1]));
  assert.ok(steps[0] > steps.slice(1).reduce((a, b) => a + b, 0), 'job timeout must exceed the sum of step timeouts so that always() steps can run');
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

test('release label is the first CHANGELOG heading and check-version enforces it', () => {
  const dir = tmp(); const f = path.join(dir, 'CHANGELOG.md');
  fs.writeFileSync(f, '# Log\n\n## P92.7 — newest\n\n## P92.6 — older\n');
  assert.equal(releaseLabel(f), 'P92.7'); assert.equal(releaseLabel(path.join(dir, 'none.md')), null);
  assert.match(releaseLabel(path.join(root, 'CHANGELOG.md')) ?? '', /^P92(\.\d+)*$/);
  const run = (cwd) => spawnSync('node', [path.join(root, 'scripts/check-version.mjs')], { cwd, encoding: 'utf8' });
  assert.equal(run(root).status, 0);
  fs.cpSync(path.join(root, 'src/config.ts'), path.join(dir, 'src/config.ts'), { recursive: true });
  fs.copyFileSync(path.join(root, 'package.json'), path.join(dir, 'package.json')); fs.copyFileSync(path.join(root, 'server.ts'), path.join(dir, 'server.ts'));
  fs.writeFileSync(f, '## P91.9 — stale top entry\n');
  const bad = run(dir); assert.equal(bad.status, 1); assert.match(bad.stderr, /does not match APP_VERSION 92/);
});
