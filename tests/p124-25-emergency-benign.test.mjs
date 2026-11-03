/** P124.25 — a deferred ResizeObserver notification must not replace the UI with the emergency screen. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isBenignBrowserNotice } from '../src/emergencyDiagnostics.ts';

test('ResizeObserver loop notices are benign', () => {
  for (const m of ['ResizeObserver loop completed with undelivered notifications.', 'Error: ResizeObserver loop completed with undelivered notifications.', 'Uncaught Error: ResizeObserver loop limit exceeded', 'ResizeObserver loop limit exceeded'])
    assert.equal(isBenignBrowserNotice(m), true, m);
});

test('real failures are not benign', () => {
  for (const m of ["Cannot read properties of undefined (reading 'x')", 'Script error.', 'Loading chunk 5 failed', 'ResizeObserver is not defined', '', undefined, null])
    assert.equal(isBenignBrowserNotice(m), false, String(m));
});

test('handler skips benign notices before recording or showing the emergency screen; real errors still show it', () => {
  const src = readFileSync(new URL('../src/emergencyDiagnostics.ts', import.meta.url), 'utf8');
  const handler = src.slice(src.indexOf("window.addEventListener('error'"), src.indexOf("window.addEventListener('unhandledrejection'"));
  assert.ok(handler.indexOf('isBenignBrowserNotice') < handler.indexOf('recordEmergencyError('));
  assert.ok(handler.indexOf('isBenignBrowserNotice') < handler.indexOf('showEmergencyScreen()'));
  assert.match(handler, /showEmergencyScreen\(\)/);
  assert.match(src, /window\.addEventListener\('unhandledrejection'[\s\S]*showEmergencyScreen\(\)/);
});
