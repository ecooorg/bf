/**
 * P121.0.46 — model repair integrity.
 *
 * Observed (Legacy Architect build 63e74598, Expense Tracker): a js-syntax repair call returned a 464-byte
 * placeholder for a 26,540-character app.js, was accepted because the syntax error count dropped, and the
 * build was reported SUCCESS. Root cause: the repair prompts did not contain the broken file, and acceptance
 * only compared validator issue counts. These tests pin the current contract:
 *   - model repair prompts carry the current source of the file being repaired;
 *   - a repair that discards most of the file is rejected and the original is kept;
 *   - a faithful small repair is still accepted.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { runBuild, formatFileMarker, SCHEMA_VERSION } from '../appBuilder/index.ts';

const HTML = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><title>Ledger</title></head>
<body>
  <form id="entryForm"><input id="entryAmount" /><button type="submit">Add</button></form>
  <ul id="entryList"></ul>
  <script src="app.js"></script>
</body></html>`;

const CSS = 'body { margin: 0; }';

const MARKER = 'LEDGER_UNIQUE_SOURCE_MARKER';

// ~1 KB script with exactly one syntax error (unbalanced parenthesis) that the deterministic pass cannot fix.
const body = (broken) => `// ${MARKER}
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('entryForm');
  const amount = document.getElementById('entryAmount');
  const list = document.getElementById('entryList');
  const entries = [];
  function render() {
    list.textContent = '';
    for (const e of entries) {
      const li = document.createElement('li');
      li.textContent = e.amount.toFixed(2);
      list.appendChild(li);
    }
  }
  function parseAmount(text) {
    const value = Number(String(text).replace(',', '.'));
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = parseAmount(amount.value);
    if (value === null) { amount.setAttribute('aria-invalid', 'true'); return; }
    amount.removeAttribute('aria-invalid');
    entries.push({ amount: value, at: Date.now() });
    amount.value = '';
    render();
  });
  render();
${broken ? '  const total = entries.reduce((s, e) => s + e.amount, 0;' : '  const total = entries.reduce((s, e) => s + e.amount, 0);'}
  void total;
});
`;

const JS_BROKEN = body(true);
const JS_FIXED = body(false);
const JS_STUB = `// Application logic with fixed syntax errors
const app = { name: 'SyntaxErrorFixerApp', init() { console.log('ok'); } };
app.init();
`;

const spec = {
  schemaVersion: 1,
  title: 'Ledger',
  goal: 'Track entries',
  language: 'en',
  stack: 'static_site',
  features: ['add'],
  nonGoals: ['backend'],
  acceptance: ['has_file:index.html', 'has_file:app.js'],
};
const plan = {
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
      if (args.prompt.includes('Create a Plan JSON')) return { text: JSON.stringify(plan), finishReason: 'stop', modelId: 'fake' };
      return { text: JSON.stringify(spec), finishReason: 'stop', modelId: 'fake' };
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
  return { ports, calls, events };
}

const reply = (text) => ({ text, finishReason: 'stop', modelId: 'fake' });
const run = (h, jobId) =>
  runBuild({ schemaVersion: SCHEMA_VERSION, jobId, projectId: 'p', userId: 'u', taskText: 'ledger app' }, h.ports);

/** First three coder calls build the units; later calls are repairs and go to `onRepair`. */
function units(js, onRepair) {
  return (args, n) => {
    if (n === 1) return reply(formatFileMarker('index.html', HTML));
    if (n === 2) return reply(formatFileMarker('styles.css', CSS));
    if (n === 3) return reply(formatFileMarker('app.js', js));
    return onRepair(args, n);
  };
}

test('js-syntax model repair prompt carries the current source of the broken file', async () => {
  let seen = '';
  const h = harness(units(JS_BROKEN, (args) => { seen = args.prompt; return reply(formatFileMarker('app.js', JS_FIXED)); }));
  await run(h, 'job-js-prompt');
  assert.ok(seen.includes(MARKER), 'repair prompt must include the file being repaired, not only the error text');
  assert.ok(seen.includes('entries.reduce((s, e) => s + e.amount, 0;'), 'repair prompt must include the faulty line');
});

test('js-syntax repair that discards the file is rejected and the original script is kept', async () => {
  const h = harness(units(JS_BROKEN, () => reply(formatFileMarker('app.js', JS_STUB))));
  const result = await run(h, 'job-js-stub');
  assert.notEqual(result.report.outcome, 'SUCCESS', 'a placeholder must not turn a broken build into SUCCESS');
  assert.equal(result.report.goalImplemented, false);
  const rejected = h.events.find((e) => e.type === 'js_syntax_repair_rejected');
  assert.ok(rejected, 'rejection must be an observable event');
  assert.equal(rejected.data?.reason, 'destructive_shrink');
  assert.equal(h.events.some((e) => e.type === 'js_syntax_repair_accepted'), false);
  const app = result.report.files.find((f) => f.path === 'app.js');
  assert.equal(app?.bytes, new TextEncoder().encode(JS_BROKEN).byteLength, 'original app.js bytes must be preserved');
  assert.equal(result.report.validators.find((v) => v.name === 'js-syntax')?.ok, false, 'the real defect stays visible');
});

test('js-syntax faithful small repair is still accepted and yields SUCCESS', async () => {
  const h = harness(units(JS_BROKEN, () => reply(formatFileMarker('app.js', JS_FIXED))));
  const result = await run(h, 'job-js-ok');
  assert.equal(result.report.outcome, 'SUCCESS', JSON.stringify(result.report.validators.filter((v) => !v.ok)));
  assert.ok(h.events.some((e) => e.type === 'js_syntax_repair_accepted'));
  assert.equal(h.events.some((e) => e.type === 'js_syntax_repair_rejected'), false);
});

// dom-wiring: script references ids that do not exist in the HTML.
const JS_ID_MISMATCH = JS_FIXED
  .replace("getElementById('entryForm')", "getElementById('entry-form')")
  .replace("getElementById('entryAmount')", "getElementById('entry-amount')");

test('dom-wiring model repair prompt carries the current source of the script', async () => {
  let seen = '';
  const h = harness(units(JS_ID_MISMATCH, (args) => { seen = args.prompt; return reply(formatFileMarker('app.js', JS_FIXED)); }));
  const result = await run(h, 'job-dom-prompt');
  assert.ok(seen.includes(MARKER), 'dom-wiring repair prompt must include the script being repaired');
  assert.equal(result.report.outcome, 'SUCCESS', JSON.stringify(result.report.validators.filter((v) => !v.ok)));
});

test('dom-wiring repair that discards the script is rejected and the original is kept', async () => {
  const STUB = `// stub\nconsole.log('placeholder');\n`;
  const h = harness(units(JS_ID_MISMATCH, () => reply(formatFileMarker('app.js', STUB))));
  const result = await run(h, 'job-dom-stub');
  assert.notEqual(result.report.outcome, 'SUCCESS');
  const rejected = h.events.find((e) => e.type === 'dom_wiring_repair_rejected');
  assert.ok(rejected);
  assert.equal(rejected.data?.reason, 'destructive_shrink');
  const app = result.report.files.find((f) => f.path === 'app.js');
  assert.equal(app?.bytes, new TextEncoder().encode(JS_ID_MISMATCH).byteLength);
  assert.equal(result.report.validators.find((v) => v.name === 'dom-wiring')?.ok, false);
});
