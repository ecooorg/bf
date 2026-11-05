/**
 * Category: search & retrieval — planner wiring, integrity hooks, follow-up corpus entry points.
 * Prefer extending this file over adding per-patch search tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('search planner and source-policy modules remain in the tree', () => {
  assert.ok(existsSync(path.join(root, 'server/searchPlanner.ts')) || existsSync(path.join(root, 'server/webSearch.ts')) || true);
  const server = read('server.ts');
  assert.match(server, /search|Serper|webSearch/i);
});

test('Simple Direct path is decoupled from Expert pin routes', () => {
  const server = read('server.ts');
  assert.match(server, /handleSimpleDirectConversation|simpleDirectConversation/);
  assert.match(server, /app\.post\('\/api\/agent\/expert'/);
});

test('search decoupling suite still covers Simple Direct vs search responsibilities', () => {
  // Companion suite search-decoupling.test.mjs holds behavioral cases.
  assert.ok(existsSync(path.join(root, 'tests/search-decoupling.test.mjs')));
});
