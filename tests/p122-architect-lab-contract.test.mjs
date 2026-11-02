import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const lab = readFileSync(new URL('../src/ArchitectLab.tsx', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../src/ArchitectShellHeader.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const engine = readFileSync(new URL('../appBuilder/core-engine.ts', import.meta.url), 'utf8');

test('Architectural Test Lab is a separately lazy-loaded route', () => {
  assert.match(main, /pathname === '\/architect-lab'/);
  assert.match(main, /lazy\(\(\) => import\('\.\/ArchitectLab\.tsx'\)\)/);
  assert.match(main, /const Root = isArchitectLab \? ArchitectLabRoot : isProject \? ProjectRoot : App/);
  assert.match(main, /'\/project-legacy'/);
  assert.match(main, /'\/project'/);
  assert.doesNotMatch(main, /const isArchitectLab = .*'\/architect'\/\//);
  assert.match(main, /'\/architect'/);
});

test('lab owns its form, progress, completion surface and download action', () => {
  for (const marker of ['architect-lab-build-form', 'architect-lab-build', 'architect-lab-passport', 'architect-lab-confirm-passport', 'architect-lab-completion', 'architect-lab-download']) assert.ok(lab.includes(marker), `missing ${marker}`);
  assert.match(lab, /waitForProjectBuild/);
  assert.match(lab, /architect-lab-build-progress/);
  assert.match(lab, /callsUsed/);
  assert.match(lab, /Elapsed/);
  assert.match(lab, /ErrorBoundary label="Architectural Test Lab"/);
  assert.match(lab, /credentials: 'same-origin'/);
});

test('lab uses the shared Architect shell header (ModeMenu + Drive + More)', () => {
  assert.match(lab, /ArchitectShellHeader/);
  assert.match(shell, /ModeMenu/);
  assert.match(shell, /mode-menu-button|data-testid="architect-shell-header"/);
  assert.match(shell, /architect-shell-drive/);
  assert.match(shell, /architect-shell-more/);
  assert.match(shell, /User guide/);
  assert.match(css, /\.architect-lab-grid/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(lab, /api\/projects\/diagnostics\/session-log/);
  assert.match(lab, /api\/projects\/diagnostics\/export/);
});

test('lab persists a confirmed passport before requesting a build', () => {
  assert.match(lab, /status: 'proposed'/);
  assert.match(lab, /status: 'confirmed'/);
  assert.match(lab, /expected_version: project\.state_version/);
  assert.ok(lab.indexOf('async function confirmAndBuild') < lab.indexOf('/code/build'));
});

test('the standard Architect entry opens ProjectMode and the Lab remains frozen for diagnostics', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /window\.location\.href = '\/project'/);
  assert.match(shell, /href="\/project"/);
  assert.match(main, /ErrorBoundary label=\{isArchitectLab \? 'Architectural Test Lab \(frozen\)'/);
});

test('engine repairs js-syntax failures with deterministic fix and bounded model call', () => {
  assert.match(engine, /js_syntax_repair/);
  assert.match(engine, /applyDeterministicJsFixes/);
  assert.match(engine, /toString\(36\)\.substr/);
});

test('legacy build entry keeps visible model-call and file progress', () => {
  const projectMode = readFileSync(new URL('../src/ProjectMode.tsx', import.meta.url), 'utf8');
  const wizard = readFileSync(new URL('../src/ProjectNoviceWizard.tsx', import.meta.url), 'utf8');
  assert.match(projectMode, /busyLabel=\{buildProgress/);
  assert.match(projectMode, /callsUsed/);
  assert.match(projectMode, /units\?\.filter/);
  assert.match(wizard, /busyLabel \|\| 'Working…'/);
});


test('Simple and Expert More menu exposes the shared authenticated diagnostic log', () => {
  const header = readFileSync(new URL('../src/AppHeader.tsx', import.meta.url), 'utf8');
  const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(header, /Diagnostic log/);
  assert.match(header, /api\/diagnostics\/session-log/);
  assert.match(header, /Copy log/);
  assert.match(server, /app\.get\('\/api\/diagnostics\/session-log'/);
  assert.ok(server.indexOf('app.use((req, res, next) =>') < server.indexOf("app.get('/api/diagnostics/session-log'"), 'diagnostics route must remain behind global API authentication');
});

test('compact session log exposes response-pipeline fidelity metadata without response bodies', () => {
  const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  const diagnostics = readFileSync(new URL('../server/projectDiagnostics.ts', import.meta.url), 'utf8');
  for (const marker of ['modelReplyChars', 'visibleReplyChars', 'replyChangedBySanitization', 'searchStatus', 'errorCode']) assert.ok(server.includes(marker), `missing telemetry marker ${marker}`);
  assert.match(diagnostics, /RECENT_CONVERSATION_PIPELINE/);
  assert.match(diagnostics, /RECENT_CONVERSATION_HTTP_REQUESTS/);
});
