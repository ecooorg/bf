import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import JSZip from 'jszip';
import { buildStandaloneIndex, continuationPathMap } from '../appBuilder/standalone.ts';
import { validateCompleteness } from '../appBuilder/validator-static-site.ts';
import { runBuild, formatFileMarker, SCHEMA_VERSION } from '../appBuilder/index.ts';

// One flat JSON file (path -> content): a real generated chess package; no nested folders (repo rule).
const fixtureFiles = JSON.parse(fs.readFileSync('tests/fixture-standalone-chess.json', 'utf8'));
const loadFixture = () => new Map(Object.entries(fixtureFiles));

/** Tiny DOM so the bundled script can really execute in node:vm. */
function runInlineScripts(html, extraGlobals = {}) {
  const log = [];
  const sandbox = { console: { log: (...a) => log.push(a.join(' ')), error: (...a) => log.push('ERR ' + a.join(' ')) }, ...extraGlobals };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="module")[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const s of scripts) vm.runInNewContext(s, sandbox);
  return { log, sandbox };
}

test('P127.30 a real generated multi-module package becomes one index.html with no local src/href left', () => {
  const r = buildStandaloneIndex(loadFixture());
  assert.equal(r.mode, 'classic');
  assert.equal(r.changed, true);
  assert.equal(r.modules, 10);
  assert.deepEqual(r.warnings, []);
  assert.ok(!/<script[^>]*\bsrc="(?!https?:)/i.test(r.html), 'no local external script');
  assert.ok(!/<link[^>]*stylesheet[^>]*href="(?!https?:)/i.test(r.html), 'no local stylesheet link');
  assert.ok(r.html.includes('<style data-source="style.css">'));
  assert.ok(!/<script[^>]*type="module"/i.test(r.html), 'file:// cannot load external module scripts; the bundle is classic');
});

test('P127.30 the bundled modules really execute: exports, default exports, re-exports and import order', () => {
  const files = new Map([
    ['index.html', '<!doctype html><html><head><link rel="stylesheet" href="s.css"></head><body><div id="out"></div><script type="module" src="main.js"></script></body></html>'],
    ['s.css', 'body{margin:0}'],
    ['util.js', 'export const base = 40;\nexport function add(a, b) { return a + b; }\nexport default class Counter { constructor() { this.n = 0; } inc() { this.n++; return this; } }\n'],
    ['reexp.js', "export * from './util.js';\nexport { add as plus } from './util.js';\n"],
    ['main.js', "import Counter, { base } from './util.js';\nimport { plus } from './reexp';\nconst c = new Counter().inc().inc();\nglobalThis.__result = [base, plus(1, 2), c.n].join(',');\n"],
  ]);
  const r = buildStandaloneIndex(files);
  assert.equal(r.mode, 'classic');
  assert.deepEqual(r.warnings, []);
  const { sandbox } = runInlineScripts(r.html);
  assert.equal(sandbox.__result, '40,3,2');
});

test('P127.30 bare imports (import map / CDN) stay real ES imports of ONE inline module script', () => {
  const files = new Map([
    ['index.html', '<html><body><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"}}</script><script type="module" src="main.js"></script></body></html>'],
    ['main.js', "import * as THREE from 'three';\nimport { go } from './g.js';\ngo(THREE);\n"],
    ['g.js', 'export function go(T) { return T; }\n'],
  ]);
  const r = buildStandaloneIndex(files);
  assert.equal(r.mode, 'module');
  assert.deepEqual(r.externals, ['three']);
  assert.match(r.html, /<script type="importmap">/);
  assert.match(r.html, /<script type="module" data-bundle="main\.js">\nimport \* as __x0 from "three";/);
  assert.ok(r.html.indexOf('importmap') < r.html.indexOf('data-bundle'), 'import map comes first');
  assert.ok(!/src="main\.js"/.test(r.html));
});

test('P127.30 unbundlable code falls back to the original page with a warning, never to a broken one', () => {
  const files = new Map([['index.html', '<html><body><script type="module" src="a.js"></script></body></html>'], ['a.js', 'console.log(import.meta.url);\n']]);
  const r = buildStandaloneIndex(files);
  assert.equal(r.mode, 'unchanged');
  assert.equal(r.changed, false);
  assert.ok(r.warnings.some((w) => /import\.meta/.test(w)));
  assert.equal(r.html, files.get('index.html'));
});

test('P127.30 local fetch() is reported because it cannot work without a server', () => {
  const files = new Map([['index.html', '<html><body><script src="a.js"></script></body></html>'], ['a.js', "fetch('data.json').then(r => r.json());\n"], ['data.json', '{}']]);
  const r = buildStandaloneIndex(files);
  assert.ok(r.warnings.some((w) => /fetch\(\) of a local file/.test(w)));
});

test('P127.30 completeness no longer calls a finished file truncated because of an apostrophe in a comment', () => {
  const src = fixtureFiles['renderer.js'];
  assert.ok(/king's/.test(src), 'fixture still contains the comment that used to confuse the counter');
  assert.deepEqual(validateCompleteness(new Map([['renderer.js', src]])).issues, []);
  const cut = validateCompleteness(new Map([['x.js', 'export function f() {\n  if (a) {\n    return 1;\n']]));
  assert.equal(cut.ok, false);
  assert.match(cut.issues[0].message, /likely truncated/);
});

test('P127.30 continuation reads the editable sources from source/ and ignores the generated root index.html', () => {
  const m = continuationPathMap(['index.html', 'source/index.html', 'source/app.js', 'build-report.json']);
  assert.deepEqual([...m], [['source/index.html', 'index.html'], ['source/app.js', 'app.js']]);
  const legacy = continuationPathMap(['index.html', 'app.js']);
  assert.deepEqual([...legacy], [['index.html', 'index.html'], ['app.js', 'app.js']]);
});
