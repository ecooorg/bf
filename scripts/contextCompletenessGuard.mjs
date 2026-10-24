#!/usr/bin/env node
/** P91 scoped completeness/uncertainty guard. Read-only; never executes suggested checks. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planTaskContext } from './architectureTaskContextLib.mjs';
import { buildGraph, root } from './architectureLib.mjs';
import { buildImpactLineage } from './architectureImpactLineageLib.mjs';
import { planVerification } from './verificationPlannerLib.mjs';
import { draftIntentContract } from './intentContractLib.mjs';
import { assessContextCompleteness, validateCompletenessEvidence } from './contextCompletenessGuardLib.mjs';

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
const opts = { task: '', files: [], expectedDependencies: [], evidencePath: null, output: null, json: false };
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--json') { opts.json = true; continue; }
  const key = ({ '--task': 'task', '--file': 'files', '--changed': 'files', '--expected-dependency': 'expectedDependencies', '--evidence': 'evidencePath', '--output': 'output' })[arg];
  if (key) {
    const value = args[i + 1];
    if (!value || value.startsWith('--')) { console.error(`Missing value for ${arg}`); process.exit(2); }
    if (Array.isArray(opts[key])) opts[key].push(value); else opts[key] = value;
    i += 1;
  } else if (!arg.startsWith('-')) opts.files.push(arg);
  else { console.error(`Unknown option: ${arg}`); process.exit(2); }
}
if (!opts.task.trim()) {
  console.error('context:completeness: provide --task "...". Example: npm run context:completeness -- --task "Fix Project Mode ZIP download" --file server/projectRoutes.ts');
  process.exit(2);
}
let evidence = null;
if (opts.evidencePath) {
  try { evidence = JSON.parse(fs.readFileSync(path.resolve(opts.evidencePath), 'utf8')); }
  catch (error) { console.error(`Could not read evidence JSON: ${error.message}`); process.exit(2); }
  const validation = validateCompletenessEvidence(evidence);
  if (!validation.valid) { console.error(`Invalid evidence JSON:\n- ${validation.errors.join('\n- ')}`); process.exit(2); }
}
const separateCiSteps = ['lint', 'test', 'test:live', 'test:ui', 'verify:connections', 'test:database:live', 'test:bx06:api', 'verify:change', 'architecture:check', 'architecture:impact', 'architecture:map'];
let taskContext;
let impact;
let verificationPlan;
let intentContract;
try {
  taskContext = planTaskContext(opts.task);
  if (opts.files.length) {
    const graph = buildGraph();
    const importEdges = [];
    for (const [from, targets] of Object.entries(graph.edges || {})) for (const to of targets) importEdges.push({ from, to, type: 'imports', provenance: 'scripts/architectureLib.mjs:static-import-parser', confidence: 'static-analysis' });
    impact = buildImpactLineage({ changedFiles: opts.files, task: opts.task, rootDir: root, modules: graph.modules || [], importEdges });
  }
  verificationPlan = planVerification({ task: opts.task, changedFiles: opts.files, scripts: pkg.scripts, separateCiSteps });
  intentContract = draftIntentContract({
    task: opts.task,
    changedFiles: opts.files,
    verification: [
      ...verificationPlan.suggestedCommands.map((x) => ({ ...x, source: 'P87_verification_planner' })),
      ...verificationPlan.requiredFullGates.map((x) => ({ command: x.command, script: x.command?.replace(/^npm run\s+/, ''), required: true, status: x.status, reason: x.reason, source: 'P87_required_gate' })),
    ],
    contextSummary: { status: 'AVAILABLE', completeness: taskContext.classification?.completeness || 'UNKNOWN', matchedFeatures: taskContext.classification?.matchedFeatures || [], candidateFiles: (taskContext.mustRead || []).map((x) => x.file), uncertainties: taskContext.uncertainties || [] },
    impactSummary: impact ? { status: impact.status || 'UNKNOWN', sourceStatus: 'AVAILABLE', impactedSurfaces: impact.intentDiff?.observedImpact || [], uncertainties: impact.uncertainties || [] } : null,
    scripts: pkg.scripts,
  });
} catch (error) { console.error(`Could not build completeness inputs: ${error.message}`); process.exit(2); }

if (evidence) {
  for (const criterion of intentContract.acceptanceCriteria || []) {
    const supplied = (evidence.criteria || []).find((item) => item.id === criterion.id);
    if (supplied) Object.assign(criterion, supplied);
  }
}
const report = assessContextCompleteness({ taskContext, impact, verificationPlan, intentContract, verificationEvidence: evidence, expectedDependencies: opts.expectedDependencies });
report.task = opts.task.trim().replace(/\s+/g, ' ');
report.changedFiles = [...new Set(opts.files)].sort();
report.inputEvidenceFile = opts.evidencePath ? path.basename(opts.evidencePath) : null;
if (opts.output) {
  try { fs.writeFileSync(path.resolve(opts.output), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' }); }
  catch (error) { console.error(`Could not write report: ${error.message}`); process.exit(2); }
}
if (opts.json) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`context:completeness ${report.status}`);
  console.log(`  task: ${report.task}`);
  console.log(`  evidence gaps: ${report.issueCount}; resolved with references: ${report.resolvedIssueCount}`);
  for (const item of report.issues.slice(0, 12)) console.log(`  - ${item.code}: ${item.consequence} Missing: ${item.missingEvidence} Next: ${item.nextAction}`);
  if (report.issues.length > 12) console.log(`  ... ${report.issues.length - 12} more issue(s); use --json for the full report.`);
  console.log('  scope: declared task only; no proof of whole-application correctness.');
  console.log('  no commands executed; suggested checks are not treated as run.');
}
