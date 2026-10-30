/**
 * C121 — Governance: hard gates in AGENTS.md (ZIP purity, Navigator channel, automate-first, UI/e2e gate)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const agents = readFileSync(new URL('../AGENTS.md', import.meta.url), 'utf8');
const decisions = readFileSync(new URL('../docs/DECISIONS.md', import.meta.url), 'utf8');
const testing = readFileSync(new URL('../docs/TESTING_AND_ACCEPTANCE.md', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('AGENTS.md opens with hard gates before delivery narrative', () => {
  const hard = agents.indexOf('## 0. Hard gates');
  const delivery = agents.indexOf('## 7. Delivery checklist');
  assert.ok(hard >= 0, 'section 0 Hard gates required');
  assert.ok(delivery > hard, 'delivery checklist must follow hard gates');
  assert.match(agents, /fail closed/);
  assert.match(agents, /Invalid excuses/);
});

test('G1 patch ZIP purity is mandatory and forbids helpers', () => {
  assert.match(agents, /G1 — Patch ZIP purity/);
  assert.match(agents, /MUST NOT[\s\S]{0,200}PATCH_SUMMARY/);
  assert.match(agents, /session diff only|content-changed in this delivery/i);
  assert.match(agents, /unzip -l/);
});

test('G2 Navigator is Android tablet / GitHub web only', () => {
  assert.match(agents, /G2 — Navigator channel/);
  assert.match(agents, /Android tablet/);
  assert.match(agents, /FOR_NAVIGATOR/);
  assert.match(agents, /MUST NOT[\s\S]{0,120}local terminal/);
});

test('G3 automate tests and workflows', () => {
  assert.match(agents, /G3 — Automate when possible/);
  assert.match(agents, /\.github\/workflows/);
});

test('G4 UI flow and browser tests same delivery', () => {
  assert.match(agents, /G4 — UI flow and browser tests/);
  assert.match(agents, /same delivery/);
  assert.match(agents, /data-testid/);
});

test('G5 evidence honesty', () => {
  assert.match(agents, /G5 — Evidence honesty/);
  assert.match(agents, /NOT_RUN/);
});

test('Active decision D-2026-10-30-07 still records Navigator rules', () => {
  assert.match(decisions, /D-2026-10-30-07/);
  assert.match(decisions, /Patch ZIP purity/);
  assert.match(testing, /Navigator verification channel/);
});

test('governance test remains on test:core', () => {
  assert.ok(pkg.scripts['test:core'].includes('p121-navigator-protocol.test.mjs'));
});
