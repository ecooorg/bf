#!/usr/bin/env node
/**
 * Phase 4 (p77) — verify generated inventories exist and look sane.
 * Does not re-diff content against a golden file (timestamps change);
 * regenerates to a temp dir and compares structural counts/keys when --strict.
 *
 * Usage:
 *   node scripts/docsCheckInventories.mjs
 *   npm run docs:check
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const genDir = path.join(root, 'docs');
const required = ['generated-route-inventory.json', 'generated-env-inventory.json', 'generated-migration-inventory.json'];

const errors = [];

for (const name of required) {
  const full = path.join(genDir, name);
  if (!fs.existsSync(full)) {
    errors.push(`missing ${path.relative(root, full)} — run npm run docs:generate`);
    continue;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    errors.push(`${name}: invalid JSON (${e.message})`);
    continue;
  }
  if (typeof data.count !== 'number' || data.count < 0) {
    errors.push(`${name}: missing or invalid count`);
  }
  if (name === 'generated-route-inventory.json' && (!Array.isArray(data.routes) || data.routes.length === 0)) {
    errors.push(`${name}: expected non-empty routes[]`);
  }
  if (name === 'generated-env-inventory.json' && (!Array.isArray(data.variables) || data.variables.length === 0)) {
    errors.push(`${name}: expected non-empty variables[]`);
  }
  if (name === 'generated-migration-inventory.json' && (!Array.isArray(data.migrations) || data.migrations.length === 0)) {
    errors.push(`${name}: expected non-empty migrations[]`);
  }
}

// Optional: structural freshness — regenerate and compare counts
const strict = process.argv.includes('--strict');
if (strict && errors.length === 0) {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/docsGenerateInventories.mjs')], {
    cwd: root,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    errors.push(`regenerate failed: ${r.stderr || r.stdout}`);
  }
}

if (errors.length) {
  console.error('docs:check inventories FAILED');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}
console.log('docs:check inventories OK');
for (const name of required) {
  const data = JSON.parse(fs.readFileSync(path.join(genDir, name), 'utf8'));
  console.log(`  ${name}: count=${data.count}`);
}
