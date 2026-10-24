import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import JSZip from 'jszip';
import { runAppBuilderPipeline } from '../server/appBuilderPipeline.ts';
const ir = { version: 1, name: 'tetris', goal: 'Create a browser Tetris game with sounds', kind: 'utility', stack: 'static_site', needsAuth: 'no', needsDb: 'no', language: 'en', constraints: '', features: [] };
const TETRIS = '<!doctype html><title>Tetris</title><canvas id="c"></canvas><script src="app.js"></script>';

test('goal alone (no features/constraints, as the wizard sends it) now reaches the model slice and its files land in the ZIP', async () => {
  let called = 0;
  const r = await runAppBuilderPipeline({ ir, sliceGenerate: async () => { called++; return { files: { 'index.html': TETRIS, 'app.js': '// tetris game loop\nconst board=[];' }, notes: 'tetris written' }; } });
  assert.equal(called, 1); assert.equal(r.slice.status, 'applied');
  const zip = await JSZip.loadAsync(r.zipBuffer, { checkCRC32: true });
  assert.equal(await zip.file('index.html').async('string'), TETRIS);
  assert.match(await zip.file('app.js').async('string'), /tetris game loop/);
});

test('scaffold-only results are labelled skipped/failed with a reason, never applied', async () => {
  const off = await runAppBuilderPipeline({ ir, allowSlice: false });
  assert.equal(off.slice.status, 'skipped'); assert.ok(off.slice.reason);
  const noFiles = await runAppBuilderPipeline({ ir, sliceGenerate: async () => ({ notes: 'no model' }) });
  assert.equal(noFiles.slice.status, 'skipped'); assert.equal(noFiles.slice.reason, 'no model');
  const bad = await runAppBuilderPipeline({ ir, sliceGenerate: async () => ({ files: { '../evil.js': 'x' } }) });
  assert.equal(bad.slice.status, 'skipped');
  const boom = await runAppBuilderPipeline({ ir, sliceGenerate: async () => { throw new Error('quota exceeded'); } });
  assert.equal(boom.slice.status, 'failed'); assert.match(boom.slice.reason, /quota exceeded/);
  assert.ok(boom.zipBuffer.length > 22, 'scaffold ZIP is still produced');
});

test('build route reports goalImplemented and an explicit WARNING when the goal was not built; client downloads via fetch', () => {
  const route = fs.readFileSync(new URL('../server/projectRoutes.ts', import.meta.url), 'utf8');
  assert.match(route, /goalImplemented,\n\s+sliceStatus: result\.slice\.status/); assert.match(route, /WARNING: this ZIP is only a generic starter/);
  const dl = fs.readFileSync(new URL('../src/downloadFile.ts', import.meta.url), 'utf8');
  assert.match(dl, /response\.ok/); assert.match(dl, /blob\.size/);
  for (const f of ['../src/ProjectNoviceWizard.tsx', '../src/ProjectMode.tsx']) assert.match(fs.readFileSync(new URL(f, import.meta.url), 'utf8'), /downloadViaFetch/);
  const pm = fs.readFileSync(new URL('../src/ProjectMode.tsx', import.meta.url), 'utf8');
  assert.match(pm, /isBinaryName\(a\.filename\)\) \{\n\s+const r = await fetch/, 'binary artifacts go to Drive as blobs, not as text');
});
