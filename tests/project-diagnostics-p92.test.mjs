import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const route = readFileSync(new URL('../server/projectRoutes.ts', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../src/ProjectMode.tsx', import.meta.url), 'utf8');
const db = readFileSync(new URL('../migrations/015_project_diagnostics.sql', import.meta.url), 'utf8');
test('ZIP integrity and readback gate precede download URL', () => {
  assert.ok(route.indexOf('ZIP_INTEGRITY_CHECKED') < route.indexOf('ARTIFACT_SAVE_VERIFIED'));
  assert.ok(route.indexOf('ARTIFACT_SAVE_VERIFIED') < route.indexOf('const downloadUrl = `/api/projects/'));
});
test('database persists sanitized operation events with retention', () => {
  assert.match(db, /project_diagnostic_events/); assert.match(db, /interval '7 days'/);
  const diagnostics = readFileSync(new URL('../server/projectDiagnostics.ts', import.meta.url), 'utf8');
  assert.ok(!diagnostics.includes('prompt:')); assert.ok(!diagnostics.includes('authorization:'));
});

test('paste-ready session log is exposed without creating an archive and omits user content', () => {
  const diagnostics = readFileSync(new URL('../server/projectDiagnostics.ts', import.meta.url), 'utf8');
  assert.match(route, /diagnostics\/session-log/);
  assert.match(diagnostics, /BIFORGE COMPACT SESSION LOG/);
  assert.match(diagnostics, /NO_MATCHING_OPERATION_EVENTS/);
  assert.match(ui, /Copy compact session log/);
  assert.match(ui, /Copy log/);
  assert.match(ui, /Compact session log text/);
  assert.match(diagnostics, /request\/response bodies, prompts, generated source/);
});

test('black-screen diagnostics capture bounded browser state without page content', () => {
  const diagnostics = readFileSync(new URL('../server/projectDiagnostics.ts', import.meta.url), 'utf8');
  assert.match(route, /diagnostics\/client-events/);
  assert.match(route, /events\.slice\(-40\)/);
  assert.match(diagnostics, /BROWSER_AFTER_SCREEN_STATE/);
  assert.match(diagnostics, /RECENT_HTTP_REQUESTS/);
  assert.match(ui, /window_error/);
  assert.match(ui, /unhandled_rejection/);
  assert.match(ui, /post_mount_5s/);
  assert.match(ui, /textLength=/);
  assert.doesNotMatch(ui, /textContent\s*\}\s*,\s*html/);
});
