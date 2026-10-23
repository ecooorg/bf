#!/usr/bin/env node
/** Print a deterministic, read-only context plan. */
import { planContext } from './architectureContextLib.mjs';
const args = process.argv.slice(2);
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file' && args[i + 1]) files.push(args[++i]);
  else if (args[i] === '--json') continue;
  else if (!args[i].startsWith('-')) files.push(args[i]);
  else { console.error(`Unknown argument: ${args[i]}`); process.exit(2); }
}
if (!files.length) { console.error('Usage: npm run context:plan -- --file server/taskService.ts [--json]'); process.exit(2); }
try {
  const result = planContext(files);
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else {
    console.log('TARGETS\n  ' + result.targets.join('\n  '));
    for (const [label, items] of [['STATIC CONTEXT CANDIDATES', result.staticContextCandidates], ['SUPPORTING EVIDENCE', result.supportingContext]]) {
      console.log(`\n${label}`);
      for (const item of items) console.log(`  ${item.file} — ${item.reasons.join('; ')}`);
    }
    console.log('\nSUGGESTED TESTS\n  ' + (result.suggestedNpmScripts.join(', ') || 'none'));
    console.log('\nVERIFICATION\n  ' + result.verification.join('\n  '));
    console.log('\nUNCERTAINTIES\n  ' + result.uncertainties.join('\n  '));
  }
} catch (error) { console.error(`context:plan: ${error.message}`); process.exit(2); }
