import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('mode transitions create a fresh Decision and retain the previous session', () => {
  assert.match(app, /previousMode && previousMode !== mode/);
  assert.match(app, /const isolated = emptyDecision\(\);[\s\S]{0,180}setDecisions\(\(prev\) => \[isolated, \.\.\.prev\]\)/);
  assert.match(app, /function resetStartMode\(\)[\s\S]{0,500}setDecisions\(\(prev\) => \[isolated, \.\.\.prev\]\)/);
  assert.match(app, /setActiveId\(isolated\.id\)/);
});

test('Expert initialization is independent of Simple-mode history', () => {
  const route = server.slice(server.indexOf("app.post('/api/understand'"), server.indexOf("app.post('/api/", server.indexOf("app.post('/api/understand'") + 15));
  assert.match(route, /independent Expert session/i);
  assert.match(route, /Do NOT import, refer to, or assume any Simple-mode conversation/i);
  assert.doesNotMatch(route, /already had a conversation in Simple mode/i);
});

test('patch metadata remains in cycle 123', () => {
  assert.equal(pkg.version, '123');
  assert.equal(pkg.patch, '123.18');
});
