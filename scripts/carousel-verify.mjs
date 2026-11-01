#!/usr/bin/env node
/**
 * C123 — Full automated carousel verification orchestrator.
 * Runs deterministic suites + ops probe; optional live layer when GEMINI_API_KEY is set.
 *
 * Exit codes:
 *   0 — all requested layers passed (or live skipped cleanly)
 *   1 — deterministic or live failure
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'artifacts', 'carousel-verify');
fs.mkdirSync(outDir, { recursive: true });

const LIVE = process.env.CAROUSEL_LIVE === 'true' || process.env.CAROUSEL_LIVE === '1';
const summary = {
  type: 'carousel_verify_summary',
  startedAt: new Date().toISOString(),
  layers: [],
  live: LIVE,
  ok: true,
};

function run(name, command, args, env = {}) {
  const logFile = path.join(outDir, `${name.replace(/[^a-z0-9_-]/gi, '_')}.log`);
  const r = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, MODEL_MIN_INTERVAL_MS: '0', ...env },
    maxBuffer: 8 * 1024 * 1024,
  });
  const text = `${r.stdout || ''}${r.stderr || ''}`;
  fs.writeFileSync(logFile, text);
  const ok = r.status === 0;
  summary.layers.push({
    name,
    ok,
    exit: r.status,
    log: path.relative(root, logFile),
    tail: text.trim().split('\n').slice(-15).join('\n'),
  });
  if (!ok) summary.ok = false;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  return ok;
}

// --- Layer A: unit contracts ---
run(
  'unit-workflow',
  process.execPath,
  ['--import', 'tsx', '--test', '--test-timeout=120000', 'tests/p123-carousel-workflow.test.mjs']
);
run(
  'unit-key-pool',
  process.execPath,
  ['--import', 'tsx', '--test', '--test-timeout=60000', 'tests/p123.2-key-pool.test.mjs']
);
run(
  'unit-source-health',
  process.execPath,
  ['--import', 'tsx', '--test', '--test-timeout=60000', 'tests/p123.4-source-health.test.mjs']
);
run(
  'unit-catalog',
  process.execPath,
  ['--import', 'tsx', '--test', '--test-timeout=60000', 'tests/p123.3-model-sources-catalog.test.mjs']
);
run(
  'unit-carousel-lineage',
  process.execPath,
  ['--import', 'tsx', '--test', '--test-timeout=60000', 'tests/p123.1-model-carousel.test.mjs']
);

// --- Layer B: ops probe (no network) ---
run('ops-probe', process.execPath, ['--import', 'tsx', 'scripts/carousel-ops-probe.mjs']);

// --- Layer C: models suite slice if present (allowlist / cascade) ---
if (fs.existsSync(path.join(root, 'tests/model-allowlist-contract.test.mjs'))) {
  run(
    'unit-allowlist',
    process.execPath,
    ['--import', 'tsx', '--test', '--test-timeout=60000', 'tests/model-allowlist-contract.test.mjs']
  );
}

// --- Layer D: live (optional) ---
if (LIVE) {
  if (!process.env.GEMINI_API_KEY) {
    summary.layers.push({
      name: 'live-gemini',
      ok: false,
      exit: 2,
      log: null,
      tail: 'CAROUSEL_LIVE set but GEMINI_API_KEY missing',
    });
    summary.ok = false;
    console.log('FAIL  live-gemini (no key)');
  } else {
    // Minimal live: one generate via dynamic import of gemini adapter is heavy;
    // reuse real-model eval harness if present, else a tiny probe script inline.
    const liveScript = path.join(root, 'scripts/carousel-live-smoke.mjs');
    if (fs.existsSync(liveScript)) {
      run('live-smoke', process.execPath, ['--import', 'tsx', liveScript], {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GEMINI_API_KEY_1: process.env.GEMINI_API_KEY_1 || '',
        GEMINI_API_KEY_2: process.env.GEMINI_API_KEY_2 || '',
      });
    } else {
      summary.layers.push({
        name: 'live-smoke',
        ok: false,
        exit: 3,
        log: null,
        tail: 'scripts/carousel-live-smoke.mjs missing',
      });
      summary.ok = false;
    }
  }
} else {
  summary.layers.push({
    name: 'live-smoke',
    ok: true,
    exit: 0,
    skipped: true,
    tail: 'CAROUSEL_LIVE not set — live layer skipped (deterministic only)',
  });
  console.log('SKIP  live-smoke');
}

summary.finishedAt = new Date().toISOString();
const summaryPath = path.join(outDir, 'summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log('\n' + JSON.stringify({ ok: summary.ok, layers: summary.layers.map((l) => ({ name: l.name, ok: l.ok, skipped: l.skipped || false })) }, null, 2));
process.exit(summary.ok ? 0 : 1);
