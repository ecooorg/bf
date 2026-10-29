/**
 * P118.5.2 — E2E archive delivery proof (fake model, no live providers, no DB).
 *
 * Proves: runBuild SUCCESS → non-empty ZIP → expected static_site paths → openable content
 * and that SUCCESS without a verified download is classified as FALSE_SUCCESS (delivery canon).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { runBuild, SCHEMA_VERSION, formatFileMarker } from '../appBuilder/index.ts';
import { classifyBuild, zipVerified, inspectZipEntries, overallVerdict } from '../scripts/p118-architect-live-lib.mjs';
import { publicJob } from '../server/appBuilderAdapter.ts';

const REQUIRED = ['index.html', 'style.css', 'app.js', 'README.md'];

function multiFileHarness() {
  const cache = new Map();
  const events = [];
  const model = {
    async complete(args) {
      if (args.prompt.includes('Create a concise project specification')) {
        return {
          text: JSON.stringify({
            schemaVersion: 1,
            title: 'Demo',
            goal: 'Demo static site',
            language: 'en',
            stack: 'static_site',
            features: [],
            nonGoals: [],
            acceptance: ['has_file:index.html', 'has_file:style.css', 'has_file:app.js'],
          }),
          finishReason: 'stop',
          modelId: 'fake-v1',
        };
      }
      if (args.prompt.includes('Create a Plan JSON')) {
        const units = [
          { id: 'style', kind: 'file', path: 'style.css', purpose: 'styles', dependsOn: [], exports: [], contract: 'css', maxOutputTokens: 800, status: 'pending', attempts: 0 },
          { id: 'app', kind: 'file', path: 'app.js', purpose: 'behaviour', dependsOn: [], exports: [], contract: 'js', maxOutputTokens: 800, status: 'pending', attempts: 0 },
          { id: 'index', kind: 'file', path: 'index.html', purpose: 'entry', dependsOn: ['style', 'app'], exports: [], contract: 'html', maxOutputTokens: 800, status: 'pending', attempts: 0 },
          { id: 'readme', kind: 'file', path: 'README.md', purpose: 'notes', dependsOn: ['index'], exports: [], contract: 'md', maxOutputTokens: 400, status: 'pending', attempts: 0 },
        ];
        return {
          text: JSON.stringify({ schemaVersion: 1, specHash: 'abc', units, order: units.map((u) => u.id) }),
          finishReason: 'stop',
          modelId: 'fake-v1',
        };
      }
      // Coder: unit context embeds path= and "Implement unit"
      const bodies = {
        'index.html': '<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><h1>Demo</h1><script src="app.js"></script></body></html>',
        'style.css': 'body { font-family: system-ui; margin: 2rem; }',
        'app.js': 'console.log("demo");',
        'README.md': '# Demo\n\nOpen index.html in a browser.\n',
      };
      for (const path of REQUIRED) {
        const hit =
          args.prompt.includes(`"path":"${path}"`) ||
          args.prompt.includes(`path ${path}`) ||
          args.prompt.includes(`<<<FILE ${path}>>>`) ||
          args.prompt.includes(`for path ${path}`);
        if (hit) return { text: formatFileMarker(path, bodies[path]), finishReason: 'stop', modelId: 'fake-v1' };
      }
      // Fallback: last path mentioned in REQUIRED order
      return { text: formatFileMarker('index.html', bodies['index.html']), finishReason: 'stop', modelId: 'fake-v1' };
    },
  };
  const store = {
    async saveJob() {},
    async loadJob() { return null; },
    async listResumable() { return []; },
    async putUnitResult(r) { cache.set(r.cacheKey, r); },
    async getUnitResult(k) { return cache.get(k) ?? null; },
    async putArtifact() { return 'artifact-e2e'; },
  };
  const ports = {
    model,
    store,
    events: { emit(e) { events.push(e); } },
    clock: { now: (() => { let n = 1000; return () => n++; })(), async sleep() {} },
  };
  return { ports, events, cache };
}

test('P118.5.2 E2E: SUCCESS pack produces openable ZIP with required static_site files', async () => {
  const h = multiFileHarness();
  const result = await runBuild(
    { schemaVersion: SCHEMA_VERSION, jobId: 'job-e2e', projectId: 'p', userId: 'u', taskText: 'make a demo static site' },
    h.ports,
  );
  assert.equal(result.report.outcome, 'SUCCESS', result.report.failureReason || 'expected SUCCESS');
  assert.equal(result.report.goalImplemented, true);
  assert.ok(result.archive instanceof Uint8Array);
  assert.ok(result.archive.byteLength > 100, 'archive must be non-trivial');

  const zip = await JSZip.loadAsync(result.archive);
  for (const path of REQUIRED) {
    const file = zip.file(path);
    assert.ok(file, `missing ${path} in ZIP`);
    const text = await file.async('string');
    assert.ok(text.trim().length > 0, `${path} must be non-empty`);
  }
  assert.ok(zip.file('build-report.json'), 'build-report.json required');
  const report = JSON.parse(await zip.file('build-report.json').async('string'));
  assert.equal(report.outcome, 'SUCCESS');
});

test('P118.5.2 delivery contract: SUCCESS + artifactId yields downloadUrl; classifyBuild PASS only with verified ZIP', async () => {
  const h = multiFileHarness();
  const result = await runBuild(
    { schemaVersion: SCHEMA_VERSION, jobId: 'job-del', projectId: 'proj-1', userId: 'u', taskText: 'demo' },
    h.ports,
  );
  assert.equal(result.report.outcome, 'SUCCESS');

  const jobState = {
    schemaVersion: SCHEMA_VERSION,
    id: 'job-del',
    projectId: 'proj-1',
    userId: 'u',
    status: 'done',
    stage: 'done',
    spec: result.state.spec,
    plan: result.state.plan,
    callsUsed: result.state.callsUsed,
    callsBudget: result.state.callsBudget,
    error: null,
    report: result.report,
    artifactId: 'art-delivery-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    heartbeatAt: new Date().toISOString(),
  };
  const pub = publicJob(jobState, 'proj-1');
  assert.match(String(pub.downloadUrl), /\/artifacts\/art-delivery-1\/download/);

  // Simulate HTTP download of archive bytes
  const download = {
    status: 200,
    contentType: 'application/zip',
    bytes: result.archive.byteLength,
    lengthMatches: true,
    zip: null,
    zipError: null,
  };
  const zip = await JSZip.loadAsync(result.archive);
  const entries = Object.values(zip.files).map((f) => ({ name: f.name, dir: f.dir, size: f.dir ? 0 : 1 }));
  // fill sizes from content
  for (const e of entries) {
    if (!e.dir) {
      const t = await zip.file(e.name).async('uint8array');
      e.size = t.byteLength;
    }
  }
  download.zip = inspectZipEntries(entries);
  assert.equal(download.zip.ok, true, download.zip.reasons?.join(','));

  const build = classifyBuild({
    buildHttp: 202,
    buildBody: { success: true, data: pub },
    job: pub,
    timedOut: false,
    download,
  });
  assert.equal(build.verdict, 'PASS', build.reasons.join(','));
  assert.equal(overallVerdict({ build, controls: [{ verdict: 'TRUTHFUL_FAIL' }] }).deliveryProven, true);
});

test('P118.5.2 FALSE_SUCCESS when outcome SUCCESS but ZIP not verified', () => {
  const build = classifyBuild({
    buildHttp: 202,
    buildBody: {
      success: true,
      data: {
        status: 'done',
        outcome: 'SUCCESS',
        goalImplemented: true,
        downloadUrl: '/api/projects/p/artifacts/x/download',
      },
    },
    job: {
      status: 'done',
      outcome: 'SUCCESS',
      goalImplemented: true,
      downloadUrl: '/api/projects/p/artifacts/x/download',
    },
    timedOut: false,
    download: { status: 200, contentType: 'application/zip', bytes: 0, zip: { ok: false, reasons: ['no_files'] } },
  });
  assert.equal(build.verdict, 'FALSE_SUCCESS');
  assert.ok(build.reasons.some((r) => r.includes('zip')));
});

test('P118.5.2 FALSE_SUCCESS when SUCCESS without downloadUrl', () => {
  const build = classifyBuild({
    buildHttp: 201,
    buildBody: { success: true, data: { status: 'done', outcome: 'SUCCESS', goalImplemented: true } },
    job: { status: 'done', outcome: 'SUCCESS', goalImplemented: true },
    timedOut: false,
    download: null,
  });
  assert.equal(build.verdict, 'FALSE_SUCCESS');
  assert.ok(build.reasons.includes('success_without_download'));
});

test('P118.5.2 zipVerified requires 200, zip type, bytes, and inspect ok', () => {
  assert.equal(zipVerified(null), false);
  assert.equal(zipVerified({ status: 200, contentType: 'application/zip', bytes: 10, zip: { ok: true } }), true);
  assert.equal(zipVerified({ status: 200, contentType: 'application/json', bytes: 10, zip: { ok: true } }), false);
  assert.equal(zipVerified({ status: 500, contentType: 'application/zip', bytes: 10, zip: { ok: true } }), false);
});
