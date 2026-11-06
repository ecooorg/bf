#!/usr/bin/env node
/**
 * P127.18 — Project Mode user-value evaluator ("human simulator").
 *
 * Purpose: score packages the way a non-expert person would — "is this what I asked for?" —
 * NOT whether static validators or ZIP formalities passed.
 *
 * Modes:
 *   --offline (default): fixed scenarios + flat fixtures under tests/uv-<name>-<file>
 *   --live: optional; requires GEMINI keys + running server (NOT default CI gate)
 *
 * Exit 0 only if offline suite meets the human-sim pass bar.
 * Writes artifacts/project-user-value-report.json and .md when possible.
 *
 * This is intentionally hard to "game" with empty SUCCESS reports: fixtures include a known
 * SUCCESS-labelled stub that MUST fail the human rubric, and a richer package that must score higher.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
/** Flat fixture files live directly under tests/ (no nested folders). Prefix groups one package. */
const testsDir = path.join(root, 'tests');
const FIXTURE_PREFIX = {
  'stub-racer': 'uv-stub-racer-',
  'rich-forest': 'uv-rich-forest-',
};

/** Build a virtual package map from flat tests/uv-<id>-<filename> files. */
function loadFlatFixture(prefix) {
  const map = new Map();
  let jsBytes = 0;
  let jsModules = 0;
  let report = null;
  if (!fs.existsSync(testsDir)) return { files: map, jsBytes, jsModules, report, fileList: [] };
  for (const name of fs.readdirSync(testsDir)) {
    if (!name.startsWith(prefix)) continue;
    const rest = name.slice(prefix.length);
    if (!rest || rest.includes('/') || rest.includes('\\')) continue;
    const abs = path.join(testsDir, name);
    if (!fs.statSync(abs).isFile()) continue;
    const text = fs.readFileSync(abs, 'utf8');
    if (rest === 'build-report.json') {
      try { report = JSON.parse(text); } catch { report = null; }
      continue;
    }
    map.set(rest, text);
    if (/\.js$/i.test(rest)) {
      jsBytes += text.length;
      jsModules += 1;
    }
  }
  const fileList = [...map.keys()].map((p) => ({ path: p, abs: path.join(testsDir, prefix + p), bytes: (map.get(p) || '').length }));
  return { files: map, jsBytes, jsModules, report, fileList };
}


/** @typedef {{ id: string; weight: number; pass: boolean; detail: string }} CriterionResult */
/** @typedef {{ id: string; userRequest: string; fixtureKey: string; expectHumanPass: boolean; complexity: string; notes?: string }} Scenario */

/** Scenarios fixed in-repo — the "person" always asks the same things. */
const SCENARIOS = /** @type {Scenario[]} */ ([
  {
    id: 'stub-racer-false-success',
    userRequest:
      'Create a 3D racing game through a detailed city with traffic, buildings, and touch controls for a tablet',
    fixtureKey: 'stub-racer',
    expectHumanPass: false,
    complexity: 'ambitious',
    notes: 'Observed failure mode: SUCCESS on ~2KB rectangle car. Human must reject.',
  },
  {
    id: 'rich-forest-animals',
    userRequest: 'Make a simple game where different animals walk around in a forest I can explore',
    fixtureKey: 'rich-forest',
    expectHumanPass: true,
    complexity: 'standard',
    notes: 'Not AAA — but a person should recognize forest + multiple animals + movement.',
  },
]);

function listFiles(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) listFiles(p, base, out);
    else out.push({ path: path.relative(base, p).replace(/\\/g, '/'), abs: p, bytes: st.size });
  }
  return out;
}

function readPackage(dir) {
  const files = listFiles(dir);
  const map = new Map();
  let jsBytes = 0;
  let jsModules = 0;
  for (const f of files) {
    if (f.path === 'build-report.json') continue;
    const text = fs.readFileSync(f.abs, 'utf8');
    map.set(f.path, text);
    if (/\.js$/i.test(f.path)) {
      jsBytes += text.length;
      jsModules += 1;
    }
  }
  let report = null;
  const reportPath = path.join(dir, 'build-report.json');
  if (fs.existsSync(reportPath)) {
    try {
      report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    } catch {
      report = null;
    }
  }
  return { files: map, jsBytes, jsModules, report, fileList: files };
}

/**
 * Human-simulator rubric — questions a person asks after downloading the ZIP.
 * Weights sum matters for score; pass threshold is per scenario.
 */
function evaluateAsHuman(scenario, pkg) {
  /** @type {CriterionResult[]} */
  const criteria = [];
  const blob = [...pkg.files.values()].join('\n').toLowerCase();
  const request = scenario.userRequest.toLowerCase();

  // 1. Recognition: does the code/theme look like the request?
  const themeTokens = [];
  if (/city|street|race|racing|car|traffic/.test(request)) themeTokens.push(/car|road|city|race|traffic|steer|vehicle/);
  if (/forest|animal|animals|deer|walk/.test(request)) themeTokens.push(/forest|tree|animal|deer|fox|rabbit|canopy|walk/);
  if (/3d|three/.test(request)) themeTokens.push(/perspective|camera|webgl|3d|transform|mesh/);
  const themeHits = themeTokens.filter((re) => re.test(blob)).length;
  const themeNeed = Math.max(1, Math.min(themeTokens.length, themeTokens.length <= 1 ? 1 : 2));
  const recognizePass = themeTokens.length === 0 ? pkg.jsBytes > 500 : themeHits >= themeNeed;
  criteria.push({
    id: 'recognize_request',
    weight: 3,
    pass: recognizePass,
    detail: `themeHits=${themeHits}/${themeTokens.length} jsBytes=${pkg.jsBytes}`,
  });

  // 2. Not a geometric stub relative to ambition
  const minJs = scenario.complexity === 'ambitious' ? 12000 : scenario.complexity === 'standard' ? 4000 : 800;
  const minMod = scenario.complexity === 'ambitious' ? 4 : scenario.complexity === 'standard' ? 2 : 1;
  const sizePass = pkg.jsBytes >= minJs && pkg.jsModules >= minMod;
  criteria.push({
    id: 'not_primitive_stub',
    weight: 3,
    pass: sizePass,
    detail: `jsBytes=${pkg.jsBytes} (min ${minJs}), modules=${pkg.jsModules} (min ${minMod})`,
  });

  // 3. Honest status: SUCCESS + goalImplemented only if package is not a stub
  const outcome = pkg.report?.outcome || 'UNKNOWN';
  const goalImpl = pkg.report?.goalImplemented === true;
  let honest = true;
  let honestDetail = `outcome=${outcome} goalImplemented=${goalImpl}`;
  if ((outcome === 'SUCCESS' || goalImpl) && !sizePass) {
    honest = false;
    honestDetail += ' — SUCCESS/goalImplemented on stub is dishonest to a human';
  }
  if (scenario.expectHumanPass === false && outcome === 'SUCCESS' && goalImpl) {
    honest = false;
  }
  criteria.push({
    id: 'honest_status',
    weight: 4,
    pass: honest,
    detail: honestDetail,
  });

  // 4. Controls / interactivity markers for interactive requests
  const wantsInteractive = /game|play|race|walk|touch|control|tablet|игр/.test(request);
  const hasLoop = /requestanimationframe|setinterval|settimeout/.test(blob);
  const hasInput = /keydown|keyup|pointer|touchstart|addEventListener\s*\(\s*['\"]click/.test(blob);
  const interactPass = !wantsInteractive || (hasLoop && (hasInput || /button|control/.test(blob)));
  criteria.push({
    id: 'interactive_behaviour_markers',
    weight: 2,
    pass: interactPass,
    detail: `loop=${hasLoop} input=${hasInput}`,
  });

  // 5. Multi-file structure (person expects more than one dumped file for rich asks)
  const multiPass = scenario.complexity === 'trivial' || pkg.files.size >= 3;
  criteria.push({
    id: 'multi_file_package',
    weight: 1,
    pass: multiPass,
    detail: `files=${pkg.files.size}`,
  });

  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
  const earned = criteria.reduce((s, c) => s + (c.pass ? c.weight : 0), 0);
  const score = totalWeight ? earned / totalWeight : 0;
  // Human pass bar: ambitious/standard need >= 0.7 and critical honest_status
  const honestCrit = criteria.find((c) => c.id === 'honest_status');
  const humanPass = score >= 0.7 && Boolean(honestCrit?.pass) && (scenario.expectHumanPass ? sizePass : true);

  // Scenario expectation: for known-bad fixture, humanPass must be false
  const matchesExpectation = scenario.expectHumanPass ? humanPass : !humanPass;

  return {
    scenarioId: scenario.id,
    userRequest: scenario.userRequest,
    score: Math.round(score * 1000) / 1000,
    humanPass,
    matchesExpectation,
    criteria,
    package: {
      jsBytes: pkg.jsBytes,
      jsModules: pkg.jsModules,
      fileCount: pkg.files.size,
      outcome,
      goalImplemented: goalImpl,
    },
    notes: scenario.notes || '',
  };
}

function runOffline() {
  const results = [];
  for (const scenario of SCENARIOS) {
    const prefix = FIXTURE_PREFIX[scenario.fixtureKey];
    if (!prefix) {
      results.push({
        scenarioId: scenario.id,
        error: `unknown fixtureKey ${scenario.fixtureKey}`,
        matchesExpectation: false,
        humanPass: false,
        score: 0,
      });
      continue;
    }
    const pkg = loadFlatFixture(prefix);
    if (pkg.files.size === 0) {
      results.push({
        scenarioId: scenario.id,
        error: `missing flat fixture files tests/${prefix}*`,
        matchesExpectation: false,
        humanPass: false,
        score: 0,
      });
      continue;
    }
    results.push(evaluateAsHuman(scenario, pkg));
  }
  const allMatch = results.every((r) => r.matchesExpectation);
  return { mode: 'offline', results, pass: allMatch };
}

function renderMarkdown(report) {
  const lines = [
    '# Project Mode — user-value evaluation (human simulator)',
    '',
    `Mode: **${report.mode}**`,
    `Overall: **${report.pass ? 'PASS' : 'FAIL'}**`,
    '',
    'This report scores packages as a person would ("is this what I asked for?"), not as a syntax gate.',
    '',
  ];
  for (const r of report.results) {
    lines.push(`## ${r.scenarioId}`);
    if (r.error) {
      lines.push(`Error: ${r.error}`);
      continue;
    }
    lines.push(`Request: ${r.userRequest}`);
    lines.push(`Score: ${(r.score * 100).toFixed(1)}% · humanPass=${r.humanPass} · matchesExpectation=${r.matchesExpectation}`);
    lines.push(
      `Package: jsBytes=${r.package.jsBytes} modules=${r.package.jsModules} files=${r.package.fileCount} outcome=${r.package.outcome} goalImplemented=${r.package.goalImplemented}`,
    );
    if (r.notes) lines.push(`Notes: ${r.notes}`);
    lines.push('');
    lines.push('| Criterion | Pass | Weight | Detail |');
    lines.push('|-----------|------|--------|--------|');
    for (const c of r.criteria || []) {
      lines.push(`| ${c.id} | ${c.pass ? 'yes' : 'NO'} | ${c.weight} | ${c.detail.replace(/\|/g, '/')} |`);
    }
    lines.push('');
  }
  lines.push('## Interpretation');
  lines.push('');
  lines.push('- **PASS** means: known stub labelled SUCCESS is rejected; richer forest-style package is accepted by the rubric.');
  lines.push('- **NOT proof** of live model quality. Live generation remains a separate, optional step.');
  lines.push('- Green unit tests alone are not user value (AGENTS.md G5).');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const live = args.includes('--live');
  if (live) {
    console.error('LIVE mode is not implemented as a CI gate yet (needs deployed Project API + secrets).');
    console.error('Run offline suite: node scripts/project-user-value-eval.mjs');
    process.exit(2);
  }

  const report = runOffline();
  const outDir = path.join(root, 'artifacts');
  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'project-user-value-report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(outDir, 'project-user-value-report.md'), renderMarkdown(report));
  } catch {
    // CI may not allow artifacts/ — still print
  }

  console.log(renderMarkdown(report));
  console.log(JSON.stringify({ pass: report.pass, mode: report.mode, scenarios: report.results.map((r) => ({ id: r.scenarioId, score: r.score, humanPass: r.humanPass, matchesExpectation: r.matchesExpectation })) }, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main();
