#!/usr/bin/env node
/** P89 draft-only intent contract CLI. Read-only; does not approve, edit, or execute commands. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { draftIntentContract } from './intentContractLib.mjs';
import { planVerification } from './verificationPlannerLib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
const opts = { task: '', files: [], outOfScope: [], invariants: [], criteria: [], verify: [], json: false, contextRef: null, impactRef: null, output: null };
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--json') { opts.json = true; continue; }
  const map = {
    '--task': 'task', '--file': 'files', '--changed': 'files', '--out-of-scope': 'outOfScope',
    '--invariant': 'invariants', '--acceptance': 'criteria', '--verify': 'verify',
    '--context-ref': 'contextRef', '--impact-ref': 'impactRef', '--output': 'output',
  };
  if (map[arg]) {
    const value = args[i + 1];
    if (value === undefined || value.startsWith('--')) { console.error(`Missing value for ${arg}`); process.exit(2); }
    const key = map[arg];
    if (Array.isArray(opts[key])) opts[key].push(value); else opts[key] = value;
    i += 1; continue;
  }
  if (!arg.startsWith('-')) opts.files.push(arg);
  else { console.error(`Unknown option: ${arg}`); process.exit(2); }
}
if (!opts.task.trim()) {
  console.error('intent:contract: provide --task "...". Example: npm run intent:contract -- --task "Fix Project Mode ZIP download" --file server/projectRoutes.ts');
  process.exit(2);
}
const separateCiSteps = ['lint', 'test', 'test:live', 'test:ui', 'verify:connections', 'test:database:live', 'test:bx06:api', 'verify:change', 'architecture:check', 'architecture:impact', 'architecture:map'];
let verificationPlan;
try { verificationPlan = planVerification({ task: opts.task, changedFiles: opts.files, scripts: pkg.scripts, separateCiSteps }); }
catch (error) { console.error(`Could not draft verification plan: ${error.message}`); process.exit(2); }
let contextSummary = null;
try {
  const { planTaskContext } = await import('./architectureTaskContextLib.mjs');
  const context = planTaskContext(opts.task);
  contextSummary = { status: 'AVAILABLE', completeness: context.classification?.completeness || 'UNKNOWN', matchedFeatures: context.classification?.matchedFeatures || [], candidateFiles: (context.mustRead || []).map((x) => x.file), uncertainties: context.uncertainties || [] };
} catch (error) {
  contextSummary = { status: 'UNAVAILABLE', completeness: 'UNKNOWN', matchedFeatures: [], candidateFiles: [], uncertainties: [`P85 context planning unavailable: ${error.message}`] };
}
let impactSummary = null;
if (opts.files.length) {
  try {
    const { buildGraph, root: architectureRoot } = await import('./architectureLib.mjs');
    const { buildImpactLineage } = await import('./architectureImpactLineageLib.mjs');
    const graph = buildGraph();
    const importEdges = [];
    for (const [from, targets] of Object.entries(graph.edges || {})) for (const to of targets) importEdges.push({ from, to, type: 'imports', provenance: 'scripts/architectureLib.mjs:static-import-parser', confidence: 'static-analysis' });
    const impact = buildImpactLineage({ changedFiles: opts.files, task: opts.task, rootDir: architectureRoot, modules: graph.modules || [], importEdges });
    impactSummary = { status: impact.status || 'UNKNOWN', sourceStatus: 'AVAILABLE', impactedSurfaces: impact.intentDiff?.observedImpact || [], uncertainties: impact.uncertainties || [] };
  } catch (error) {
    impactSummary = { status: 'UNAVAILABLE', sourceStatus: 'UNAVAILABLE', impactedSurfaces: [], uncertainties: [`P86 impact planning unavailable: ${error.message}`] };
  }
}
const verification = [
  ...verificationPlan.suggestedCommands.map((x) => ({ ...x, source: 'P87_verification_planner' })),
  ...verificationPlan.requiredFullGates.map((x) => ({ command: x.command, script: x.command?.replace(/^npm run\s+/, ''), required: true, status: x.status, reason: x.reason, source: 'P87_required_gate' })),
  ...opts.verify.map((script) => ({ script, command: `npm run ${script}`, required: false, source: 'explicit_user_input' })),
];
const contract = draftIntentContract({
  task: opts.task, changedFiles: opts.files, outOfScope: opts.outOfScope, requiredInvariants: opts.invariants,
  acceptanceCriteria: opts.criteria, verification, contextPlanRef: opts.contextRef || (contextSummary && contextSummary.status !== 'UNAVAILABLE' ? 'P85:generated-in-memory' : null), impactEvidenceRef: opts.impactRef || (impactSummary && impactSummary.sourceStatus !== 'UNAVAILABLE' ? 'P86:generated-in-memory' : null),
  contextSummary, impactSummary, scripts: pkg.scripts,
});
if (opts.output) fs.writeFileSync(path.resolve(opts.output), `${JSON.stringify(contract, null, 2)}\n`, { flag: 'wx' });
if (opts.json) console.log(JSON.stringify(contract, null, 2));
else {
  console.log(`intent:contract ${contract.status} (${contract.validation.status})`);
  console.log(`  goal: ${contract.goal.text}`);
  console.log(`  draft approval: human review required; not approved`);
  console.log(`  changed areas: ${contract.scope.allowedAreas.join(', ') || '(unknown)'}`);
  console.log(`  acceptance criteria:`);
  for (const criterion of contract.acceptanceCriteria) console.log(`    - ${criterion.id} [${criterion.source}; ${criterion.status}]: ${criterion.text}`);
  console.log(`  invariants:`);
  for (const invariant of contract.requiredInvariants) console.log(`    - [${invariant.source}] ${invariant.text}`);
  console.log(`  verification suggestions (NOT RUN):`);
  for (const item of contract.requiredVerification) console.log(`    - ${item.command} [${item.status}]${item.reason ? ` — ${item.reason}` : ''}`);
  console.log(`  P85 context: ${contract.contextEvidence.completeness || contract.contextEvidence.status}; candidates=${contract.contextEvidence.candidateFiles.length}; uncertainties=${contract.contextEvidence.uncertainties.length}`);
  console.log(`  P86 impact: ${contract.impactEvidence.status}; affected surfaces=${contract.impactEvidence.impactedSurfaces.length}; uncertainties=${contract.impactEvidence.uncertainties.length}`);
  if (contract.openQuestions.length) { console.log('  open questions / review flags:'); for (const q of contract.openQuestions) console.log(`    - ${q}`); }
  if (contract.validation.errors.length) { console.log('  validation errors:'); for (const e of contract.validation.errors) console.log(`    - ${e}`); }
  if (contract.validation.warnings.length) { console.log('  validation warnings:'); for (const w of contract.validation.warnings) console.log(`    - ${w}`); }
  console.log('  no files edited; no commands executed; no approval inferred.');
}
if (contract.validation.errors.length) process.exitCode = 1;
