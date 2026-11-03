/** P124.27 — single Gemini key pool, shared-quota detection, pooled helper client, verifier opt-in, pipeline default. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GeminiKeyPool, callWithKeyPool, createPooledClient, PoolExhaustedError } from '../server/geminiKeyPool.ts';
import { isVerifierEnabled, runEpistemicVerifier } from '../server/epistemicVerifier.ts';
import { serperLocale, deploymentDefaultCountry, formatSearchBlock } from '../server/webSearch.ts';

const slots = (n) => Array.from({ length: n }, (_, i) => ({ slot: i, envName: `K${i}`, key: `secret-${i}` }));
const e429 = () => Object.assign(new Error('RESOURCE_EXHAUSTED'), { status: 429 });
const e503 = () => Object.assign(new Error('UNAVAILABLE'), { status: 503 });
const e401 = () => Object.assign(new Error('API key not valid'), { status: 401 });

test('K-2: a 429 on one key rotates to the next key for the same model', async () => {
  const pool = new GeminiKeyPool(slots(4));
  const used = [];
  const r = await callWithKeyPool({ pool, model: 'm1', call: async (key) => { used.push(key); if (used.length === 1) throw e429(); return 'ok'; } });
  assert.equal(r.value, 'ok'); assert.equal(r.keyAttempts, 2); assert.equal(new Set(used).size, 2);
});

test('K-2: cooldown is per key and model — the failed key still serves another model', async () => {
  const pool = new GeminiKeyPool(slots(2));
  pool.noteFailure(0, 'm1', 'PROVIDER_QUOTA');
  assert.deepEqual(pool.slotsFor('m1').map((s) => s.slot), [1]);
  assert.deepEqual(pool.slotsFor('m2').map((s) => s.slot).sort(), [0, 1]);
});

test('K-2: auth error cools the key for every model; transient is short', () => {
  const pool = new GeminiKeyPool(slots(2));
  pool.noteFailure(0, 'm1', 'PROVIDER_AUTH');
  assert.deepEqual(pool.slotsFor('m2').map((s) => s.slot), [1]);
  pool.noteFailure(1, 'm2', 'PROVIDER_TRANSIENT', 1000);
  assert.deepEqual(pool.slotsFor('m2', 1000 + 29_000), []);
  assert.deepEqual(pool.slotsFor('m2', 1000 + 31_000).map((s) => s.slot), [1]);
});

test('K-1: quota on several distinct keys of one model parks the model (shared project) and stops burning keys', async () => {
  const pool = new GeminiKeyPool(slots(10));
  let calls = 0; const logs = [];
  await assert.rejects(callWithKeyPool({ pool, model: 'm1', maxKeyAttempts: 10, onRotate: (l) => logs.push(l), call: async () => { calls++; throw e429(); } }), (e) => e instanceof PoolExhaustedError && e.kind === 'quota');
  assert.equal(calls, 3);
  assert.ok(logs.at(-1).sharedQuotaSuspected);
  assert.equal(pool.isModelParked('m1'), true);
  assert.deepEqual(pool.slotsFor('m1'), []);
  assert.ok(pool.slotsFor('m2').length === 10);
});

test('non-rotating errors are rethrown unchanged and no key is cooled', async () => {
  const pool = new GeminiKeyPool(slots(3));
  const boom = new Error('bad request');
  await assert.rejects(callWithKeyPool({ pool, model: 'm', call: async () => { throw boom; } }), (e) => e === boom);
  assert.equal(pool.slotsFor('m').length, 3);
});

test('exhaustion reports the original last error and its class', async () => {
  const pool = new GeminiKeyPool(slots(2));
  const err = await callWithKeyPool({ pool, model: 'm', call: async () => { throw e503(); } }).catch((e) => e);
  assert.ok(err instanceof PoolExhaustedError); assert.equal(err.kind, 'unavailable'); assert.equal(err.last.status, 503);
  const none = await callWithKeyPool({ pool: new GeminiKeyPool([]), model: 'm', call: async () => 1 }).catch((e) => e);
  assert.equal(none.kind, 'no_keys');
});

test('K-3/K-5: pooled helper client falls back to a second model when every key is exhausted for the first', async () => {
  const pool = new GeminiKeyPool(slots(3));
  const seen = [];
  const client = createPooledClient({ pool, fallbackModels: ['m2'], makeClient: (key) => ({ models: { generateContent: async (a) => { seen.push([key, a.model]); if (a.model === 'm1') throw e429(); return { text: 'hi' }; } } }) });
  const r = await client.models.generateContent({ model: 'm1', contents: 'x' });
  assert.equal(r.text, 'hi'); assert.equal(seen.at(-1)[1], 'm2');
});

test('BYOK bypasses the pool and its cooldowns', async () => {
  const pool = new GeminiKeyPool(slots(2));
  pool.noteFailure(0, 'm', 'PROVIDER_AUTH'); pool.noteFailure(1, 'm', 'PROVIDER_AUTH');
  const client = createPooledClient({ pool, byokKey: 'mine', makeClient: (k) => ({ models: { generateContent: async () => ({ text: k }) } }) });
  assert.equal((await client.models.generateContent({ model: 'm' })).text, 'mine');
});

test('snapshot exposes no key material', () => {
  const pool = new GeminiKeyPool(slots(2));
  pool.noteFailure(0, 'm', 'PROVIDER_AUTH');
  assert.ok(!JSON.stringify(pool.snapshot()).includes('secret-'));
});

test('E-1: verifier is opt-in and never reaches a third party by default', async () => {
  assert.equal(isVerifierEnabled({}), false);
  assert.equal(isVerifierEnabled({ EPISTEMIC_VERIFIER_ENABLED: 'true' }), true);
  const saved = { k: process.env.GROQ_API_KEY, v: process.env.EPISTEMIC_VERIFIER_ENABLED };
  process.env.GROQ_API_KEY = 'x'; delete process.env.EPISTEMIC_VERIFIER_ENABLED;
  try { assert.equal((await runEpistemicVerifier({ userText: 'u', replyText: 'r' })).verifier, 'skipped'); }
  finally { if (saved.k === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = saved.k; if (saved.v !== undefined) process.env.EPISTEMIC_VERIFIER_ENABLED = saved.v; }
});

test('pipeline is the default path: direct mode only when explicitly enabled; one pool serves all Gemini calls', () => {
  const src = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  assert.ok(!/BIFORGE_GEMINI_DIRECT_MODE !== 'false'/.test(src));
  assert.equal((src.match(/BIFORGE_GEMINI_DIRECT_MODE === 'true'/g) || []).length, 2);
  assert.match(src, /callWithKeyPool\(/);
  assert.ok(!/new GoogleGenAI\(\{ apiKey: (gemKey|searchKey)\b/.test(src.replace(/function pooledGeminiClient[\s\S]*?\n}\n/, '')), 'helper calls use the pooled client');
});

test('owner rule: no country is hard-coded; deployment default is configuration', () => {
  assert.equal(deploymentDefaultCountry({}), undefined);
  assert.equal(deploymentDefaultCountry({ WEB_SEARCH_DEFAULT_COUNTRY: ' ch ' }), 'CH');
  assert.deepEqual(serperLocale('x', undefined, { WEB_SEARCH_DEFAULT_COUNTRY: 'CH' }), { hl: 'en', gl: 'ch' });
  assert.deepEqual(serperLocale('x', 'DE', { WEB_SEARCH_DEFAULT_COUNTRY: 'CH' }), { hl: 'en', gl: 'de' });
  assert.deepEqual(serperLocale('x', undefined, {}), { hl: 'en', gl: 'us' });
  const saved = process.env.WEB_SEARCH_DEFAULT_COUNTRY; process.env.WEB_SEARCH_DEFAULT_COUNTRY = 'CH';
  try { assert.match(formatSearchBlock({ status: 'used', digest: 'x'.repeat(50), sources: [], queries: [] }, '2026-11-03'), /metric units/i); }
  finally { if (saved === undefined) delete process.env.WEB_SEARCH_DEFAULT_COUNTRY; else process.env.WEB_SEARCH_DEFAULT_COUNTRY = saved; }
});
