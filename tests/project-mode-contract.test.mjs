/**
 * Category: project mode — entry routes, ProjectMode shell, no Lab.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('ProjectMode module is the sole Project workspace UI', () => {
  assert.ok(existsSync(path.join(root, 'src/ProjectMode.tsx')));
  const main = read('src/main.tsx');
  assert.match(main, /lazy\(\(\) => import\('\.\/ProjectMode\.tsx'\)\)/);
  assert.doesNotMatch(main, /ArchitectLab/);
});

test('project routes stay registered on the server', () => {
  const server = read('server.ts');
  assert.match(server, /registerProjectRoutes/);
});

test('builder recovery suite remains available for Project appBuilder path', () => {
  assert.ok(existsSync(path.join(root, 'tests/project-builder-recovery.test.mjs')));
});
