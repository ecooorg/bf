#!/usr/bin/env node
/** P87 read-only verification plan CLI. Does not execute any suggested command. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planVerification } from './verificationPlannerLib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
const json = args.includes('--json');
let task = '';
const changedFiles = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--json') continue;
  if (args[i] === '--task') { task = args[i + 1] || ''; i += 1; continue; }
  if (args[i] === '--file' || args[i] === '--changed') { if (args[i + 1]) changedFiles.push(args[i + 1]); i += 1; continue; }
  if (!args[i].startsWith('-')) changedFiles.push(args[i]);
}
if (!task && !changedFiles.length && process.env.CHANGED_FILES) changedFiles.push(...process.env.CHANGED_FILES.split(/[\s,]+/).filter(Boolean));
if (!task && !changedFiles.length) {
  console.error('verification:plan: provide --task "..." and/or changed file paths. Example: npm run verify:plan -- --task "Fix ZIP download" server/projectRoutes.ts');
  process.exit(2);
}
// Keep in sync with the explicit CI-step list used by P56's check-chain invariant.
const separateCiSteps = ['lint', 'test', 'test:live', 'test:ui', 'verify:connections', 'test:database:live', 'test:bx06:api', 'verify:change', 'architecture:check', 'architecture:impact', 'architecture:map'];
const report = planVerification({ task, changedFiles, scripts: pkg.scripts, separateCiSteps });
if (json) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`verification:plan ${report.status} (${report.risk} risk)`);
  console.log(`  task: ${report.task || '(not supplied)'}`);
  console.log(`  changed files: ${report.changedFiles.join(', ') || '(not supplied)'}`);
  console.log(`  areas: ${report.matchedAreas.join(', ') || '(none recognized)'}`);
  for (const tier of ['fast', 'targeted', 'full']) {
    const items = report.suggestedCommands.filter((x) => x.tier === tier);
    if (!items.length) continue;
    console.log(`  ${tier}:`);
    for (const item of items) console.log(`    - ${item.command} [${item.status}] — ${item.reason}`);
  }
  console.log('  mandatory full gates:');
  for (const gate of report.requiredFullGates) console.log(`    - ${gate.command || gate.name}: ${gate.status}${gate.reason ? ` — ${gate.reason}` : ''}`);
  if (report.counterexamples.length) {
    console.log('  counterexamples to test:');
    for (const example of report.counterexamples) console.log(`    - ${example}`);
  }
  if (report.testChain.errors.length) {
    console.log('  test-chain errors:');
    for (const error of report.testChain.errors) console.log(`    - ${error}`);
  }
  if (report.uncertainties.length) {
    console.log('  uncertainties:');
    for (const uncertainty of report.uncertainties) console.log(`    - ${uncertainty}`);
  }
  console.log('  status note: suggested checks are NOT RUN; this report is not a test result.');
}
if (report.status === 'BLOCKED') process.exitCode = 1;
