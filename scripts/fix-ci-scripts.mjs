#!/usr/bin/env node
/** Restore critical npm scripts missing from truncated package.json; sync REPAIR_RULES_VERSION. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const scripts = pkg.scripts || (pkg.scripts = {});

const required = {
  'docs:integrity': 'node scripts/docs-integrity.mjs && node scripts/docs-reference-integrity.mjs && node scripts/docs-env-example-check.mjs && node scripts/scripts-integrity.mjs',
  'test:models': 'MODEL_MIN_INTERVAL_MS=0 node --import tsx --test --test-timeout=60000 tests/providers-models.test.mjs',
  'docs:check': 'node scripts/docsCheckInventories.mjs',
  'docs:generate': 'node scripts/docsGenerateInventories.mjs',
  'check': scripts.check || 'node scripts/run-dag.mjs --profile check',
  'version:sync': scripts['version:sync'] || 'node scripts/sync-version.mjs',
  'version:check': scripts['version:check'] || 'node scripts/sync-version.mjs --check',
  'test:app-builder': 'MODEL_MIN_INTERVAL_MS=0 node --import tsx --test --test-timeout=60000 tests/project-builder-recovery.test.mjs tests/project-user-value-live.test.mjs',
};

let changed = false;
for (const [k, v] of Object.entries(required)) {
  if (scripts[k] !== v) { scripts[k] = v; changed = true; console.log('script', k); }
}
if (pkg.patch !== '130.11') { pkg.patch = '130.11'; changed = true; }
if (changed) {
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('package.json scripts restored');
} else {
  console.log('package.json scripts ok');
}

const repairPath = join(root, 'server/immofinderRepair.ts');
const want = `${pkg.patch}.5`;
let rt = readFileSync(repairPath, 'utf8');
const next = rt.replace(/export const REPAIR_RULES_VERSION = '[^']+';/, `export const REPAIR_RULES_VERSION = '${want}';`);
if (next !== rt) {
  writeFileSync(repairPath, next);
  console.log('REPAIR_RULES_VERSION ->', want);
} else if (!rt.includes(`'${want}'`)) {
  console.error('could not set REPAIR_RULES_VERSION');
  process.exit(1);
} else {
  console.log('REPAIR_RULES_VERSION already', want);
}
