import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('legacy Architect safely renders staged build responses without codeTask', async () => {
  const source = await readFile(new URL('../src/ProjectMode.tsx', import.meta.url), 'utf8');
  assert.match(source, /codeTask\?\.statusReason/);
  assert.match(source, /codeTask\?\.prUrl/);
  assert.match(source, /codeTask\?\.id/);
  assert.doesNotMatch(source, /programResult\.codeTask\.(?:statusReason|prUrl|id)/);
  assert.match(source, /setProgramResult\(\{ \.\.\.r, taskId: r\.taskId \|\| r\.jobId \|\| 'build' \}\)/);
});
