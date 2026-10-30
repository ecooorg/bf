import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const lab = readFileSync(new URL('../src/ArchitectLab.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

test('Architectural Test Lab is a separately lazy-loaded route', () => {
  assert.match(main, /pathname === '\/architect-lab'/);
  assert.match(main, /lazy\(\(\) => import\('\.\/ArchitectLab\.tsx'\)\)/);
  assert.match(main, /isArchitectLab \? ArchitectLabRoot/);
  assert.doesNotMatch(main, /isArchitectLab[^;]*ProjectMode/);
});

test('lab owns its form, progress, completion surface and download action', () => {
  for (const marker of ['architect-lab-build-form', 'architect-lab-build', 'architect-lab-passport', 'architect-lab-confirm-passport', 'architect-lab-completion', 'architect-lab-download']) assert.ok(lab.includes(marker), `missing ${marker}`);
  assert.match(lab, /waitForProjectBuild/);
  assert.match(lab, /ErrorBoundary label="Architectural Test Lab"/);
  assert.match(lab, /credentials: 'same-origin'/);
});

test('lab presentation is responsive and separate from legacy ProjectMode styles', () => {
  assert.match(css, /\.architect-lab-grid/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(lab, /Legacy Architect UI is not mounted here/);
});


test('lab persists a confirmed passport before requesting a build', () => {
  assert.match(lab, /status: 'proposed'/);
  assert.match(lab, /status: 'confirmed'/);
  assert.match(lab, /expected_version: project\.state_version/);
  assert.ok(lab.indexOf('async function confirmAndBuild') < lab.indexOf('/code/build'));
});
