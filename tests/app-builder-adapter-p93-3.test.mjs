import test from 'node:test';
import assert from 'node:assert/strict';
import { stagedEnabled, staleMs, createModelPort, createStorePort, publicJob } from '../server/appBuilderAdapter.ts';
import { REGISTRY_ALL } from '../server/modelRegistry.ts';
import { newRouterState } from '../server/router.ts';

const resp = (over) => ({ status: 'error', usage: { input: 0, cached: 0, output: 0 }, latencyMs: 1, providerId: 'gemini', modelId: 'm', retryable: false, ...over });
const deps = (call) => ({ registry: REGISTRY_ALL.filter((e) => e.providerId === 'gemini' && e.capabilities.includes('json_output')), adapters: { gemini: { id: 'gemini', capabilities: () => ['json_output'], call } }, routerState: newRouterState() });
const args = { role: 'coder', system: 's', prompt: 'p', maxOutputTokens: 100 };

test('flag: staged engine is off unless APP_BUILDER_ENGINE=staged', () => {
  assert.equal(stagedEnabled({}), false); assert.equal(stagedEnabled({ APP_BUILDER_ENGINE: 'false' }), false);
  assert.equal(stagedEnabled({ APP_BUILDER_ENGINE: 'staged' }), true);
  assert.equal(staleMs({}), 120000); assert.equal(staleMs({ APP_BUILDER_STALE_MS: '30000' }), 30000);
});
test('model port: success, length finish, quota, invalid request', async () => {
  const ok = await createModelPort(deps(async () => resp({ status: 'ok', output: 'text', finishReason: 'stop' })), 'p').complete(args);
  assert.equal(ok.text, 'text'); assert.match(ok.modelId, /^gemini\//);
  const cut = await createModelPort(deps(async () => resp({ status: 'ok', output: 'x', finishReason: 'MAX_TOKENS' })), 'p').complete(args);
  assert.equal(cut.finishReason, 'length');
  const q = await createModelPort(deps(async () => resp({ errorClass: 'PROVIDER_QUOTA', retryable: true, retryAfterMs: 5000 })), 'p').complete(args);
  assert.equal(q.code, 'rate_limited'); assert.equal(q.retryAfterMs, 5000);
  const bad = await createModelPort(deps(async () => resp({ errorClass: 'INVALID_REQUEST' })), 'p').complete(args);
  assert.equal(bad.code, 'bad_request');
});
test('store port uses only app_build_* tables and keeps cancelled jobs cancelled', async () => {
  const sql = []; const store = createStorePort({ getPoolFn: async () => ({ query: async (t, p) => { sql.push(t); return { rows: [], rowCount: 0 }; } }) });
  await store.saveJob({ schemaVersion: 1, id: 'j', projectId: 'p', userId: 'u', status: 'running', stage: 'code', spec: null, plan: null, callsUsed: 1, callsBudget: 25, error: null, report: null, artifactId: null, createdAt: new Date().toISOString(), updatedAt: '', heartbeatAt: '' });
  await store.getUnitResult('k'); await store.listResumable(1000);
  assert.ok(sql.every((t) => /app_build_(jobs|unit_results)/.test(t)));
  assert.match(sql[0], /CASE WHEN app_build_jobs.status='cancelled'/);
});
test('public job view hides spec and prompts', () => {
  const v = publicJob({ id: 'j', status: 'done', stage: 'done', plan: { units: [{ id: 'a', path: 'a.js', status: 'done', attempts: 1, contract: 'secret-ish' }] }, spec: { goal: 'x' }, report: { goalImplemented: true, status: 'complete', validators: [] }, artifactId: 'art1', callsUsed: 3, callsBudget: 25, error: null, updatedAt: 'now' }, 'proj');
  assert.equal(v.units[0].contract, undefined); assert.equal(v.spec, undefined); assert.match(v.downloadUrl, /proj\/artifacts\/art1\/download/);
});
