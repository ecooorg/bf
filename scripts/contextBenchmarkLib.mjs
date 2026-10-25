/**
 * P84 read-only context benchmark. Static analysis only; never imports or executes
 * application modules. Gold sets are human-curated expectations, not runtime truth.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { planContext } from './architectureContextLib.mjs';

const IMPORT_RE = /(?:import|export)\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))?\s*from\s+['"]([^'"]+)['"]/g;
const SIDE_IMPORT_RE = /import\s+['"]([^'"]+)['"]/g;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-server', '.git', 'artifacts']);
const SCRIPT_TESTS = {
  'test:core': ['tests/core.test.mjs'],
  'test:project': ['tests/project-mode.test.mjs'],
  'test:database': ['tests/database.test.mjs'],
  'test:gates': ['tests/gates.test.mjs'],
  'test:pipeline': ['tests/pipeline.test.mjs'],
  'test:security': ['tests/security.test.mjs'],
  'test:workspace': ['tests/workspace.test.mjs'],
  'test:files': ['tests/files.test.mjs'],
  'test:integrations': ['tests/integrations.test.mjs'],
  'test:models': ['tests/models.test.mjs'],
  'test:web': ['tests/web-and-epistemics.test.mjs'],
  'test:turn': ['tests/conversation-turn.test.mjs'],
  'test:regression': ['tests/regression.test.mjs'],
};

const norm = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^bf-main\//, '');
const uniq = (items) => [...new Set(items)].sort();
const isSource = (p) => /\.(?:ts|tsx)$/.test(p) && !p.endsWith('.d.ts');
const readText = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (root, rel) => fs.existsSync(path.join(root, rel)) && fs.statSync(path.join(root, rel)).isFile();

function listSourceFiles(root) {
  const result = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (isSource(entry.name)) result.push(norm(path.relative(root, full)));
    }
  }
  walk(root);
  return result.sort();
}

function resolveImport(root, importer, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = path.dirname(path.join(root, importer));
  const raw = path.normalize(path.join(base, specifier));
  const choices = [raw, `${raw}.ts`, `${raw}.tsx`, `${raw}.js`, `${raw}.mjs`, path.join(raw, 'index.ts'), path.join(raw, 'index.tsx')];
  for (const choice of choices) {
    if (fs.existsSync(choice) && fs.statSync(choice).isFile()) return norm(path.relative(root, choice));
  }
  return null;
}

export function buildGraphAt(rootInput) {
  const root = path.resolve(rootInput);
  const modules = listSourceFiles(root);
  const moduleSet = new Set(modules);
  const edges = {};
  const lines = {};
  for (const module of modules) {
    const text = readText(root, module);
    lines[module] = text.split(/\r?\n/).length;
    const specs = [];
    for (const re of [IMPORT_RE, SIDE_IMPORT_RE]) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(text)) !== null) specs.push(match[1]);
    }
    edges[module] = uniq(specs.map((spec) => resolveImport(root, module, spec)).filter((resolved) => resolved && resolved !== module && moduleSet.has(resolved)));
  }
  return { modules, edges, lines };
}

function treeFingerprint(root, graph, goldSet) {
  const files = uniq([...graph.modules, ...goldSet]).filter((rel) => exists(root, rel));
  const hash = crypto.createHash('sha256');
  for (const rel of files) {
    hash.update(rel).update('\0').update(readText(root, rel)).update('\0');
  }
  return hash.digest('hex');
}

function evaluateScenario(root, graph, scenario, targetField) {
  const target = norm(scenario[targetField]);
  const fileExists = (rel) => exists(root, norm(rel));
  const readFile = (rel) => readText(root, norm(rel));
  const plan = planContext([target], { graph, readFile, fileExists });
  const context = uniq([
    ...plan.staticContextCandidates.map((item) => item.file),
    ...plan.supportingContext.map((item) => item.file),
    ...plan.integrationPoints.map((item) => item.file),
    ...plan.suggestedNpmScripts.flatMap((script) => SCRIPT_TESTS[script] || []),
  ]).filter((file) => file !== target && fileExists(file));
  const expectedGold = uniq(scenario.goldDependencies.map(norm));
  const missingGold = expectedGold.filter((file) => !fileExists(file));
  const gold = expectedGold.filter((file) => fileExists(file));
  const found = gold.filter((file) => file === target || context.includes(file));
  const falsePositives = context.filter((file) => !gold.includes(file));
  const sourceFiles = uniq([target, ...context]).filter((file) => isSource(file) && fileExists(file));
  const sourceLineCost = sourceFiles.reduce((sum, file) => sum + readText(root, file).split(/\r?\n/).length, 0);
  const lineCounts = Object.fromEntries(sourceFiles.map((file) => [file, readText(root, file).split(/\r?\n/).length]));
  return {
    id: scenario.id,
    target,
    targetExists: fileExists(target),
    candidateFiles: context,
    candidateFileCount: context.length,
    candidateSourceFiles: sourceFiles.filter((file) => file !== target),
    candidateSourceLineCost: sourceLineCost,
    targetSourceLines: lineCounts[target] ?? null,
    goldDependencyCount: gold.length,
    goldExpectedDependencyCount: expectedGold.length,
    availableGoldDependencies: gold,
    goldFound: found,
    goldMissed: gold.filter((file) => file !== target && !context.includes(file)),
    goldRecall: gold.length ? round(found.length / gold.length) : null,
    falsePositiveFiles: falsePositives,
    falsePositiveRate: context.length ? round(falsePositives.length / context.length) : null,
    integrationPoints: plan.integrationPoints,
    suggestedNpmScripts: plan.suggestedNpmScripts,
    uncertainties: plan.uncertainties,
    missingGoldInTree: missingGold,
    verification: uniq(['npm run architecture:check', 'npm run typecheck', 'npm run check', ...plan.suggestedNpmScripts]).map((command) => ({ command, status: 'not-run-by-benchmark', durationMs: null })),
    touchedFiles: { status: 'not-applicable-read-only-analysis', count: null },
  };
}

function round(value) { return Math.round(value * 10000) / 10000; }

function summarize(results) {
  const goldTotal = results.reduce((n, row) => n + row.goldDependencyCount, 0);
  const foundTotal = results.reduce((n, row) => n + row.goldFound.length, 0);
  const candidateTotal = results.reduce((n, row) => n + row.candidateFileCount, 0);
  const falsePositiveTotal = results.reduce((n, row) => n + row.falsePositiveFiles.length, 0);
  return {
    scenarioCount: results.length,
    goldDependencies: goldTotal,
    goldFound: foundTotal,
    aggregateGoldRecall: goldTotal ? round(foundTotal / goldTotal) : null,
    candidateFiles: candidateTotal,
    falsePositiveFiles: falsePositiveTotal,
    aggregateFalsePositiveRate: candidateTotal ? round(falsePositiveTotal / candidateTotal) : null,
    totalCandidateSourceLineCost: results.reduce((n, row) => n + row.candidateSourceLineCost, 0),
    note: 'Scenario sums are not deduplicated across scenarios; line cost is a source-line proxy, not tokens or measured agent read cost.',
  };
}

export function runBenchmark({ currentRoot, baselineRoot = null, fixturePath, verificationPath = null }) {
  const current = path.resolve(currentRoot);
  const fixtureFile = fixturePath || path.join(current, 'tests/context-benchmark-gold-p84.json');
  const fixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));
  const verificationRun = verificationPath
    ? JSON.parse(fs.readFileSync(path.resolve(verificationPath), 'utf8'))
    : { status: 'not-provided', commands: [], note: 'Supply --verification-file to attach a captured command/status/duration manifest.' };
  if (!Array.isArray(verificationRun.commands)) throw new Error('Verification manifest must contain a commands array');
  if (fixture.schemaVersion !== 1 || !Array.isArray(fixture.scenarios) || fixture.scenarios.length < 4 || fixture.scenarios.length > 6) {
    throw new Error('P84 fixture must be schemaVersion 1 with 4–6 scenarios');
  }
  const allGold = fixture.scenarios.flatMap((scenario) => [...scenario.goldDependencies, scenario.currentTarget, scenario.baselineTarget]);
  const currentGraph = buildGraphAt(current);
  const currentRows = fixture.scenarios.map((scenario) => evaluateScenario(current, currentGraph, scenario, 'currentTarget'));
  const currentResult = {
    treeFingerprint: treeFingerprint(current, currentGraph, allGold),
    sourceModules: currentGraph.modules.length,
    staticImportEdges: Object.values(currentGraph.edges).reduce((sum, list) => sum + list.length, 0),
    summary: summarize(currentRows),
    scenarios: currentRows,
  };
  let baselineResult = null;
  let comparison = { status: 'not-run-no-baseline-root', explanation: 'Supply --baseline-root to measure the same scenario intent against a separate tree.' };
  if (baselineRoot) {
    const baseline = path.resolve(baselineRoot);
    const baselineGraph = buildGraphAt(baseline);
    const baselineRows = fixture.scenarios.map((scenario) => evaluateScenario(baseline, baselineGraph, scenario, 'baselineTarget'));
    baselineResult = {
      label: 'v80 + p80.1 pre-P81 baseline',
      treeFingerprint: treeFingerprint(baseline, baselineGraph, allGold),
      sourceModules: baselineGraph.modules.length,
      staticImportEdges: Object.values(baselineGraph.edges).reduce((sum, list) => sum + list.length, 0),
      summary: summarize(baselineRows),
      scenarios: baselineRows,
    };
    const baselineById = new Map(baselineRows.map((row) => [row.id, row]));
    const perScenario = currentRows.map((row) => {
      const before = baselineById.get(row.id);
      const scenario = fixture.scenarios.find((item) => item.id === row.id);
      const commonGold = scenario.goldDependencies.map(norm).filter((file) => exists(current, file) && exists(baseline, file));
      const baselineComparableFound = commonGold.filter((file) => file === before.target || before.candidateFiles.includes(file)).length;
      const currentComparableFound = commonGold.filter((file) => file === row.target || row.candidateFiles.includes(file)).length;
      return {
        id: row.id,
        comparableGoldDependencyCount: commonGold.length,
        baselineComparableFound,
        currentComparableFound,
        baselineComparableRecall: commonGold.length ? round(baselineComparableFound / commonGold.length) : null,
        currentComparableRecall: commonGold.length ? round(currentComparableFound / commonGold.length) : null,
        baselineTarget: before.target,
        currentTarget: row.target,
        baselineRecall: before.goldRecall,
        currentRecall: row.goldRecall,
        baselineCandidateSourceLineCost: before.candidateSourceLineCost,
        currentCandidateSourceLineCost: row.candidateSourceLineCost,
        sourceLineCostDelta: row.candidateSourceLineCost - before.candidateSourceLineCost,
        baselineMissingGoldInTree: before.missingGoldInTree,
        currentMissingGoldInTree: row.missingGoldInTree,
      };
    });
    const comparableGoldTotal = perScenario.reduce((sum, row) => sum + row.comparableGoldDependencyCount, 0);
    const baselineComparableFoundTotal = perScenario.reduce((sum, row) => sum + row.baselineComparableFound, 0);
    const currentComparableFoundTotal = perScenario.reduce((sum, row) => sum + row.currentComparableFound, 0);
    comparison = {
      status: 'measured-static-proxy',
      method: 'Same scenario intent and gold set; target aliases accommodate P82 file extraction. Uses the P84 static planner algorithm on both trees; it is not a historical measurement of an agent using the v80 toolchain.',
      perScenario,
      comparableAggregate: {
        goldDependenciesPresentInBothTrees: comparableGoldTotal,
        baselineGoldFound: baselineComparableFoundTotal,
        currentGoldFound: currentComparableFoundTotal,
        baselineRecall: comparableGoldTotal ? round(baselineComparableFoundTotal / comparableGoldTotal) : null,
        currentRecall: comparableGoldTotal ? round(currentComparableFoundTotal / comparableGoldTotal) : null,
      },
      baselineAggregate: baselineResult.summary,
      currentAggregate: currentResult.summary,
      caution: 'Use comparableAggregate for apples-to-apples recall. Compare per-scenario cost together with recall and missing-gold lists. Do not treat lower cost as an improvement if recall falls or a gold dependency is absent from the tree.',
    };
  }
  return {
    schemaVersion: 1,
    benchmark: 'BiForge P84 AI-Native Context Benchmark',
    methodology: {
      mode: 'read-only-static-analysis',
      goldSetStatus: fixture.status,
      goldSetReviewPolicy: fixture.reviewPolicy,
      metrics: ['gold-set recall', 'false-positive candidate rate', 'candidate source-line cost', 'source modules', 'static import edges', 'verification command/status/duration placeholders', 'touched files when implementation tasks are separately measured'],
      notMeasured: ['AI tokens', 'agent read traces', 'task completion time', 'actual verification duration', 'runtime dependency completeness', 'implementation touched-file counts'],
      noRegressionGate: 'Intentionally absent until gold-set review and repeated stability runs are complete.',
    },
    verificationRun,
    current: currentResult,
    baseline: baselineResult,
    comparison,
  };
}
