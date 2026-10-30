import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const workflow = readFileSync(new URL('.github/workflows/quick-diagnostics.yml', root), 'utf8');
const collector = readFileSync(new URL('scripts/quick-diagnostics.mjs', root), 'utf8');
const boundaryTests = readFileSync(new URL('tests/p119-agent-boundaries.test.mjs', root), 'utf8');

test('Quick Diagnostics uploads exactly one consolidated error report', () => {
  assert.match(workflow, /path:\s*artifacts\/quick-diagnostics\/ERROR_SUMMARY\.txt/);
  assert.doesNotMatch(workflow, /CI_ERROR_SUMMARY|UI_ERROR_SUMMARY/);
  assert.match(workflow, /path:\s*artifacts\/quick-diagnostics\/ERROR_SUMMARY\.txt/);
  assert.match(workflow, /if:\s*always\(\)/);
  assert.match(boundaryTests, /quick-diagnostics\.yml/, 'the approved workflow must remain in the exact inventory allowlist');
});

test('single report separates all focused diagnostic areas and preserves failures', () => {
  for (const section of ['DEPENDENCY INSTALL', 'TYPECHECK', 'ARCHITECTURAL TEST LAB CONTRACT', 'ARCHITECTURAL TEST LAB BROWSER / UI', 'BROWSER INSTALL', 'OVERALL']) {
    assert.ok(collector.includes(section), `missing report section: ${section}`);
  }
  assert.match(collector, /No matching error lines were captured/);
  assert.match(collector, /failedSections=/);
  assert.match(readFileSync(new URL('tests/p122-architect-lab-e2e.test.mjs', root), 'utf8'), /pageerror/);
  assert.match(readFileSync(new URL('tests/p122-architect-lab-e2e.test.mjs', root), 'utf8'), /requestfailed/);
});
