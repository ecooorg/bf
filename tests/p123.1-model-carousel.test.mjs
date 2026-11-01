/**
 * P123.1 — Model carousel gateway lineage (deterministic, no network).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mod = await import(pathToFileURL(path.join(root, 'server/modelCarousel.ts')).href);

const { buildModelCallLineage, executeModelCall, lineageLogFields } = mod;

describe('P123.1 model call lineage', () => {
  it('buildModelCallLineage records source, model, channel, and timing', () => {
    const started = Date.now() - 50;
    const lineage = buildModelCallLineage(
      { requestId: 'r-test-1' },
      {
        status: 'ok',
        response: {
          status: 'ok',
          output: { ok: true },
          usage: { input: 1, cached: 0, output: 1 },
          latencyMs: 40,
          providerId: 'gemini',
          modelId: 'gemini-3.5-flash-lite',
          retryable: false,
        },
        decision: {
          candidates: ['gemini/gemini-3.5-flash-lite'],
          rejected: [],
          attempts: [{ model: 'gemini/gemini-3.5-flash-lite', status: 'ok' }],
          policy: 'router-v1/test',
          unitsSpent: 1,
        },
      },
      started,
      { sourceId: 'gemini-free-pool', keySlot: 0 }
    );
    assert.equal(lineage.requestId, 'r-test-1');
    assert.equal(lineage.sourceId, 'gemini-free-pool');
    assert.equal(lineage.model, 'gemini-3.5-flash-lite');
    assert.equal(lineage.channel, 'api');
    assert.equal(lineage.keySlot, 0);
    assert.equal(lineage.status, 'ok');
    assert.equal(lineage.policy, 'router-v1/test');
    assert.ok(lineage.latencyMs >= 0);
    assert.match(lineage.startedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(lineage.attempts.length, 1);
  });

  it('marks status failover when multiple attempts then ok', () => {
    const lineage = buildModelCallLineage(
      { requestId: 'r-2' },
      {
        status: 'ok',
        response: {
          status: 'ok',
          output: {},
          usage: { input: 0, cached: 0, output: 0 },
          latencyMs: 10,
          providerId: 'gemini',
          modelId: 'gemini-3.1-flash-lite',
          retryable: false,
        },
        decision: {
          candidates: ['gemini/gemini-3.5-flash-lite', 'gemini/gemini-3.1-flash-lite'],
          rejected: [],
          attempts: [
            { model: 'gemini/gemini-3.5-flash-lite', status: 'error', errorClass: 'PROVIDER_QUOTA' },
            { model: 'gemini/gemini-3.1-flash-lite', status: 'ok' },
          ],
          policy: 'router-v1/test',
          unitsSpent: 2,
        },
      },
      Date.now() - 10,
      {}
    );
    assert.equal(lineage.status, 'failover');
    assert.equal(lineage.model, 'gemini-3.1-flash-lite');
  });

  it('lineageLogFields never invents secret material', () => {
    const lineage = buildModelCallLineage(
      { requestId: 'r-3' },
      {
        status: 'blocked',
        decision: {
          candidates: [],
          rejected: [{ model: 'x', reason: 'no_suitable_model' }],
          attempts: [],
          policy: 'router-v1/test',
          unitsSpent: 0,
          reason: 'no_suitable_model',
        },
      },
      Date.now(),
      { sourceId: 'gemini-free-pool' }
    );
    const fields = lineageLogFields(lineage);
    const blob = JSON.stringify(fields);
    assert.equal(fields.sourceId, 'gemini-free-pool');
    assert.ok(!/AIza|sk-|api[_-]?key/i.test(blob));
  });

  it('executeModelCall attaches lineage when routeCall is injected via context', async () => {
    // Minimal fake: empty registry → blocked without network
    const { newRouterState } = await import(pathToFileURL(path.join(root, 'server/router.ts')).href);
    const result = await executeModelCall(
      { requestId: 'r-empty', system: 's', prompt: 'p', json: false, metadata: {} },
      {
        registry: [],
        adapters: {},
        state: newRouterState(),
        required: ['json_output'],
      },
      { sourceId: 'gemini-free-pool', keySlot: null }
    );
    assert.equal(result.status, 'blocked');
    assert.ok(result.lineage);
    assert.equal(result.lineage.requestId, 'r-empty');
    assert.equal(result.lineage.sourceId, 'gemini-free-pool');
    assert.equal(result.lineage.status, 'blocked');
  });
});
