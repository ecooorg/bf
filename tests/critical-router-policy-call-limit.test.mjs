import test from 'node:test';
import assert from 'node:assert/strict';
import { routeCall, newRouterState } from '../server/router.ts';
import { createFakeAdapter } from '../server/fakeProvider.ts';

function entry(providerId, modelId) {
  return {
    providerId,
    modelId,
    status: 'active',
    capabilities: ['json_output'],
    qualityClass: 'A',
    costTier: 'free',
  };
}

const req = { requestId: 'critical-router-probe', prompt: 'p', json: true, metadata: {} };
const base = (registry, adapters, extra = {}) => ({
  registry,
  adapters,
  state: newRouterState(),
  required: ['json_output'],
  sleep: async () => {},
  backoffMs: () => 0,
  ...extra,
});

test('router: invalid request stops before fallback', async () => {
  const p1 = createFakeAdapter('p1', ['invalid_request']);
  const p2 = createFakeAdapter('p2');
  const result = await routeCall(req, base(
    [entry('p1', 'model-p1'), entry('p2', 'model-p2')],
    { p1, p2 },
  ));
  assert.equal(result.status, 'error');
  assert.equal(result.response?.errorClass, 'INVALID_REQUEST');
  assert.equal(p1.calls.length, 1);
  assert.equal(p2.calls.length, 0);
});

test('router: policy rejection stops before fallback', async () => {
  const raw1 = createFakeAdapter('p1', ['policy']);
  const raw2 = createFakeAdapter('p2');
  const trace = (raw, id) => ({
    ...raw,
    async call(providerReq, options) {
      console.error(`[P99] policy adapter.call:start provider=${id} model=${providerReq.modelId}`);
      const result = await raw.call(providerReq, options);
      console.error(`[P99] policy adapter.call:end provider=${id} status=${result.status} errorClass=${result.errorClass ?? 'none'}`);
      return result;
    },
  });
  const p1 = trace(raw1, 'p1');
  const p2 = trace(raw2, 'p2');
  console.error('[P99] policy routeCall:start');
  const result = await routeCall(req, base(
    [entry('p1', 'model-p1'), entry('p2', 'model-p2')],
    { p1, p2 },
    {
      onCall: async (response, info) => console.error(`[P99] policy onCall model=${info.entry.modelId} status=${response.status} errorClass=${response.errorClass ?? 'none'}`),
      onHealth: async (event) => console.error(`[P99] policy onHealth type=${event.type} model=${'model' in event ? event.model : 'none'}`),
    },
  ));
  console.error(`[P99] policy routeCall:end status=${result.status} reason=${result.decision.reason ?? 'none'}`);
  assert.equal(result.status, 'error');
  assert.equal(result.response?.errorClass, 'POLICY_REJECTED');
  assert.equal(raw1.calls.length, 1);
  assert.equal(raw2.calls.length, 0);
});

test('router: call limit stops after maxCalls', async () => {
  const raw = createFakeAdapter('a', ['server_error']);
  const adapter = {
    ...raw,
    async call(providerReq, options) {
      console.error(`[P99] limit adapter.call:start model=${providerReq.modelId} calls_before=${raw.calls.length}`);
      try {
        const result = await raw.call(providerReq, options);
        console.error(`[P99] limit adapter.call:end model=${providerReq.modelId} status=${result.status} errorClass=${result.errorClass ?? 'none'} calls_after=${raw.calls.length}`);
        return result;
      } catch (error) {
        console.error(`[P99] limit adapter.call:throw model=${providerReq.modelId} error=${String(error)}`);
        throw error;
      }
    },
  };
  const registry = [1, 2, 3, 4, 5].map((n) => entry('a', `model-${n}`));
  const context = base(registry, { a: adapter }, {
    maxCalls: 4,
    onCall: async (response, info) => console.error(`[P99] limit onCall model=${info.entry.modelId} status=${response.status} errorClass=${response.errorClass ?? 'none'} retries=${info.retries}`),
    onHealth: async (event) => console.error(`[P99] limit onHealth type=${event.type} model=${'model' in event ? event.model : 'none'}`),
    sleep: async (ms) => { console.error(`[P99] limit sleep ms=${ms}`); },
    backoffMs: () => { console.error('[P99] limit backoffMs'); return 0; },
  });
  console.error('[P99] limit routeCall:start maxCalls=4 registryEntries=5');
  const result = await routeCall(req, context);
  console.error(`[P99] limit routeCall:end status=${result.status} reason=${result.decision.reason ?? 'none'} attempts=${result.decision.attempts.length} adapterCalls=${raw.calls.length}`);
  assert.equal(raw.calls.length, 4);
  assert.equal(result.status, 'blocked');
  assert.equal(result.decision.reason, 'call_limit');
});
