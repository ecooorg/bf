#!/usr/bin/env node
/** Restore tests/agents-contract.test.mjs if emptied; require Recheck feed UI assertion in contract + quality tests. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function fixRecheckAssertion(relPath, restoreSha) {
  const path = join(root, relPath);
  let t = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (restoreSha && (t.length < 500 || !t.includes('assert.match'))) {
    const r = spawnSync('git', ['show', `${restoreSha}:${relPath}`], {
      encoding: 'utf8', cwd: root, maxBuffer: 5_000_000,
    });
    if (r.status === 0 && r.stdout && r.stdout.length > 500) {
      t = r.stdout;
      console.log('Restored %s from %s (%d bytes)', relPath, restoreSha.slice(0, 8), t.length);
    }
  }
  const next = t.replace(/assert\.match\(ui, \/Recheck list\/\);/g, 'assert.match(ui, /Recheck feed/);');
  if (next !== t) console.log('%s: Recheck list -> Recheck feed', relPath);
  writeFileSync(path, next);
  if (next.includes('/Recheck list/')) {
    console.error('%s still has /Recheck list/ assertion', relPath);
    process.exit(1);
  }
  if (!next.includes('Recheck feed') && relPath.includes('agents-contract')) {
    console.error('%s missing Recheck feed assertion', relPath);
    process.exit(1);
  }
  console.log('%s ok (%d bytes)', relPath, next.length);
}

fixRecheckAssertion('tests/agents-contract.test.mjs', '28fdc70c4f0677dce552f5b687967c6e7df679e2');
fixRecheckAssertion('tests/immofinder-quality.test.mjs', null);
