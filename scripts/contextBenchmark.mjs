#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root as defaultRoot } from './architectureLib.mjs';
import { runBenchmark } from './contextBenchmarkLib.mjs';

const args = process.argv.slice(2);
let baselineRoot = null;
let currentRoot = defaultRoot;
let output = null;
let verificationFile = null;
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--baseline-root' && args[i + 1]) baselineRoot = path.resolve(args[++i]);
  else if (arg === '--current-root' && args[i + 1]) currentRoot = path.resolve(args[++i]);
  else if (arg === '--output' && args[i + 1]) output = path.resolve(args[++i]);
  else if (arg === '--verification-file' && args[i + 1]) verificationFile = path.resolve(args[++i]);
  else if (arg === '--json') continue;
  else { console.error(`Unknown or incomplete argument: ${arg}`); process.exit(2); }
}
try {
  const report = runBenchmark({ currentRoot, baselineRoot, verificationPath: verificationFile });
  const text = JSON.stringify(report, null, 2) + '\n';
  if (output) {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, text, 'utf8');
    console.log(`P84 context benchmark written to ${output}`);
  } else console.log(text);
} catch (error) {
  console.error(`context:benchmark: ${error.message}`);
  process.exit(2);
}
