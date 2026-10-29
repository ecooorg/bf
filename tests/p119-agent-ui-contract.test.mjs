import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const menu = readFileSync(new URL('../src/ModeMenu.tsx', import.meta.url), 'utf8');
const uiCheck = readFileSync(new URL('./ui-check.mjs', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('P119 start screen exposes the three approved agent names', () => {
  assert.match(app, /<h2>Conversational<\/h2>/);
  assert.match(app, /<h2>Expert<\/h2>/);
  assert.match(app, /<h2>Architect<\/h2>/);
  assert.doesNotMatch(app, /<h2>Simple<\/h2>/);
  assert.doesNotMatch(app, /<h2>Project<\/h2>/);
});

test('P119 agent menu maps stable internal keys to approved display names', () => {
  assert.match(menu, /Simple: 'Conversational'/);
  assert.match(menu, /Expert: 'Expert'/);
  assert.match(menu, /Project: 'Architect'/);
  assert.match(menu, /label: 'Conversational'/);
  assert.match(menu, /label: 'Expert'/);
  assert.match(menu, /label: 'Architect'/);
  assert.match(menu, /AGENT_LABEL\[props\.current\]/);
});

test('P119 keeps Architect on its separate route and checks the three-agent menu', () => {
  assert.match(app, /window\.location\.href = '\/project'/);
  assert.match(uiCheck, /Agent menu lists three agents/);
  assert.match(uiCheck, /menuitemradio', \{ name: \/Conversational/);
});

test('package patch metadata is internally consistent', () => {
  assert.ok(pkg.patch.startsWith(`${pkg.version}.`));
  assert.ok(pkg.scripts['test:core'].includes('tests/p119-agent-ui-contract.test.mjs'));
});
