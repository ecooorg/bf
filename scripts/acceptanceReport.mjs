#!/usr/bin/env node
/**
 * Phase 5 (p78) — lightweight acceptance summary for Navigator packages.
 * Runs fast static gates only (architecture + doc inventories + check:docs).
 * Does NOT replace full `npm run check` or live/API CI.
 *
 *   npm run acceptance:report
 *   node scripts/acceptance-report.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs');

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', env: process.env, shell: false });
  return {
    command: [cmd, ...args].join(' '),
    exitCode: r.status === null ? 1 : r.status,
    stdout: (r.stdout || '').trim(),
    stderr: (r.stderr || '').trim(),
  };
}

const steps = [
  { id: 'architecture.check', run: () => run(process.execPath, ['scripts/architectureCheckBoundaries.mjs']) },
  { id: 'docs.inventories', run: () => run(process.execPath, ['scripts/docsCheckInventories.mjs']) },
  { id: 'docs.links', run: () => run(process.execPath, ['scripts/check-docs.mjs']) },
];

const checks = [];
let failed = 0;
for (const s of steps) {
  const result = s.run();
  const status = result.exitCode === 0 ? 'PASSED' : 'FAILED';
  if (status === 'FAILED') failed += 1;
  checks.push({
    id: s.id,
    status,
    command: result.command,
    detail: status === 'FAILED' ? (result.stderr || result.stdout).slice(0, 500) : (result.stdout.split('\n').slice(-2).join(' | ')),
  });
}

const inventories = {};
for (const name of ['generated-route-inventory.json', 'generated-env-inventory.json', 'generated-migration-inventory.json']) {
  const p = path.join(root, 'docs', name);
  if (fs.existsSync(p)) {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    inventories[name] = { count: data.count };
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  phase: 5,
  patch: 'p78',
  overall: failed === 0 ? 'PASSED' : 'FAILED',
  note: 'Static gates only. Full npm run check + live/API must still pass on CI before formal acceptance.',
  checks,
  inventories,
  notRunHere: ['npm run check', 'test:live', 'test:bx06:api', 'test:ui'],
};

fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'generated-acceptance-summary.json');
fs.writeFileSync(outFile, JSON.stringify(summary, null, 2) + '\n', 'utf8');

console.log(`acceptance:report → ${path.relative(root, outFile)}`);
console.log(`overall: ${summary.overall}`);
for (const c of checks) console.log(`  ${c.status} ${c.id}`);
process.exit(failed === 0 ? 0 : 1);
