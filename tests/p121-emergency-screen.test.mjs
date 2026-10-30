import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('P121 emergency diagnostics are installed before React mount and expose fallback download', async () => {
  const main = await read('../src/main.tsx');
  const boundary = await read('../src/ErrorBoundary.tsx');
  const diagnostics = await read('../src/emergencyDiagnostics.ts');
  assert.ok(main.indexOf('installEmergencyDiagnostics()') < main.indexOf('createRoot('));
  assert.match(main, /<ErrorBoundary[\s\S]*<Root \/>[\s\S]*<\/ErrorBoundary>/);
  assert.match(boundary, /componentDidCatch\(error: Error, info: ErrorInfo\)/);
  assert.match(boundary, /Download emergency logs/);
  assert.match(diagnostics, /unhandledrejection/);
  assert.match(diagnostics, /replaceChildren\(panel\)/);
  assert.match(diagnostics, /biforge-emergency\.log/);
  assert.match(diagnostics, /MAX_ENTRIES = 120/);
});
