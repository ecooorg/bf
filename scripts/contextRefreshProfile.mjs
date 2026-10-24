#!/usr/bin/env node
/** P90: measure existing context/lineage/planning work before considering incremental refresh. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { root, buildGraph } from './architectureLib.mjs';
import { planTaskContext } from './architectureTaskContextLib.mjs';
import { buildImpactLineage } from './architectureImpactLineageLib.mjs';
import { planVerification } from './verificationPlannerLib.mjs';
import { draftIntentContract } from './intentContractLib.mjs';
import { profileOperations, stableJson, sha256 } from './contextRefreshProfileLib.mjs';

const args = process.argv.slice(2);
let runs = 5;
let warmups = 1;
let outputPath = null;
let json = false;
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--runs' && args[i + 1]) runs = Number(args[++i]);
  else if (arg === '--warmups' && args[i + 1]) warmups = Number(args[++i]);
  else if (arg === '--output' && args[i + 1]) outputPath = args[++i];
  else if (arg === '--json') json = true;
  else { console.error(`Unknown or incomplete argument: ${arg}`); process.exit(2); }
}
if (!Number.isInteger(runs) || runs < 2 || runs > 30 || !Number.isInteger(warmups) || warmups < 0 || warmups > 5) {
  console.error('Use --runs 2..30 and --warmups 0..5.'); process.exit(2);
}
if (outputPath && fs.existsSync(path.resolve(outputPath))) {
  console.error(`Refusing to overwrite existing output: ${path.resolve(outputPath)}`); process.exit(2);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const task = 'Fix Project Mode ZIP download and trace generation, persistence, and delivery';
const changedFiles = ['server/projectRoutes.ts'];
const separateCiSteps = ['lint', 'test', 'test:live', 'test:ui', 'verify:connections', 'test:database:live', 'test:bx06:api', 'verify:change', 'architecture:check', 'architecture:impact', 'architecture:map'];
const context = () => planTaskContext(task);
const impact = () => {
  const graph = buildGraph();
  const importEdges = Object.entries(graph.edges).flatMap(([from, targets]) => targets.map((to) => ({ from, to, type: 'imports', provenance: 'static-import-parser', confidence: 'static-analysis' })));
  return buildImpactLineage({ changedFiles, task, rootDir: root, modules: graph.modules, importEdges });
};
const verification = () => planVerification({ task, changedFiles, scripts: packageJson.scripts, separateCiSteps });
const intent = () => {
  const contextResult = context();
  const impactResult = impact();
  const verificationResult = verification();
  return draftIntentContract({
    task, changedFiles, scripts: packageJson.scripts,
    contextSummary: { status: 'AVAILABLE', completeness: contextResult.classification.completeness, matchedFeatures: contextResult.classification.matchedFeatures, candidateFiles: contextResult.mustRead.map((item) => item.file), uncertainties: contextResult.uncertainties },
    impactSummary: { status: impactResult.status, impactedSurfaces: impactResult.intentDiff.observedImpact, uncertainties: impactResult.uncertainties },
    verification: verificationResult.suggestedCommands.map((item) => ({ script: item.script, required: item.required, status: item.status, reason: item.reason })),
  });
};
const operations = [
  { name: 'P85 task context', run: context },
  { name: 'P86 graph plus impact lineage', run: impact },
  { name: 'P87 verification planning', run: verification },
  { name: 'P89 composed intent contract', run: intent },
];
const profile = profileOperations(operations, { runs, warmups });
const inputFiles = [
  'package.json', 'scripts/architectureLib.mjs', 'scripts/architectureContextLib.mjs',
  'scripts/architectureTaskContextLib.mjs', 'scripts/architectureImpactLineageLib.mjs',
  'scripts/verificationPlannerLib.mjs', 'scripts/intentContractLib.mjs',
  'docs/generated-route-inventory.json', 'docs/generated-env-inventory.json',
  'docs/generated-migration-inventory.json', 'docs/generated-module-map.json',
];
const inputHashes = Object.fromEntries(inputFiles.map((relative) => {
  const absolute = path.join(root, relative);
  return [relative, fs.existsSync(absolute) ? createHash('sha256').update(fs.readFileSync(absolute)).digest('hex') : 'MISSING'];
}));
const report = {
  ...profile,
  generatedAt: new Date().toISOString(),
  environment: { node: process.version, platform: process.platform, arch: process.arch },
  scenario: { task, changedFiles },
  inputFingerprint: sha256(stableJson(inputHashes)),
  inputHashes,
  scopeNote: 'Static in-process planner profile only. Does not represent hosted CI, model latency, user-perceived latency, or end-to-end project generation/download.',
};
const rendered = JSON.stringify(report, null, 2);
if (outputPath) fs.writeFileSync(path.resolve(outputPath), `${rendered}\n`, { flag: 'wx' });
if (json) console.log(rendered);
else {
  console.log(`P90 context refresh profile (${runs} runs, ${warmups} warmup(s))`);
  for (const item of report.operations) console.log(`- ${item.name}: median ${item.medianMs} ms; p95 ${item.p95Ms} ms; deterministic=${item.outputStable}; output=${item.outputHash || 'NONDETERMINISTIC'}`);
  console.log(`Total median across operations: ${report.totalMedianMs} ms`);
  console.log(`Cache recommendation: ${report.cacheRecommendation}`);
  console.log(`Input fingerprint: ${report.inputFingerprint}`);
  console.log('No shell commands, tests, or generated-file writes were run by the profiled operations.');
  if (outputPath) console.log(`Report written: ${path.resolve(outputPath)}`);
}
