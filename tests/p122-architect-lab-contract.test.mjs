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
  assert.match(main, /pathname === '\/architect'/);
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
  assert.match(lab, /Legacy Architect/);
  assert.match(lab, /architect-lab-diagnostics-menu/);
  assert.match(lab, /api\/projects\/diagnostics\/session-log/);
  assert.match(lab, /api\/projects\/diagnostics\/export/);
});


test('lab persists a confirmed passport before requesting a build', () => {
  assert.match(lab, /status: 'proposed'/);
  assert.match(lab, /status: 'confirmed'/);
  assert.match(lab, /expected_version: project\.state_version/);
  assert.ok(lab.indexOf('async function confirmAndBuild') < lab.indexOf('/code/build'));
});

test('the standard Architect entry opens Lab while the legacy workspace remains available', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /window\.location\.href = '\/architect-lab'/);
  assert.match(lab, /href="\/project"/);
});


test('Lab exposes saved project loading and browser-first generation requirements', () => {
  assert.match(lab, /architect-lab-saved-projects/);
  assert.match(lab, /\/api\/projects\?limit=100/);
  assert.match(lab, /openSavedProject/);
  assert.match(lab, /DELIVERY TARGET: Build a browser-first web application/);
  assert.match(lab, /no build step or external runtime dependency/);
});

test('Lab button labels have explicit high-contrast, focus-visible states', () => {
  assert.match(css, /\.architect-lab button\{color:#08202a;background:#68d6c2/);
  assert.match(css, /\.architect-lab button:focus-visible/);
  assert.match(css, /\.architect-lab \.architect-lab-secondary\{background:#18364b;color:#f3f8ff/);
});
