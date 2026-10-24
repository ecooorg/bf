/**
 * P93.1 — Plan contracts, marker parsing, architecture boundary for appBuilder.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCHEMA_VERSION,
  validatePlan,
  parseFileMarkers,
  formatFileMarker,
  conservativeProfile,
  isSafePath,
  topoSort,
} from '../appBuilder/index.ts';
import { layerOf } from '../scripts/architectureLib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function unit(id, deps = [], pathName) {
  return {
    id,
    kind: pathName ? 'file' : 'check',
    path: pathName,
    purpose: id,
    dependsOn: deps,
    exports: [],
    contract: '',
    maxOutputTokens: 1024,
    status: 'pending',
    attempts: 0,
  };
}

// --- 1. Plan contracts ---

test('validatePlan rejects unknown schemaVersion', () => {
  const r = validatePlan({ schemaVersion: 99, units: [unit('a')], order: ['a'] });
  assert.equal(r.ok, false);
  assert.ok(r.issues.some((i) => i.code === 'schema_version'));
});

test('validatePlan rejects cycle', () => {
  const plan = {
    schemaVersion: SCHEMA_VERSION,
    specHash: 'x',
    units: [unit('a', ['b'], 'a.js'), unit('b', ['a'], 'b.js')],
    order: ['a', 'b'],
  };
  const r = validatePlan(plan);
  assert.equal(r.ok, false);
  assert.ok(r.issues.some((i) => i.code === 'cycle'));
});

test('validatePlan rejects missing dependency', () => {
  const plan = {
    schemaVersion: SCHEMA_VERSION,
    specHash: 'x',
    units: [unit('a', ['missing'], 'a.js')],
    order: ['a'],
  };
  const r = validatePlan(plan);
  assert.equal(r.ok, false);
  assert.ok(r.issues.some((i) => i.code === 'missing_dep'));
});

test('validatePlan rejects unsafe path with ..', () => {
  const plan = {
    schemaVersion: SCHEMA_VERSION,
    specHash: 'x',
    units: [unit('a', [], '../secret.js')],
    order: ['a'],
  };
  const r = validatePlan(plan);
  assert.equal(r.ok, false);
  assert.ok(r.issues.some((i) => i.code === 'unsafe_path'));
});

test('validatePlan accepts linear file plan', () => {
  const plan = {
    schemaVersion: SCHEMA_VERSION,
    specHash: 'x',
    units: [
      unit('html', [], 'index.html'),
      unit('css', ['html'], 'style.css'),
      unit('js', ['html'], 'app.js'),
    ],
    order: ['html', 'css', 'js'],
  };
  const r = validatePlan(plan, conservativeProfile());
  assert.equal(r.ok, true, JSON.stringify(r.issues));
  assert.deepEqual(r.order, ['html', 'css', 'js']);
});

test('isSafePath and topoSort basics', () => {
  assert.equal(isSafePath('index.html'), true);
  assert.equal(isSafePath('../x'), false);
  assert.equal(isSafePath('/abs'), false);
  assert.equal(isSafePath('a/b.js'), true);
  assert.equal(isSafePath('a/b/c.js'), false);
  const order = topoSort([unit('b', ['a']), unit('a', [])]);
  assert.deepEqual(order, ['a', 'b']);
});

// --- 2. Marker parsing ---

test('parseFileMarkers: normal single file', () => {
  const text = formatFileMarker('app.js', 'console.log(1);');
  const r = parseFileMarkers(text);
  assert.equal(r.truncated, false);
  assert.equal(r.files.length, 1);
  assert.equal(r.files[0].path, 'app.js');
  assert.equal(r.files[0].content, 'console.log(1);');
});

test('parseFileMarkers: truncated without END', () => {
  const text = '<<<FILE app.js>>>\nconsole.log(1);';
  const r = parseFileMarkers(text);
  assert.equal(r.truncated, true);
  assert.ok(r.issues.some((i) => i.startsWith('missing_end')));
});

test('parseFileMarkers: two files in one response', () => {
  const text =
    formatFileMarker('a.js', 'a') + '\n' + formatFileMarker('b.js', 'b');
  const r = parseFileMarkers(text);
  assert.equal(r.truncated, false);
  assert.equal(r.files.length, 2);
  assert.deepEqual(
    r.files.map((f) => f.path),
    ['a.js', 'b.js'],
  );
});

test('parseFileMarkers: garbage before/after ignored', () => {
  const text = 'noise\n' + formatFileMarker('ok.js', 'x') + '\nmore noise';
  const r = parseFileMarkers(text);
  assert.equal(r.files.length, 1);
  assert.equal(r.files[0].path, 'ok.js');
});

test('parseFileMarkers: unsafe path rejected', () => {
  const text = '<<<FILE ../evil.js>>>\nx\n<<<END>>>';
  const r = parseFileMarkers(text);
  assert.equal(r.files.length, 0);
  assert.ok(r.issues.some((i) => i.startsWith('unsafe_path')));
});

// --- 10. Architecture boundaries ---

test('layerOf maps appBuilder/* to appBuilder', () => {
  assert.equal(layerOf('appBuilder/core-types.ts'), 'appBuilder');
  assert.equal(layerOf('appBuilder/index.ts'), 'appBuilder');
});

test('appBuilder sources do not import server/ or src/', () => {
  const dir = path.join(root, 'appBuilder');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts'));
  assert.ok(files.length >= 5, 'expected core appBuilder files');
  const bad = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    if (/from\s+['"]\.\.\/server\//.test(text) || /from\s+['"]\.\.\/src\//.test(text)) {
      bad.push(f);
    }
    if (/from\s+['"]server\//.test(text) || /from\s+['"]src\//.test(text)) {
      bad.push(f);
    }
  }
  assert.deepEqual(bad, [], `forbidden imports in: ${bad.join(', ')}`);
});

test('architecture-boundary-rules allow server/test/script → appBuilder and deny reverse', () => {
  const rules = JSON.parse(
    fs.readFileSync(path.join(root, 'docs/architecture-boundary-rules.json'), 'utf8'),
  );
  const edges = new Set(rules.allowedEdges.map((e) => `${e.from}->${e.to}`));
  assert.ok(edges.has('server->appBuilder'));
  assert.ok(edges.has('test->appBuilder'));
  assert.ok(edges.has('script->appBuilder'));
  assert.ok(edges.has('appBuilder->appBuilder'));
  assert.ok(!edges.has('appBuilder->server'));
  assert.ok(!edges.has('appBuilder->src'));
});
