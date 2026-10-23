#!/usr/bin/env node
import { planTaskContext } from './architectureTaskContextLib.mjs';
const args = process.argv.slice(2);
let task;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--task' && args[i + 1]) task = args[++i];
  else if (args[i] === '--json') continue;
  else { console.error(`Unknown argument: ${args[i]}`); process.exit(2); }
}
try {
  const result = planTaskContext(task);
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`TASK: ${result.taskSummary}\nSTATUS: ${result.classification.completeness} (${result.confidence})`);
    console.log('\nCANDIDATE FILES');
    for (const x of result.mustRead) console.log(`  ${x.file} — ${x.reason} [${x.evidence}]`);
    console.log('\nCONDITIONAL CONTEXT');
    for (const x of result.readIfNeeded) console.log(`  ${x.file} — ${x.reason} [${x.evidence}]`);
    console.log('\nSUGGESTED TESTS: ' + (result.requiredTests.map((x) => x.name).join(', ') || 'none identified'));
    console.log('\nUNCERTAINTIES\n  ' + result.uncertainties.join('\n  '));
  }
} catch (error) { console.error(`context:task: ${error.message}`); process.exitCode = 2; }
