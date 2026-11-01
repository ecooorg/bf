import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inventoryPath = path.join(root, 'docs/C124_INSTRUCTION_INVENTORY.md');
const inventory = fs.readFileSync(inventoryPath, 'utf8');

const refs = [...inventory.matchAll(/`([A-Za-z0-9_./-]+\.(?:ts|mjs)):L(\d+)(?:-L(\d+))?`/g)]
  .map(([, file, start, end]) => ({ file, start: Number(start), end: Number(end || start) }));

test('C124 inventory contains a substantive source map', () => {
  assert.ok(refs.length >= 35, `expected at least 35 source/line references, found ${refs.length}`);
  const uniqueFiles = new Set(refs.map((x) => x.file));
  for (const required of [
    'server/promptPacks.ts',
    'server/reasoningState.ts',
    'server.ts',
    'server/expertAgent.ts',
    'server/webSearch.ts',
    'server/contextBuilder.ts',
    'appBuilder/core-prompts.ts',
    'appBuilder/core-engine.ts',
  ]) assert.ok(uniqueFiles.has(required), `inventory missing ${required}`);
});

test('every C124 inventory source and line range resolves in this checkout', () => {
  const failures = [];
  for (const ref of refs) {
    const full = path.join(root, ref.file);
    if (!fs.existsSync(full)) { failures.push(`${ref.file}: file missing`); continue; }
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/).length;
    if (ref.start < 1 || ref.end < ref.start || ref.end > lines) {
      failures.push(`${ref.file}:L${ref.start}-L${ref.end} outside 1-${lines}`);
    }
  }
  assert.deepEqual(failures, [], failures.join('\n'));
});
