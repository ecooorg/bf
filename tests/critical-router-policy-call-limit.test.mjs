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
  const p1 = createFakeAdapter('p1', ['policy']);
  const p2 = createFakeAdapter('p2');
  const result = await routeCall(req, base(
    [entry('p1', 'model-p1'), entry('p2', 'model-p2')],
    { p1, p2 },
  ));
  assert.equal(result.status, 'error');
  assert.equal(result.response?.errorClass, 'POLICY_REJECTED');
  assert.equal(p1.calls.length, 1);
  assert.equal(p2.calls.length, 0);
});

test('router: call limit stops after maxCalls', async () => {
  const p1 = createFakeAdapter('a', ['server_error']);
  const registry = [1, 2, 3, 4, 5].map((n) => entry('a', `model-${n}`));
  const result = await routeCall(req, base(registry, { a: p1 }, { maxCalls: 4 }));
  assert.equal(p1.calls.length, 4);
  assert.equal(result.status, 'blocked');
  assert.equal(result.decision.reason, 'call_limit');
});
