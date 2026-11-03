import test from 'node:test';
import assert from 'node:assert/strict';
import { readLlmLatencyConfig } from '../server/llmLatencyConfig.ts';

test('P124.31: stale permissive Render values are clamped to bounded latency policy', () => {
  const config = readLlmLatencyConfig({
    LLM_CALL_TIMEOUT_MS: '20000',
    LLM_TOTAL_DEADLINE_MS: '70000',
    MAX_MODEL_CALLS: '4',
  });
  assert.deepEqual({ call: config.callTimeoutMs, total: config.totalDeadlineMs, calls: config.maxModelCalls }, {
    call: 12_000, total: 30_000, calls: 3,
  });
  assert.equal(config.warnings.length, 3);
});

test('P124.31: stricter operator values remain respected and defaults are fast', () => {
  const strict = readLlmLatencyConfig({ LLM_CALL_TIMEOUT_MS: '6000', LLM_TOTAL_DEADLINE_MS: '18000', MAX_MODEL_CALLS: '2' });
  assert.deepEqual([strict.callTimeoutMs, strict.totalDeadlineMs, strict.maxModelCalls], [6_000, 18_000, 2]);
  const defaults = readLlmLatencyConfig({});
  assert.deepEqual([defaults.callTimeoutMs, defaults.totalDeadlineMs, defaults.maxModelCalls], [12_000, 30_000, 3]);
});

test('P124.31: invalid values cannot disable request bounds', () => {
  const config = readLlmLatencyConfig({ LLM_CALL_TIMEOUT_MS: 'NaN', LLM_TOTAL_DEADLINE_MS: '-1', MAX_MODEL_CALLS: '0' });
  assert.deepEqual([config.callTimeoutMs, config.totalDeadlineMs, config.maxModelCalls], [12_000, 30_000, 3]);
});

test('P124.31: conversation deadline spans search preparation and all generation stages', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
  const rateLimitSource = await readFile(new URL('../server/modelRateLimit.ts', import.meta.url), 'utf8');
  assert.match(source, /const callBudget = \{ used: 0, startedAt: requestStartedAt \}/);
  assert.match(source, /const deadlineStart = budget\?\.startedAt \?\? t0/);
  assert.match(source, /type: 'llm_request_deadline_exhausted'/);
  assert.match(source, /type: 'llm_call_start'/);
  assert.match(source, /for \(let round = 0; round < 1; round\+\+\)/);
  assert.doesNotMatch(source, /await sleep\(pause\)/);
  assert.match(rateLimitSource, /maxWaitMs\?: number/);
  assert.match(rateLimitSource, /ModelQueueDeadlineError/);
  assert.match(rateLimitSource, /GREATEST\(model_request_slots\.next_allowed_at, now\(\)\)/);
});
