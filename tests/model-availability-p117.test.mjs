import test from 'node:test';
import assert from 'node:assert/strict';
import { probeGeminiCandidates, eligibleGeminiCandidates, getProbeStates, resetProbeStateForTests, GEMINI_PROBE_CANDIDATES, GEMINI_ALLOWED_MODELS } from '../server/modelAvailability.ts';
import { registryForGeminiCascade } from '../server/modelRegistry.ts';

test('P117: unprobed models never add extras beyond configured cascade', () => {
  resetProbeStateForTests();
  assert.deepEqual(eligibleGeminiCandidates(), []);
  assert.deepEqual(registryForGeminiCascade('LIGHT').map((x) => x.modelId), ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
});

test('P117: allowlist models are eligible only after successful live probe', async () => {
  resetProbeStateForTests();
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'O' }] } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const result = await probeGeminiCandidates({ apiKey: 'test-key', fetchImpl, now: 10_000_000 });
  assert.equal(calls, GEMINI_ALLOWED_MODELS.length);
  assert.deepEqual(eligibleGeminiCandidates(), [...GEMINI_PROBE_CANDIDATES]);
  assert.ok(result['gemini-3.5-flash-lite'].checkedAt !== null);
  assert.ok(result['gemini-3.1-flash-lite'].checkedAt !== null);
  // Cascade stays the two free-key models (candidate seed is empty — no 3.6/3.8 promotion)
  const strong = registryForGeminiCascade('STRONG').map((x) => x.modelId);
  assert.deepEqual(strong, ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
});

test('P117: failed probe does not promote model and hourly throttle avoids extra calls', async () => {
  resetProbeStateForTests();
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return new Response('{}', { status: 404 });
  };
  const result = await probeGeminiCandidates({ apiKey: 'test-key', fetchImpl, now: 20_000_000 });
  assert.equal(calls, GEMINI_ALLOWED_MODELS.length);
  assert.ok(Object.values(result).every((x) => x.status === 'unavailable'));
  await probeGeminiCandidates({ apiKey: 'test-key', fetchImpl, now: 20_000_001 });
  assert.equal(calls, GEMINI_ALLOWED_MODELS.length);
  assert.deepEqual(eligibleGeminiCandidates(), []);
});

test('P117: no key means no network probe', async () => {
  resetProbeStateForTests();
  let calls = 0;
  await probeGeminiCandidates({
    fetchImpl: async () => {
      calls++;
      throw new Error('must not run');
    },
    now: 30_000_000,
  });
  assert.equal(calls, 0);
  assert.equal(getProbeStates()['gemini-3.5-flash-lite'].status, 'unknown');
});
