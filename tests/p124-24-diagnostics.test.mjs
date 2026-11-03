/** P124.24 — conversation diagnostic log, configuration snapshot (secret rule), build stamp, restart reasons. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configSnapshot, unusedEnvNames, buildStampStatus, formatConfigLines } from "../server/diagnosticsConfig.ts";
import { classifyPreviousShutdown, startLifecycle, readLifecycle, memoryLimitMb } from '../server/processLifecycle.ts';

const SECRET = 'AIzaSyDUMMY_secret_value_1234567890abcdef';

test('snapshot: non-secret values in full, secrets only as set/length/short fingerprint', () => {
  const env = { ENABLE_WEB_SEARCH: 'true', WEB_SEARCH_MAX_QUERIES: '5', GEMINI_API_KEY: SECRET, GEMINI_API_KEY_3: 'x'.repeat(10), DATABASE_URL: 'postgres://user:pw@host/db', PATH: '/usr/bin', SOME_URL: 'https://u:p@example.com/x' };
  const snap = configSnapshot(env);
  const by = Object.fromEntries(snap.map((e) => [e.name, e]));
  assert.equal(by.ENABLE_WEB_SEARCH.value, 'true');
  assert.equal(by.WEB_SEARCH_MAX_QUERIES.value, '5');
  assert.ok(!('PATH' in by));
  for (const n of ['GEMINI_API_KEY', 'GEMINI_API_KEY_3', 'DATABASE_URL', 'SOME_URL']) { assert.equal(by[n].secret, true, n); assert.equal(by[n].value, undefined); assert.match(by[n].sha256, /^[0-9a-f]{8}$/); }
  assert.equal(by.GEMINI_API_KEY.length, SECRET.length);
  const text = formatConfigLines(snap).join('\n');
  for (const frag of [SECRET, SECRET.slice(0, 8), SECRET.slice(-6), 'user:pw', 'u:p@']) assert.ok(!text.includes(frag), `leak: ${frag}`);
});

test('unused env names: literal and numbered-slot usage count as used; platform names are ignored', () => {
  const src = "process.env.ENABLE_WEB_SEARCH; `GEMINI_API_KEY_${i}`; const k='GEMINI_API_KEY'";
  const names = ['ENABLE_WEB_SEARCH', 'GEMINI_API_KEY_4', 'SEARCH_CAROUSEL', 'SERPER_ENABLED', 'JINA_API_KEY', 'RENDER_GIT_COMMIT', 'HOME'];
  assert.deepEqual(unusedEnvNames(names, src), ['JINA_API_KEY', 'SEARCH_CAROUSEL', 'SERPER_ENABLED']);
});

test('previous shutdown classification', () => {
  const now = Date.parse('2026-11-03T10:00:00Z');
  const rec = (over) => ({ pid: 1, bootId: 'b', bootedAt: '2026-11-03T09:00:00Z', lastBeatAt: '2026-11-03T09:59:30Z', state: 'running', uptimeSec: 3500, rssMb: 200, heapUsedMb: 80, memoryLimitMb: 512, commit: 'abc1234', appVersion: '124', ...over });
  assert.match(classifyPreviousShutdown(null, now).reason, /^no_record/);
  assert.equal(classifyPreviousShutdown(rec({ state: 'shutdown', reason: 'SIGTERM' }), now).reason, 'graceful:SIGTERM');
  assert.equal(classifyPreviousShutdown(rec({ state: 'crash', reason: 'uncaughtException' }), now).reason, 'crash:uncaughtException');
  assert.match(classifyPreviousShutdown(rec(), now).reason, /^killed_without_record/);
  assert.match(classifyPreviousShutdown(rec({ rssMb: 480 }), now).reason, /^oom_suspected/);
  const p = classifyPreviousShutdown(rec(), now);
  assert.equal(p.gapSec, 30); assert.equal(p.lastRssMb, 200); assert.equal(p.previousCommit, 'abc1234');
});

test('lifecycle: a second start reports how the first one ended', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bf-life-'));
  const file = path.join(dir, 'l.json');
  const a = startLifecycle({ commit: 'abc1234', appVersion: '124', file, heartbeatMs: 3_600_000 });
  assert.match(a.boot.previous.reason, /^no_record/);
  assert.equal(readLifecycle(file).state, 'running');
  const b = startLifecycle({ commit: 'abc1234', appVersion: '124', file, heartbeatMs: 3_600_000 });
  assert.match(b.boot.previous.reason, /^killed_without_record/);
  b.markShutdown('SIGTERM');
  assert.equal(readLifecycle(file).state, 'shutdown');
  const c = startLifecycle({ commit: 'abc1234', appVersion: '124', file, heartbeatMs: 3_600_000 });
  assert.equal(c.boot.previous.reason, 'graceful:SIGTERM');
  a.stop(); b.stop(); c.stop();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('memory limit parsing ignores unlimited values', () => {
  assert.equal(memoryLimitMb(() => 'max'), null);
  assert.equal(memoryLimitMb(() => String(512 * 1048576)), 512);
  assert.equal(memoryLimitMb(() => { throw new Error('x'); }), null);
});

test('build stamp: MATCH, MISMATCH, UNKNOWN, NO_STAMP', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bf-stamp-'));
  assert.equal(buildStampStatus('abc1234', dir).status, 'NO_STAMP');
  fs.writeFileSync(path.join(dir, 'build-stamp.json'), JSON.stringify({ commit: 'abc1234ffff', patch: '124.24', builtAt: 't' }));
  assert.equal(buildStampStatus('abc1234', dir).status, 'MATCH');
  assert.equal(buildStampStatus('9db8a51', dir).status, 'MISMATCH');
  assert.equal(buildStampStatus('unknown', dir).status, 'UNKNOWN');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('wiring: header endpoint serves the conversation log; Project log stays separate; no UI change', () => {
  const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  const routes = fs.readFileSync(new URL('../server/projectRoutes.ts', import.meta.url), 'utf8');
  const convo = fs.readFileSync(new URL('../server/conversationDiagnostics.ts', import.meta.url), 'utf8');
  assert.match(server, /app\.get\('\/api\/diagnostics\/session-log'[\s\S]{0,200}conversationSessionLog\(\)/);
  assert.ok(!/compactSessionLog/.test(server));
  assert.match(routes, /diagnostics\/session-log[\s\S]{0,200}compactSessionLog\(\)/);
  for (const projectOnly of ['OPERATION_TIMELINE', 'BROWSER_AFTER_SCREEN_STATE', 'SYSTEM_CHECKS']) assert.ok(!convo.includes(projectOnly), projectOnly);
  assert.match(server, /lifecycle\.markShutdown\('SIGTERM'\)/);
  assert.match(server, /previousShutdown: lifecycle\.boot\.previous\.reason/);
});
