#!/usr/bin/env node
/** P86 read-only change-impact graph and generated-artifact lineage report. */
import { buildGraph, root } from './architectureLib.mjs';
import { buildImpactLineage } from './architectureImpactLineageLib.mjs';

const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const details = args.includes('--details');
let task = '';
const changedFiles = [];
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--json' || arg === '--details') continue;
  if (arg === '--task') {
    task = args[i + 1] || '';
    i += 1;
  } else if (arg === '--file' || arg === '--changed') {
    if (args[i + 1]) changedFiles.push(args[i + 1]);
    i += 1;
  } else if (!arg.startsWith('-')) changedFiles.push(arg);
}
if (!changedFiles.length && process.env.CHANGED_FILES) {
  changedFiles.push(...process.env.CHANGED_FILES.split(/[\s,]+/).filter(Boolean));
}
if (!changedFiles.length) {
  console.error('impact:lineage: provide changed file paths, e.g. npm run impact:lineage -- --task "Refresh route inventory" scripts/docsGenerateInventories.mjs');
  process.exit(2);
}

const graph = buildGraph();
const importEdges = [];
for (const [from, targets] of Object.entries(graph.edges)) {
  for (const to of targets) importEdges.push({ from, to, type: 'imports', provenance: 'scripts/architectureLib.mjs:static-import-parser', confidence: 'static-analysis' });
}
const report = buildImpactLineage({
  changedFiles,
  task,
  rootDir: root,
  modules: graph.modules,
  importEdges,
});
if (details) report.detailMode = 'expanded';
if (jsonOnly) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`impact:lineage ${report.status}`);
  console.log(`  task: ${report.task || '(not supplied)'}`);
  console.log(`  changed: ${report.changedFiles.join(', ')}`);
  console.log(`  affected modules: ${report.staticImportImpact.affectedModules.length}`);
  console.log(`  generated artifact health: ${Object.entries(report.generatedArtifacts).map(([file, value]) => `${file}=${value.status}`).join('; ')}`);
  console.log(`  impacted surfaces: ${report.intentDiff.observedImpact.slice(0, details ? 80 : 12).join(', ') || '(none identified)'}`);
  console.log(`  suggested checks (not run): ${report.intentDiff.verification.map((v) => v.command).join(', ') || '(none inferred)'}`);
  if (report.uncertainties.length) {
    console.log('  uncertainties:');
    for (const item of report.uncertainties.slice(0, details ? 80 : 5)) console.log(`    - ${item}`);
  }
  if (details) {
    console.log('  evidence edges:');
    for (const item of report.edges) console.log(`    ${item.from} -[${item.type}; ${item.confidence}; ${item.provenance}]-> ${item.to}`);
  }
}
