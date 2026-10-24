#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBenchmarkReport, loadJson } from './realTaskBenchmarkLib.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let tasksFile = path.join(root, 'tests/p88-real-task-benchmark.json');
let resultsFile = null;
let outputFile = null;
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--tasks' && process.argv[i + 1]) tasksFile = path.resolve(process.argv[++i]);
  else if (arg === '--results' && process.argv[i + 1]) resultsFile = path.resolve(process.argv[++i]);
  else if (arg === '--output' && process.argv[i + 1]) outputFile = path.resolve(process.argv[++i]);
  else if (arg === '--help') {
    console.log('Usage: npm run benchmark:real-tasks -- [--tasks FILE] [--results FILE] [--output FILE]\nAll measurements are optional but missing data stays unavailable.');
    process.exit(0);
  } else { console.error(`Unknown or incomplete argument: ${arg}`); process.exit(2); }
}
try {
  const taskSet = loadJson(tasksFile);
  const resultSet = resultsFile ? loadJson(resultsFile) : { schemaVersion: 1, runs: [] };
  const report = buildBenchmarkReport(taskSet, resultSet);
  const text = JSON.stringify(report, null, 2) + '\n';
  if (outputFile) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, text, 'utf8');
    console.log(`P88 real-task benchmark written to ${outputFile}`);
  } else console.log(text);
} catch (error) {
  console.error(`benchmark:real-tasks: ${error.message}`);
  process.exit(2);
}
