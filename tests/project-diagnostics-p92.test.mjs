import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const route = readFileSync(new URL('../server/projectRoutes.ts', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../src/ProjectMode.tsx', import.meta.url), 'utf8');
const db = readFileSync(new URL('../migrations/015_project_diagnostics.sql', import.meta.url), 'utf8');
test('diagnostic endpoints are inside project auth boundary', () => {
  assert.ok(route.indexOf("app.use('/api/projects'") < route.indexOf("app.get('/api/projects/diagnostics/operations'"));
  for (const name of ['operations', 'system', 'export']) assert.match(route, new RegExp(`/api/projects/diagnostics/${name}`));
});
test('all three More actions exist', () => {
  for (const label of ['Run system diagnostics','View recent operations','Download diagnostic logs']) assert.ok(ui.includes(label));
});
test('ZIP integrity and readback gate precede download URL', () => {
  assert.ok(route.indexOf('ZIP_INTEGRITY_CHECKED') < route.indexOf('ARTIFACT_SAVE_VERIFIED'));
  assert.ok(route.indexOf('ARTIFACT_SAVE_VERIFIED') < route.indexOf('const downloadUrl = `/api/projects/'));
});
test('database persists sanitized operation events with retention', () => {
  assert.match(db, /project_diagnostic_events/); assert.match(db, /interval '7 days'/);
  const diagnostics = readFileSync(new URL('../server/projectDiagnostics.ts', import.meta.url), 'utf8');
  assert.ok(!diagnostics.includes('prompt:')); assert.ok(!diagnostics.includes('authorization:'));
});
