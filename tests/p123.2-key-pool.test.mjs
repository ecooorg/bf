/**
 * P123.2 — Organisational Gemini key pool (≤13 slots), cooldown rotation.
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

const { resolveGeminiKeySlots, KeyPoolState, shouldRotateKeySlot, MAX_ORG_KEY_SLOTS, DEFAULT_SLOT_COOLDOWN_MS } = keyPool;
const { executeModelCall } = carousel;

describe('P123.2 key pool resolution', () => {
  it('solo GEMINI_API_KEY becomes a single slot 0', () => {
    const slots = resolveGeminiKeySlots({ GEMINI_API_KEY: 'solo-key' });
    assert.equal(slots.length, 1);
    assert.equal(slots[0].slot, 0);
    assert.equal(slots[0].envName, 'GEMINI_API_KEY');
  });

  it('loads up to 13 numbered keys and dedupes identical secrets', () => {
    const env = { GEMINI_API_KEY: 'k0' };
    for (let i = 1; i <= MAX_ORG_KEY_SLOTS; i++) env[`GEMINI_API_KEY_${i}`] = `k${i}`;
    env.GEMINI_API_KEY_5 = 'k0'; // duplicate of primary
    const slots = resolveGeminiKeySlots(env);
    assert.equal(slots.length, MAX_ORG_KEY_SLOTS); // 0..13 minus one dup = 13
    assert.ok(slots.every((s) => s.key && s.envName));
    assert.ok(!slots.some((s) => s.slot === 5)); // deduped
  });

  it('cooldown removes a slot until expiry', () => {
    const state = new KeyPoolState(1000);
    const slots = resolveGeminiKeySlots({ GEMINI_API_KEY: 'a', GEMINI_API_KEY_1: 'b' });
    const t0 = 1_000_000;
    state.markCooldown(0, t0, 5000);
    assert.deepEqual(
      state.available(slots, t0 + 100).map((s) => s.slot),
      [1]
    );
    assert.deepEqual(
      state.available(slots, t0 + 6000).map((s) => s.slot),
      [0, 1]
    );
  });

  it('shouldRotateKeySlot covers quota and transient', () => {
    assert.equal(shouldRotateKeySlot('PROVIDER_QUOTA'), true);
    assert.equal(shouldRotateKeySlot('PROVIDER_TRANSIENT'), true);
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
        async call(req) {
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
      {
        registry,
        adapters: { gemini: buildGeminiAdapter('key-a') },
        state: newRouterState(),
        required: ['json_output'],
        maxCalls: 4,
      },
      {
        keySlots: slots,
        keyPoolState: state,
        buildGeminiAdapter,
        sourceId: 'gemini-free-pool',
      }
    );

    assert.equal(result.status, 'ok');
    assert.equal(result.lineage.keySlot, 1);
    assert.ok(seenKeys.includes('key-a') && seenKeys.includes('key-b'));
    assert.ok(result.lineage.attempts.some((a) => a.keySlot === 0));
    assert.ok(!state.isAvailable(0)); // cooled after quota
    assert.ok(state.isAvailable(1));
  });

  it('blocks when every slot is in cooldown', async () => {
    const slots = [{ slot: 0, envName: 'GEMINI_API_KEY', key: 'only' }];
    const state = new KeyPoolState();
    state.markCooldown(0, Date.now(), 60_000);
    const result = await executeModelCall(
      { requestId: 'pool-cool', system: 's', prompt: 'p', json: false, metadata: {} },
      { registry: [], adapters: {}, state: newRouterState(), required: [] },
      {
        keySlots: slots,
        keyPoolState: state,
        buildGeminiAdapter: () => {
          throw new Error('must not build');
        },
      }
    );
    assert.equal(result.status, 'blocked');
    assert.equal(result.decision.reason, 'no_available_key_slot');
  });
});

assert.ok(DEFAULT_SLOT_COOLDOWN_MS >= 60_000);
