/**
 * P123.2/P123.4 — Key pool: any count 1..MAX_ORG_KEY_SLOTS (10), never requires full set.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const keyPool = await import(pathToFileURL(path.join(root, 'server/keyPool.ts')).href);
const carousel = await import(pathToFileURL(path.join(root, 'server/modelCarousel.ts')).href);
const { newRouterState } = await import(pathToFileURL(path.join(root, 'server/router.ts')).href);

const { resolveGeminiKeySlots, resolveKeySlots, KeyPoolState, shouldRotateKeySlot, MAX_ORG_KEY_SLOTS } = keyPool;
const { executeModelCall } = carousel;

describe('P123.2 key pool resolution (max 10, any count)', () => {
  it('solo key is valid', () => {
    const slots = resolveGeminiKeySlots({ GEMINI_API_KEY: 'solo-key' });
    assert.equal(slots.length, 1);
    assert.equal(slots[0].slot, 0);
  });

  it('accepts any intermediate count without requiring 10', () => {
    for (const n of [1, 2, 3, 7, 10]) {
      const env = { GEMINI_API_KEY: 'k0' };
      for (let i = 1; i < n; i++) env[`GEMINI_API_KEY_${i}`] = `k${i}`;
      const slots = resolveGeminiKeySlots(env);
      assert.equal(slots.length, n, `expected ${n} slots`);
    }
  });

  it('caps numbered keys at MAX_ORG_KEY_SLOTS and ignores 11+', () => {
    assert.equal(MAX_ORG_KEY_SLOTS, 10, `expected max key slots 10, got ${MAX_ORG_KEY_SLOTS}`);
    const env = { GEMINI_API_KEY: 'k0' };
    for (let i = 1; i <= 15; i++) env[`GEMINI_API_KEY_${i}`] = `k${i}`;
    const slots = resolveGeminiKeySlots(env);
    assert.equal(slots.length, 11); // 0 + 1..10
    assert.ok(slots.every((s) => s.slot <= 10));
    assert.ok(!slots.some((s) => s.envName === 'GEMINI_API_KEY_11'));
  });

  it('dedupes identical secrets', () => {
    const slots = resolveGeminiKeySlots({
      GEMINI_API_KEY: 'same',
      GEMINI_API_KEY_1: 'same',
      GEMINI_API_KEY_2: 'other',
    });
    assert.equal(slots.length, 2);
  });

  it('cooldown removes a slot until expiry', () => {
    const state = new KeyPoolState(1000);
    const slots = resolveGeminiKeySlots({ GEMINI_API_KEY: 'a', GEMINI_API_KEY_1: 'b' });
    const t0 = 1_000_000;
    state.markCooldown(0, t0, 5000);
    assert.deepEqual(state.available(slots, t0 + 100).map((s) => s.slot), [1]);
    assert.deepEqual(state.available(slots, t0 + 6000).map((s) => s.slot), [0, 1]);
  });

  it('shouldRotateKeySlot covers quota and transient', () => {
    assert.equal(shouldRotateKeySlot('PROVIDER_QUOTA'), true);
    assert.equal(shouldRotateKeySlot('INVALID_REQUEST'), false);
  });
});

describe('P123.2 executeModelCall key rotation', () => {
  it('rotates to the next key after PROVIDER_QUOTA', async () => {
    const slots = [
      { slot: 0, envName: 'GEMINI_API_KEY', key: 'key-a' },
      { slot: 1, envName: 'GEMINI_API_KEY_1', key: 'key-b' },
    ];
    const state = new KeyPoolState(60_000);
    const seenKeys = [];
    const buildGeminiAdapter = (apiKey) => {
      seenKeys.push(apiKey);
      return {
        id: 'gemini',
        capabilities: () => ['json_output'],
        async call() {
          if (apiKey === 'key-a') {
            return {
              status: 'error',
              usage: { input: 0, cached: 0, output: 0 },
              latencyMs: 1,
              providerId: 'gemini',
              modelId: 'gemini-3.5-flash-lite',
              retryable: true,
              errorClass: 'PROVIDER_QUOTA',
            };
          }
          return {
            status: 'ok',
            output: { ok: true },
            usage: { input: 1, cached: 0, output: 1 },
            latencyMs: 2,
            providerId: 'gemini',
            modelId: 'gemini-3.5-flash-lite',
            retryable: false,
          };
        },
      };
    };
    const registry = [
      {
        providerId: 'gemini',
        modelId: 'gemini-3.5-flash-lite',
        status: 'active',
        adapter: 'gemini',
        capabilities: ['json_output'],
        qualityClass: 'B',
        qualityProvisional: true,
        dataPolicy: 'free',
        costTier: 'free',
        trainingOptOutConfirmed: false,
        lastVerifiedAt: '2026-11-01',
        secretEnvRef: 'GEMINI_API_KEY',
      },
    ];
    const result = await executeModelCall(
      { requestId: 'pool-1', system: 's', prompt: 'p', json: true, metadata: {} },
      { registry, adapters: { gemini: buildGeminiAdapter('key-a') }, state: newRouterState(), required: ['json_output'], maxCalls: 4 },
      { keySlots: slots, keyPoolState: state, buildGeminiAdapter, sourceId: 'gemini-free-pool' }
    );
    assert.equal(result.status, 'ok');
    assert.equal(result.lineage.keySlot, 1);
    assert.ok(seenKeys.includes('key-a') && seenKeys.includes('key-b'));
  });
});
