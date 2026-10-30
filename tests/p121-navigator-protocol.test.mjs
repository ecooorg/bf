/**
 * C121 — Governance: Navigator channel, clean patch ZIP rules, automate-first
 * Asserts binding protocol text remains in AGENTS.md (and decision pointer).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const agents = readFileSync(new URL('../AGENTS.md', import.meta.url), 'utf8');
const decisions = readFileSync(new URL('../docs/DECISIONS.md', import.meta.url), 'utf8');
const testing = readFileSync(new URL('../docs/TESTING_AND_ACCEPTANCE.md', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('AGENTS.md defines mandatory clean patch-ZIP rule (no auxiliary files)', () => {
  assert.match(agents, /Patch archive contents/);
  assert.match(agents, /Forbidden inside the ZIP/);
  assert.match(agents, /PATCH_SUMMARY/);
  assert.match(agents, /never added to the archive|chat only/i);
  assert.match(agents, /exact repository-relative path/);
});

test('AGENTS.md defines Navigator as Android tablet / GitHub web only', () => {
  assert.match(agents, /Android tablet/);
  assert.match(agents, /GitHub website|GitHub web/i);
  assert.match(agents, /no.*local terminal|no local terminal/i);
  assert.doesNotMatch(
    agents.slice(agents.indexOf('### 7.2'), agents.indexOf('### 7.3')),
    /Navigator must run npm /i,
  );
});

test('AGENTS.md requires automatic tests and workflows where possible', () => {
  assert.match(agents, /Automatic tests and workflows/);
  assert.match(agents, /\.github\/workflows/);
  assert.match(agents, /tests\//);
});

test('Active decision D-2026-10-30-07 records the three Navigator rules', () => {
  assert.match(decisions, /D-2026-10-30-07/);
  assert.match(decisions, /Patch ZIP purity/);
  assert.match(decisions, /Navigator environment/);
  assert.match(decisions, /Automate first/);
});

test('TESTING_AND_ACCEPTANCE documents Navigator verification channel', () => {
  assert.match(testing, /Navigator verification channel/);
  assert.match(testing, /GitHub Actions/);
});

test('governance test is wired into test:core for C121', () => {
  assert.ok(
    pkg.scripts['test:core'].includes('p121-navigator-protocol.test.mjs') ||
      pkg.scripts['test:core'].includes('p121-cycle-governance.test.mjs'),
    'test:core should include C121 governance tests',
  );
});
