import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { recordApplicationLog, capturedApplicationLogs, diagnosticArchive, verifyDiagnosticArchive, REQUIRED_DIAGNOSTIC_ENTRIES, requestDiagnosticsMiddleware } from '../server/projectDiagnostics.ts';

 test('structured diagnostics are bounded and redact sensitive detail keys', async () => {
  const before = capturedApplicationLogs().length;
  await recordApplicationLog({ level: 'error', component: 'test', event: 'redaction-check', message: 'safe diagnostic message; prompt: \"do not store this\"', details: { model: 'gemini-lite', prompt: 'must-not-be-recorded', authorization: 'secret-header', durationMs: 12 } });
  const found = capturedApplicationLogs().slice(before).find((x) => x.event === 'redaction-check');
  assert.ok(found);
  assert.match(found.message, /safe diagnostic message/); assert.ok(!found.message.includes('do not store this'));
  assert.equal(found.details.prompt, '[OMITTED]');
  assert.equal(found.details.authorization, '[OMITTED]');
  assert.equal(found.details.durationMs, 12);
});

test('request middleware correlates requests and never includes query strings', async () => {
  let finish;
  const headers = {};
  const req = { headers: { 'x-request-id': 'p937-test-id' }, method: 'GET', path: '/api/test?token=secret' };
  const res = { statusCode: 200, setHeader: (k, v) => { headers[k] = v; }, getHeader: () => undefined, on: (event, cb) => { if (event === 'finish') finish = cb; } };
  requestDiagnosticsMiddleware(req, res, () => {});
  assert.equal(headers['x-request-id'], 'p937-test-id');
  finish();
  const item = capturedApplicationLogs().find((x) => x.event === 'request_complete' && x.requestId === 'p937-test-id');
  assert.ok(item); assert.equal(item.details.path, '/api/test'); assert.ok(!JSON.stringify(item).includes('token=secret'));
});

test('diagnostic export includes structured application logs and verifies its manifest', async () => {
  await recordApplicationLog({ level: 'info', component: 'test', event: 'archive-check', message: 'diagnostic archive event', details: { case: 'P93.7' } });
  const bytes = await diagnosticArchive('p937-test');
  assert.deepEqual(await verifyDiagnosticArchive(bytes), []);
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  for (const name of REQUIRED_DIAGNOSTIC_ENTRIES) assert.ok(zip.file(name), name);
  const rows = (await zip.file('logs/application-detail.jsonl').async('string')).trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
  assert.ok(rows.some((row) => row.event === 'archive-check'));
});

test('bounded AI test harness has a hard sub-10-minute budget and never installs packages', () => {
  const runner = readFileSync(new URL('../scripts/ai-test-harness-p93-7.mjs', import.meta.url), 'utf8');
  assert.match(runner, /570_000/); assert.doesNotMatch(runner, /npm ci|npm install|playwright install/);
  assert.match(runner, /BLOCKED/); assert.match(runner, /BIFORGE_TEST_REPORT/);
});
