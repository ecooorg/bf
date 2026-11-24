#!/usr/bin/env node
/** Restore tests/agents-contract.test.mjs if emptied; require Recheck feed UI assertion. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'tests/agents-contract.test.mjs');
let t = existsSync(path) ? readFileSync(path, 'utf8') : '';
if (t.length < 1000 || !t.includes('P129.23a')) {
  const r = spawnSync('git', ['show', '28fdc70c4f0677dce552f5b687967c6e7df679e2:tests/agents-contract.test.mjs'], {
    encoding: 'utf8', cwd: root, maxBuffer: 5_000_000,
  });
  if (r.status !== 0 || !r.stdout || r.stdout.length < 1000) {
    console.error('failed to restore agents-contract.test.mjs', r.stderr || r.status);
    process.exit(1);
  }
  t = r.stdout;
  console.log('Restored tests/agents-contract.test.mjs from 28fdc70c (%d bytes)', t.length);
}
const next = t.replace(/assert\.match\(ui, \/Recheck list\/\);/g, 'assert.match(ui, /Recheck feed/);');
if (next !== t) console.log('agents-contract: Recheck list -> Recheck feed');
writeFileSync(path, next);
if (!next.includes('Recheck feed') || next.includes('/Recheck list/')) {
  console.error('agents-contract still references Recheck list or missing Recheck feed');
  process.exit(1);
}
console.log('agents-contract.test.mjs ok (%d bytes)', next.length);
