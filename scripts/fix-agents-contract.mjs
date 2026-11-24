#!/usr/bin/env node
/** Restore agents-contract + quality tests if truncated; require Recheck feed UI assertion. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function gitShow(relPath, sha) {
  const r = spawnSync('git', ['show', `${sha}:${relPath}`], {
    encoding: 'utf8', cwd: root, maxBuffer: 5_000_000,
  });
  if (r.status === 0 && r.stdout && r.stdout.length > 500) return r.stdout;
  return null;
}

function fixRecheckAssertion(relPath, restoreSha, minLen) {
  const path = join(root, relPath);
  let t = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (restoreSha && (t.length < minLen || !t.includes('assert.match'))) {
    const restored = gitShow(relPath, restoreSha);
    if (restored) {
      t = restored;
      console.log('Restored %s from %s (%d bytes)', relPath, restoreSha.slice(0, 8), t.length);
    } else {
      console.error('failed to restore %s from %s', relPath, restoreSha);
      process.exit(1);
    }
  }
  let next = t.replace(/assert\.match\(ui, \/Recheck list\/\);/g, 'assert.match(ui, /Recheck feed/);');
  if (next !== t) console.log('%s: Recheck list -> Recheck feed', relPath);
  const oldLog = 'assert.match(refresh, /contact searches \\${status\\.contactSearches}/);';
  const newLog = 'assert.match(refresh, /enrichSearches: status\\.contactSearches/);';
  if (next.includes(oldLog)) {
    next = next.replace(oldLog, newLog);
    console.log('%s: refresh contactSearches assertion updated', relPath);
  }
  writeFileSync(path, next);
  if (next.includes('/Recheck list/')) {
    console.error('%s still has /Recheck list/ assertion', relPath);
    process.exit(1);
  }
  if (!next.includes('Recheck feed') && relPath.includes('agents-contract')) {
    console.error('%s missing Recheck feed assertion', relPath);
    process.exit(1);
  }
  if (next.length < minLen) {
    console.error('%s still too short after restore (%d < %d)', relPath, next.length, minLen);
    process.exit(1);
  }
  console.log('%s ok (%d bytes)', relPath, next.length);
}

// agents-contract: known good SHA with P129.23a
fixRecheckAssertion('tests/agents-contract.test.mjs', '28fdc70c4f0677dce552f5b687967c6e7df679e2', 1000);
// quality: restore from last good main before accidental stub (cd50d1e)
fixRecheckAssertion('tests/immofinder-quality.test.mjs', 'cd50d1e0453b587f02b1bd6f267e427cbff3ce8e', 10000);
