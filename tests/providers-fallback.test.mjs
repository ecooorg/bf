import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { QUOTA_COOLDOWN_MS, MODEL_PARK_MS, TRANSIENT_COOLDOWN_MS } from '../server/geminiKeyPool.ts';
import { SearchCircuitBreaker } from '../server/searchCarousel.ts';

const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../src/ConversationScreens.tsx', import.meta.url), 'utf8');

test('P126.13: quota pauses never exceed one minute (minute quotas only)', () => {
  assert.ok(QUOTA_COOLDOWN_MS <= 60_000 && MODEL_PARK_MS <= 60_000 && TRANSIENT_COOLDOWN_MS <= 60_000);
  const b = new SearchCircuitBreaker();
  b.failure('gemini', 'hard', 0);
  assert.equal(b.isOpen('gemini', 61_000), false);
  for (const name of ['MODEL_COOLDOWN_429_MS', 'MODEL_COOLDOWN_QUOTA_MS']) {
    const m = server.match(new RegExp(`const ${name} = ([^;]+);`));
    assert.ok(m && eval(m[1]) <= 60_000, name);
  }
});

test('P126.13: Serper is not disabled by a slow planner (threshold is not 8 s)', () => {
  assert.match(server, /const SERPER_MIN_REMAINING_MS = 3_000;/);
  assert.doesNotMatch(server, /< 8_000\) \{\s*console\.warn\(JSON\.stringify\(\{ type: 'web_search_skipped'/);
  assert.doesNotMatch(server, /deadlineAt - Date\.now\(\) < 8_000 \? 'request_deadline' : \(serperKey/);
});

test('P126.13: Simple Direct falls back to other providers on any Gemini failure', () => {
  assert.match(server, /\}, generateDirectWithFallback\);/);
  const fn = server.match(/async function generateDirectWithFallback[\s\S]*?\n}\n/)?.[0] || '';
  assert.match(fn, /await generateGeminiPassThrough\(/);
  assert.match(fn, /externalTextFallback\(/);
  assert.match(fn, /throw error/);
});

test('P126.13: Expert reaches external providers when all Gemini models are cooling down', () => {
  assert.match(server, /coolingError = new GeminiQuotaError\(\); break;/);
  assert.match(server, /coolingError = new GeminiUnavailableError\(/);
  const iFallback = server.indexOf('// P126.13: alternative providers are always tried');
  const iThrow = server.indexOf('if (coolingError) throw coolingError;');
  assert.ok(iFallback > 0 && iThrow > iFallback, 'fallback must run before the cooling error is thrown');
  assert.doesNotMatch(server, /ENABLE_EXTERNAL_MODEL_FALLBACK === 'true' && !byokKey && !opts\?\.extraParts/);
});

test('P126.13: client retries automatically after a failed request', () => {
  assert.match(client, /autoRetriesRef/);
  assert.match(client, /retrying automatically/);
  assert.match(client, /autoRetriesRef\.current >= 3/);
});
