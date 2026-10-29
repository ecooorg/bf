/**
 * P118.5.6 — dom-wiring validator + bounded repair after check failure.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runBuild,
  runStaticValidators,
  validateDomWiring,
  formatFileMarker,
  SCHEMA_VERSION,
} from '../appBuilder/index.ts';

const HTML_OK = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><title>Lib</title></head>
<body>
  <input id="searchInput" />
  <form id="addBookForm"><input id="bookTitle" /><input id="bookAuthor" /><button type="submit">Add</button></form>
  <ul id="bookList"></ul>
  <script src="app.js"></script>
</body></html>`;

const JS_MISMATCH = `document.addEventListener('DOMContentLoaded', () => {
  const bookListEl = document.getElementById('book-list');
  const searchInput = document.getElementById('search-input');
  const addBookForm = document.getElementById('add-book-form');
  const titleInput = document.getElementById('title-input');
  if (!bookListEl) return;
  bookListEl.textContent = 'ok';
});`;

const JS_FIXED = `document.addEventListener('DOMContentLoaded', () => {
  const bookListEl = document.getElementById('bookList');
  const searchInput = document.getElementById('searchInput');
  const addBookForm = document.getElementById('addBookForm');
  const titleInput = document.getElementById('bookTitle');
  if (!bookListEl) return;
  bookListEl.textContent = 'ok';
});`;

const JS_SYNTAX_BROKEN = `document.addEventListener('DOMContentLoaded', () => {
  const bookListEl = document.getElementById('bookList'
  // missing paren — syntax error
});`;

const CSS = 'body { margin: 0; }';

const validSpec = {
  schemaVersion: 1,
  title: 'Neighborhood Library',
  goal: 'List and search books',
  language: 'en',
  stack: 'static_site',
  features: ['list', 'search'],
  nonGoals: ['backend'],
  acceptance: ['has_file:index.html', 'has_file:app.js'],
};

const validPlan = {
  schemaVersion: 1,
  specHash: 'x',
  units: [
    { id: 'u1', kind: 'file', path: 'index.html', purpose: 'page', dependsOn: [], exports: [], contract: 'html', maxOutputTokens: 1200, status: 'pending', attempts: 0 },
    { id: 'u2', kind: 'file', path: 'styles.css', purpose: 'css', dependsOn: [], exports: [], contract: 'css', maxOutputTokens: 800, status: 'pending', attempts: 0 },
    { id: 'u3', kind: 'file', path: 'app.js', purpose: 'logic', dependsOn: ['u1'], exports: [], contract: 'js', maxOutputTokens: 1200, status: 'pending', attempts: 0 },
  ],
  order: ['u1', 'u2', 'u3'],
};

function harness(coder) {
  const cache = new Map();
  const events = [];
  const calls = [];
  const model = {
    async complete(args) {
      calls.push(args);
      if (args.role === 'coder') return coder(args, calls.filter((c) => c.role === 'coder').length);
      if (args.prompt.includes('Create a Plan JSON')) return { text: JSON.stringify(validPlan), finishReason: 'stop', modelId: 'fake' };
      return { text: JSON.stringify(validSpec), finishReason: 'stop', modelId: 'fake' };
    },
  };
  const store = {
    async saveJob() {},
    async loadJob() { return null; },
    async listResumable() { return []; },
    async putUnitResult(r) { cache.set(r.cacheKey, r); },
    async getUnitResult(k) { return cache.get(k) ?? null; },
    async putArtifact() { return 'artifact'; },
  };
  const ports = {
    model,
    store,
    events: { emit(e) { events.push(e); } },
    clock: { now: (() => { let n = 1000; return () => n++; })(), async sleep() {} },
  };
  return { ports, calls, events, cache };
}

const reply = (text, finishReason = 'stop') => ({ text, finishReason, modelId: 'fake' });
const run = (h, jobId, options) =>
  runBuild({ schemaVersion: SCHEMA_VERSION, jobId, projectId: 'p', userId: 'u', taskText: 'library app' }, h.ports, options);
const coderCalls = (h) => h.calls.filter((c) => c.role === 'coder');

function contentFor(path, mode) {
  if (path === 'index.html') return HTML_OK;
  if (path === 'styles.css') return CSS;
  if (path === 'app.js') return mode === 'fixed' ? JS_FIXED : JS_MISMATCH;
  return '';
}

test('dom-wiring: flags live-style id mismatches', () => {
  const files = new Map([
    ['index.html', HTML_OK],
    ['app.js', JS_MISMATCH],
  ]);
  const r = validateDomWiring(files);
  assert.equal(r.ok, false);
  assert.ok(r.issues.length >= 3);
  assert.ok(r.issues.every((i) => i.path === 'app.js'));
  assert.ok(r.issues.some((i) => i.message.includes('book-list')));
});

test('dom-wiring: passes when ids match', () => {
  const files = new Map([
    ['index.html', HTML_OK],
    ['app.js', JS_FIXED],
  ]);
  const r = validateDomWiring(files);
  assert.equal(r.ok, true);
  assert.equal(r.issues.length, 0);
});

test('dom-wiring: ignores class selectors and dynamic expressions', () => {
  const js = `const el = document.querySelector('.book-card');
const id = 'x' + 'y';
document.getElementById(id);
document.querySelector('#bookList');`;
  const files = new Map([
    ['index.html', HTML_OK],
    ['app.js', js],
  ]);
  const r = validateDomWiring(files);
  assert.equal(r.ok, true, JSON.stringify(r.issues));
});

test('runStaticValidators includes dom-wiring as required', () => {
  const files = new Map([
    ['index.html', HTML_OK],
    ['styles.css', CSS],
    ['app.js', JS_MISMATCH],
  ]);
  const vs = runStaticValidators(files, validSpec);
  const names = vs.map((v) => v.name);
  assert.ok(names.includes('dom-wiring'));
  assert.equal(vs.find((v) => v.name === 'dom-wiring')?.ok, false);
});

test('P118.5.6: repair accepts fixed script and yields SUCCESS', async () => {
  let coderN = 0;
  const h = harness((args, n) => {
    coderN = n;
    const pathMatch = /path ([^\s.]+(?:\.[a-z]+)?)/i.exec(args.prompt) || /path[ =]([^\s>]+)/i.exec(args.prompt);
    // First three unit generations
    if (n <= 3) {
      const path = n === 1 ? 'index.html' : n === 2 ? 'styles.css' : 'app.js';
      return reply(formatFileMarker(path, contentFor(path, 'mismatch')));
    }
    // Repair call for app.js
    assert.ok(args.prompt.includes('searchInput') || args.prompt.includes('bookList'), 'repair prompt must list real HTML ids');
    assert.ok(args.prompt.includes('book-list') || args.prompt.includes('DOM id'), 'repair prompt must name the mismatch');
    return reply(formatFileMarker('app.js', JS_FIXED));
  });
  const result = await run(h, 'job-repair-ok');
  assert.equal(result.report.outcome, 'SUCCESS', JSON.stringify(result.report.validators?.find((v) => !v.ok)));
  assert.equal(result.report.goalImplemented, true);
  assert.ok(h.events.some((e) => e.type === 'dom_wiring_repair'));
  assert.ok(h.events.some((e) => e.type === 'dom_wiring_repair_accepted'));
  assert.ok(coderCalls(h).length >= 4, `expected repair call, got ${coderCalls(h).length}`);
});

test('P118.5.6: repair rejected when model returns syntax error (does not break js-syntax)', async () => {
  const h = harness((args, n) => {
    if (n <= 3) {
      const path = n === 1 ? 'index.html' : n === 2 ? 'styles.css' : 'app.js';
      return reply(formatFileMarker(path, contentFor(path, 'mismatch')));
    }
    return reply(formatFileMarker('app.js', JS_SYNTAX_BROKEN));
  });
  const result = await run(h, 'job-repair-syntax');
  assert.notEqual(result.report.outcome, 'SUCCESS');
  assert.ok(h.events.some((e) => e.type === 'dom_wiring_repair_rejected'));
  const rejected = h.events.filter((e) => e.type === 'dom_wiring_repair_rejected');
  assert.ok(rejected.some((e) => String(e.data?.reason || '').includes('broke_validators') || e.data?.reason === 'no_improvement' || e.data?.reason === 'truncated' || e.data?.reason === 'path_missing'));
  // Original mismatch still fails dom-wiring
  const dw = result.report.validators?.find((v) => v.name === 'dom-wiring');
  assert.equal(dw?.ok, false);
});

test('P118.5.6: no repair when budget exhausted', async () => {
  const h = harness((args, n) => {
    const path = n === 1 ? 'index.html' : n === 2 ? 'styles.css' : 'app.js';
    return reply(formatFileMarker(path, contentFor(path, 'mismatch')));
  });
  // spec + plan + 3 units = 5 calls; budget 5 leaves no room for repair
  const result = await run(h, 'job-budget', { maxCallsPerJob: 5 });
  assert.notEqual(result.report.outcome, 'SUCCESS');
  assert.ok(!h.events.some((e) => e.type === 'dom_wiring_repair'));
});

test('P118.5.6: correct wiring never triggers repair', async () => {
  const h = harness((args, n) => {
    const path = n === 1 ? 'index.html' : n === 2 ? 'styles.css' : 'app.js';
    return reply(formatFileMarker(path, contentFor(path, 'fixed')));
  });
  const result = await run(h, 'job-already-ok');
  assert.equal(result.report.outcome, 'SUCCESS');
  assert.ok(!h.events.some((e) => e.type === 'dom_wiring_repair'));
});
