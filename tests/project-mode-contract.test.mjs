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


test('P127.7 exposes project-scoped artifact inventory, immutable versions and inspection', () => {
  const routes = read('server/projectRoutes.ts');
  const repo = read('server/artifactRepository.ts');
  const ui = read('src/ProjectMode.tsx');
  assert.match(routes, /api\/projects\/:projectId\/artifact-versions/);
  assert.match(routes, /api\/projects\/:projectId\/artifacts\/:artifactId\/inspect/);
  assert.match(routes, /readArtifactBytes\(req\.params\.artifactId, requestedVersion\)/);
  assert.match(repo, /export async function listProjectArtifactVersions/);
  assert.match(repo, /m\.project_id, a\.filename/);
  assert.match(routes, /meta\.project_id !== project\.id/);
  assert.match(ui, /All immutable versions/);
  assert.match(ui, /inspectProjectArtifact/);
});

test('P127.11 package metadata advances product patch without changing major version', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.version, '127');
  assert.equal(pkg.patch, '127.12');
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(lock.version, '127');
  assert.equal(lock.patch, '127.12');
});

test('P127.12 ProjectMode wires continue and source ZIP upload', () => {
  const ui = read('src/ProjectMode.tsx');
  const routes = read('server/projectRoutes.ts');
  assert.match(routes, /\/api\/projects\/:projectId\/code\/continue/);
  assert.match(routes, /\/api\/projects\/:projectId\/artifacts\/upload/);
  assert.match(routes, /createdBy: 'user_upload'/);
  assert.match(ui, /code\/continue/);
  assert.match(ui, /artifacts\/upload/);
  assert.match(ui, /data-testid="project-continue-panel"/);
  assert.match(ui, /data-testid="project-continue-submit"/);
  assert.match(ui, /Improve this program/);
  assert.match(ui, /uploadSourceZip/);
});

test('P127.12 static ZIP usage instructions avoid forced Render deploy', () => {
  const src = read('src/projectAppBuilder.ts');
  assert.match(src, /Open `index\.html` in a browser/);
  assert.match(src, /Improve this program/);
  assert.doesNotMatch(src, /looksStatic[\s\S]{0,200}Render or Railway: create a Web Service/);
});
