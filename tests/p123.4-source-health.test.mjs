import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { SourceHealthRegistry } = await import(pathToFileURL(path.join(root, 'server/sourceHealth.ts')).href);
const { executeModelCall } = await import(pathToFileURL(path.join(root, 'server/modelCarousel.ts')).href);
const { newRouterState } = await import(pathToFileURL(path.join(root, 'server/router.ts')).href);

describe('P123.4 source health', () => {
  it('opens breaker after consecutive failures in window', () => {
    const h = new SourceHealthRegistry({ breakerFailures: 3, breakerWindowMs: 60_000, cooldownMs: 1_000 });
    const t0 = 1_000_000;
    h.recordFailure('src-a', 'PROVIDER_QUOTA', t0);
    // Immediately after a failure the source is in cooldown
    assert.equal(h.isAvailable('src-a', t0 + 2), false);
    assert.equal(h.snapshot('src-a', t0 + 2).available, false);
    // After cooldown expires, still under breaker threshold (2 < 3) → available
    assert.equal(h.isAvailable('src-a', t0 + 1_500), true);
    h.recordFailure('src-a', 'PROVIDER_QUOTA', t0 + 2_000);
    h.recordFailure('src-a', 'PROVIDER_QUOTA', t0 + 2_100);
    // Third failure opens breaker
    const snap = h.snapshot('src-a', t0 + 2_100);
    assert.equal(snap.breakerOpen, true);
    assert.equal(h.isAvailable('src-a', t0 + 2_100), false);
  });

  it('success clears failures and cooldown', () => {
    const h = new SourceHealthRegistry({ breakerFailures: 2, cooldownMs: 60_000 });
    h.recordFailure('s', 'PROVIDER_TRANSIENT', 1000);
    assert.equal(h.isAvailable('s', 1001), false);
    h.recordSuccess('s');
    assert.equal(h.isAvailable('s', 1002), true);
  });

  it('executeModelCall blocks unhealthy source before calling adapters', async () => {
    const h = new SourceHealthRegistry({ cooldownMs: 60_000 });
    h.recordFailure('gemini-free-pool', 'PROVIDER_QUOTA', Date.now());
    let called = false;
    const result = await executeModelCall(
      { requestId: 'h1', system: 's', prompt: 'p', json: false, metadata: {} },
      {
        registry: [],
        adapters: {
          gemini: {
            id: 'gemini',
            capabilities: () => [],
            async call() {
              called = true;
              return { status: 'ok', output: {}, usage: { input: 0, cached: 0, output: 0 }, latencyMs: 1, providerId: 'gemini', modelId: 'x', retryable: false };
            },
          },
        },
        state: newRouterState(),
        required: [],
      },
      { sourceId: 'gemini-free-pool', sourceHealth: h }
    );
    assert.equal(result.status, 'blocked');
    assert.equal(result.decision.reason, 'source_unhealthy');
    assert.equal(called, false);
  });
});
