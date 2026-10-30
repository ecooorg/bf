import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const workflow = readFileSync(new URL('.github/workflows/quick-diagnostics.yml', root), 'utf8');
const collector = readFileSync(new URL('scripts/quick-diagnostics.mjs', root), 'utf8');
const boundaryTests = readFileSync(new URL('tests/p119-agent-boundaries.test.mjs', root), 'utf8');
const dagRunner = readFileSync(new URL('scripts/run-dag.mjs', root), 'utf8');
const labBrowser = readFileSync(new URL('tests/p122-architect-lab-e2e.test.mjs', root), 'utf8');

test('Quick Diagnostics uploads exactly one consolidated error report', () => {
  assert.match(workflow, /path:\s*artifacts\/quick-diagnostics\/ERROR_SUMMARY\.txt/);
  assert.doesNotMatch(workflow, /CI_ERROR_SUMMARY|UI_ERROR_SUMMARY/);
  assert.match(workflow, /path:\s*artifacts\/quick-diagnostics\/ERROR_SUMMARY\.txt/);
  assert.match(workflow, /if:\s*always\(\)/);
  assert.match(boundaryTests, /quick-diagnostics\.yml/, 'the approved workflow must remain in the exact inventory allowlist');
  assert.match(boundaryTests, /neon-initialize\.yml/, 'the approved Neon initializer must remain in the exact inventory allowlist');
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


test('diagnostic and DAG child processes stream live output to GitHub Actions', () => {
  assert.match(workflow, /npm\s+ci/, 'dependency installation must use npm ci');
  assert.match(workflow, /quick-npm-ci\.log/, 'dependency output must be captured in the diagnostic log');
  assert.match(workflow, /\|\s*tee\s+"\$RUNNER_TEMP\/quick-npm-ci\.log"/, 'dependency output must stream through tee');
  assert.match(workflow, /playwright\s+install/, 'the browser install command must remain present');
  assert.match(workflow, /quick-browser-install\.log/, 'browser installation output must be captured');
  assert.match(workflow, /\|\s*tee\s+"\$RUNNER_TEMP\/quick-browser-install\.log"/, 'browser output must stream through tee');
  assert.match(collector, /import \{ spawn \} from 'node:child_process'/);
  assert.match(collector, /process\.stdout/);
  assert.match(collector, /process\.stderr/);
  assert.match(collector, /child\.stdout\.on\('data'/);
  assert.match(collector, /child\.stderr\.on\('data'/);
  assert.doesNotMatch(collector, /spawnSync/);
  assert.match(dagRunner, /process\.stdout\.write\(concurrency === 1 \?/);
  assert.doesNotMatch(dagRunner, /if \(concurrency === 1\) process\.stdout\.write/);
});

test('isolated Lab browser server does not enable legacy Project Mode database startup', () => {
  assert.match(labBrowser, /ENABLE_PROJECT_MODE: 'false'/);
  assert.match(labBrowser, /DATABASE_URL: ''/, 'the fixture must explicitly prevent inheriting a live database URL');
});
