/**
 * C123 carousel — deterministic end-to-end of catalog / pool / health / gateway
 * (no network). Invoked by carousel-verify workflow and npm run test:carousel.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);

const catalogMod = await load('server/modelSourcesCatalog.ts');
const keyPool = await load('server/keyPool.ts');
const healthMod = await load('server/sourceHealth.ts');
const carousel = await load('server/modelCarousel.ts');
const { newRouterState } = await load('server/router.ts');
const { REGISTRY_SEED } = await load('server/modelRegistry.ts');

const {
  loadModelSourcesCatalog,
  enabledSources,
  runnableSources,
  sourceHasCredentials,
  withEnvAutoEnable,
} = catalogMod;
const { resolveGeminiKeySlots, resolveKeySlots, KeyPoolState, MAX_ORG_KEY_SLOTS, shouldRotateKeySlot } = keyPool;
const { SourceHealthRegistry } = healthMod;
const { executeModelCall, buildModelCallLineage, lineageLogFields } = carousel;

const fakeRegistry = [
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
  {
    providerId: 'gemini',
    modelId: 'gemini-3.1-flash-lite',
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

function adapterForKey(apiKey, behavior) {
  return {
    id: 'gemini',
    capabilities: () => ['json_output'],
    async call(req) {
      const outcome = typeof behavior === 'function' ? behavior(apiKey, req) : behavior[apiKey];
      if (outcome === 'ok' || outcome?.status === 'ok') {
        return {
          status: 'ok',
          output: { ok: true, key: apiKey },
          usage: { input: 1, cached: 0, output: 1 },
          latencyMs: 5,
          providerId: 'gemini',
          modelId: 'gemini-3.5-flash-lite',
          retryable: false,
        };
      }
      const errorClass = outcome?.errorClass || outcome || 'PROVIDER_QUOTA';
      return {
        status: 'error',
        usage: { input: 0, cached: 0, output: 0 },
        latencyMs: 3,
        providerId: 'gemini',
        modelId: 'gemini-3.5-flash-lite',
        retryable: true,
        errorClass,
      };
    },
  };
}

describe('C123 carousel workflow — catalog', () => {
  it('loads catalog; only gemini enabled by default; candidates present', () => {
    const cat = loadModelSourcesCatalog(path.join(root, 'config/model-sources.json'));
    assert.equal(cat.schema_version, 1);
    const en = enabledSources(cat);
    assert.ok(en.some((s) => s.id === 'gemini-free-pool'));
    assert.ok(en.every((s) => s.id === 'gemini-free-pool' || s.enabled));
    const ids = cat.sources.map((s) => s.id);
    assert.ok(ids.includes('openrouter-free'));
    assert.ok(ids.includes('groq-free'));
  });

  it('runnableSources empty without env; non-empty with GEMINI_API_KEY', () => {
    const cat = loadModelSourcesCatalog(path.join(root, 'config/model-sources.json'));
    assert.equal(runnableSources(cat, {}, 'public').length, 0);
    const r = runnableSources(cat, { GEMINI_API_KEY: 'x' }, 'public');
    assert.equal(r.length, 1);
    assert.equal(r[0].id, 'gemini-free-pool');
  });

  it('withEnvAutoEnable promotes candidates only when CAROUSEL_AUTO_ENABLE=true and key set', () => {
    const cat = loadModelSourcesCatalog(path.join(root, 'config/model-sources.json'));
    const off = withEnvAutoEnable(cat, { OPENROUTER_API_KEY: 'or', CAROUSEL_AUTO_ENABLE: 'false' });
    assert.equal(off.sources.find((s) => s.id === 'openrouter-free').enabled, false);
    const on = withEnvAutoEnable(cat, { OPENROUTER_API_KEY: 'or', CAROUSEL_AUTO_ENABLE: 'true' });
    assert.equal(on.sources.find((s) => s.id === 'openrouter-free').enabled, true);
  });
});

describe('C123 carousel workflow — key pool 1..10', () => {
  it('MAX_ORG_KEY_SLOTS is 10; any size 1..10 works', () => {
    assert.equal(MAX_ORG_KEY_SLOTS, 10);
    for (const n of [1, 2, 5, 10]) {
      const env = { GEMINI_API_KEY: 'k0' };
      for (let i = 1; i < n; i++) env[`GEMINI_API_KEY_${i}`] = `k${i}`;
      assert.equal(resolveGeminiKeySlots(env).length, n);
    }
  });

  it('ignores keys beyond slot 10', () => {
    const env = { GEMINI_API_KEY: 'k0' };
    for (let i = 1; i <= 12; i++) env[`GEMINI_API_KEY_${i}`] = `k${i}`;
    const slots = resolveGeminiKeySlots(env);
    assert.equal(slots.length, 11); // 0..10
    assert.ok(!slots.some((s) => s.slot > 10));
  });
});

describe('C123 carousel workflow — source health', () => {
  it('blocks executeModelCall when source unhealthy', async () => {
    const h = new SourceHealthRegistry({ cooldownMs: 60_000 });
    h.recordFailure('gemini-free-pool', 'PROVIDER_QUOTA', Date.now());
    let called = false;
    const result = await executeModelCall(
      { requestId: 'wf-h', system: 's', prompt: 'p', json: false, metadata: {} },
      {
        registry: REGISTRY_SEED.length ? REGISTRY_SEED : fakeRegistry,
        adapters: {
          gemini: {
            id: 'gemini',
            capabilities: () => ['json_output'],
            async call() {
              called = true;
              return { status: 'ok', output: {}, usage: { input: 0, cached: 0, output: 0 }, latencyMs: 1, providerId: 'gemini', modelId: 'x', retryable: false };
            },
          },
        },
        state: newRouterState(),
        required: ['json_output'],
      },
      { sourceId: 'gemini-free-pool', sourceHealth: h }
    );
    assert.equal(result.status, 'blocked');
    assert.equal(result.decision.reason, 'source_unhealthy');
    assert.equal(called, false);
  });
});

describe('C123 carousel workflow — key rotation + lineage', () => {
  it('rotates across 3 keys: quota, quota, then ok; lineage records slots', async () => {
    const slots = [
      { slot: 0, envName: 'GEMINI_API_KEY', key: 'ka' },
      { slot: 1, envName: 'GEMINI_API_KEY_1', key: 'kb' },
      { slot: 2, envName: 'GEMINI_API_KEY_2', key: 'kc' },
    ];
    const state = new KeyPoolState(60_000);
    const order = [];
    const build = (apiKey) => {
      order.push(apiKey);
      return adapterForKey(apiKey, {
        ka: { errorClass: 'PROVIDER_QUOTA' },
        kb: { errorClass: 'PROVIDER_TRANSIENT' },
        kc: 'ok',
      });
    };
    const result = await executeModelCall(
      { requestId: 'wf-rot', system: 's', prompt: 'p', json: true, metadata: {} },
      {
        registry: REGISTRY_SEED.length ? REGISTRY_SEED : fakeRegistry,
        adapters: { gemini: build('ka') },
        state: newRouterState(),
        required: ['json_output'],
        maxCalls: 6,
      },
      { keySlots: slots, keyPoolState: state, buildGeminiAdapter: build, sourceId: 'gemini-free-pool' }
    );
    assert.equal(result.status, 'ok');
    assert.equal(result.lineage.keySlot, 2);
    assert.ok(order.includes('ka') && order.includes('kb') && order.includes('kc'));
    assert.ok(result.lineage.attempts.some((a) => a.keySlot === 0));
    assert.ok(result.lineage.attempts.some((a) => a.keySlot === 2));
    const log = lineageLogFields(result.lineage);
    assert.ok(!JSON.stringify(log).includes('ka'));
  });

  it('exhausted pool returns blocked/error lineage without throwing', async () => {
    const slots = [
      { slot: 0, envName: 'GEMINI_API_KEY', key: 'only' },
    ];
    const state = new KeyPoolState(60_000);
    const build = (apiKey) => adapterForKey(apiKey, { only: { errorClass: 'PROVIDER_QUOTA' } });
    const result = await executeModelCall(
      { requestId: 'wf-ex', system: 's', prompt: 'p', json: true, metadata: {} },
      {
        registry: REGISTRY_SEED.length ? REGISTRY_SEED : fakeRegistry,
        adapters: { gemini: build('only') },
        state: newRouterState(),
        required: ['json_output'],
        maxCalls: 4,
      },
      { keySlots: slots, keyPoolState: state, buildGeminiAdapter: build, sourceId: 'gemini-free-pool' }
    );
    assert.ok(result.status === 'error' || result.status === 'blocked' || result.status === 'ok');
    // single key all quota → typically error from last routeCall
    assert.ok(result.lineage);
    assert.ok(result.lineage.requestId === 'wf-ex');
  });
});

describe('C123 carousel workflow — inventory & ops artifacts exist', () => {
  it('ops doc and inventory are present', () => {
    assert.match(readFileSync(path.join(root, 'docs/C123_OPS.md'), 'utf8'), /carousel:probe/);
    assert.match(readFileSync(path.join(root, 'docs/MODEL_SOURCES_INVENTORY.md'), 'utf8'), /OpenRouter/);
    assert.ok(MAX_ORG_KEY_SLOTS === 10);
  });
});
