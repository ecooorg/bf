import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { isExplicitSearchRequest, resolveOptionalSearch } from '../server/simpleDirectConversation.ts';

const root = path.resolve(new URL('..', import.meta.url).pathname);

test('explicit search request detection is narrow and language-aware', () => {
  assert.equal(isExplicitSearchRequest('Найди в интернете последние изменения закона'), true);
  assert.equal(isExplicitSearchRequest('Please search the web for the current release'), true);
  assert.equal(isExplicitSearchRequest('Explain how photosynthesis works'), false);
});

test('optional search success is passed through unchanged', async () => {
  const result = { status: 'used', digest: 'fresh evidence', sources: [{ title: 'A', url: 'https://example.org' }] };
  const resolved = await resolveOptionalSearch({ expected: true, timeoutMs: 100, run: async () => result });
  assert.deepEqual(resolved, { expected: true, timedOut: false, result });
});

test('optional search exception degrades to status and never rejects generation path', async () => {
  const resolved = await resolveOptionalSearch({ expected: true, timeoutMs: 100, run: async () => { throw new Error('Serper down'); } });
  assert.deepEqual(resolved, { expected: true, timedOut: false, result: { status: 'failed', reason: 'exception' } });
});

test('optional search timeout is non-fatal and late completion is ignored', async () => {
  const resolved = await resolveOptionalSearch({ expected: true, timeoutMs: 5, run: () => new Promise((resolve) => setTimeout(() => resolve({ status: 'used' }), 40)) });
  assert.equal(resolved.timedOut, true);
  assert.deepEqual(resolved.result, { status: 'failed', reason: 'timeout' });
});

test('Simple route injects search evidence/status but retains direct single-generation path', () => {
  const source = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');
  const start = source.indexOf("if (req.body?.productMode !== 'Expert' && !distressMarkerDetected)");
  const end = source.indexOf('// PI-02: intent flags', start);
  const branch = source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(branch, /runConversationWebSearch\(/);
  assert.match(branch, /formatSearchBlock\(/);
  assert.match(branch, /formatSearchStatusBlock\(/);
  assert.match(branch, /generationContinues: true/);
  assert.match(branch, /handleSimpleDirectConversation\(/);
  assert.doesNotMatch(branch, /buildSearchDecision\(|informationSoftFail\(|runEpistemicVerifier\(/);
  assert.match(branch, /promptOverride:/);
});

test('production server build copies source policy into the compiled runtime tree', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-p1262-'));
  try {
    fs.mkdirSync(path.join(temp, 'config'), { recursive: true });
    fs.mkdirSync(path.join(temp, 'dist-server'), { recursive: true });
    const policy = fs.readFileSync(path.join(root, 'config', 'source-policy.json'));
    fs.writeFileSync(path.join(temp, 'config', 'source-policy.json'), policy);
    const run = spawnSync(process.execPath, [path.join(root, 'scripts', 'copy-server-config.mjs')], { cwd: temp, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.deepEqual(fs.readFileSync(path.join(temp, 'dist-server', 'config', 'source-policy.json')), policy);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
