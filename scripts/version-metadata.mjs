#!/usr/bin/env node
/** Synchronize only npm root version metadata; never rewrite historical records. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const args = process.argv.slice(2);
const write = args.includes('--write');
const rootFlag = args.indexOf('--root');
if (args.some((arg, i) => !['--write', '--root'].includes(arg) && i !== rootFlag + 1) ||
    (rootFlag >= 0 && !args[rootFlag + 1])) {
  console.error('Usage: node scripts/version-metadata.mjs [--write] [--root DIRECTORY]');
  process.exit(2);
}
const root = resolve(rootFlag >= 0 ? args[rootFlag + 1] : '.');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const lockPath = join(root, 'package-lock.json');
const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const version = String(pkg.version ?? '');
const patch = String(pkg.patch ?? '');
if (!/^\d+$/.test(version) || !/^\d+\.\d+\.\d+$/.test(patch) || patch.split('.')[0] !== version) {
  console.error(`version: FAIL: invalid version/patch pair (${version}, ${patch})`);
  process.exit(1);
}
if (!lock.packages?.['']) {
  console.error('version: FAIL: package-lock.json has no root package metadata');
  process.exit(1);
}
if (pkg.name !== lock.name || pkg.name !== lock.packages[''].name) {
  console.error('version: FAIL: package names disagree; refusing automatic repair');
  process.exit(1);
}
const mismatch = lock.version !== version || lock.packages[''].version !== version;
if (mismatch && write) {
  lock.version = version;
  lock.packages[''].version = version;
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
}
if (mismatch && !write) {
  console.error(`version: FAIL: package-lock root versions must equal package.json version ${version}; run npm run version:sync`);
  process.exit(1);
}
console.log(`version: PASS (${version}; patch ${patch}${mismatch ? '; lock metadata synchronized' : ''})`);
