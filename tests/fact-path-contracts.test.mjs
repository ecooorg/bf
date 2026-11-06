/**
 * P127.3a — Fact-path contracts (deterministic, no network).
 * Only encodes behaviour we are willing to treat as ground truth in CI.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

const {
  isStatisticShareQuestion,
  isQuantitativeFactQuestion,
  replyAssertsGroundedPercentage,
  replyAssertsSpecificQuantity,
  applyUngroundedStatisticGate,
  needsFreshWebInfo,
} = await import('../server/webSearch.ts');

const { extractAgentDataPayload } = await import('../server/conversationPayload.ts');

// --- Quantitative question detection ---

test('contract: percentage share questions are quantitative', () => {
  assert.equal(
    isStatisticShareQuestion('какой процент от всех деревьев составляют лиственницы в Граубюндене?'),
    true,
  );
  assert.equal(isQuantitativeFactQuestion('what percentage of trees are larch in Graubünden'), true);
  assert.equal(isQuantitativeFactQuestion('привет, расскажи анекдот'), false);
  assert.equal(isQuantitativeFactQuestion('ok'), false);
});

test('contract: population / official-count questions are quantitative', () => {
  const cases = [
    'What was Switzerland’s permanent resident population on 31 December 2023?',
    'Численность постоянного населения Швейцарии на 31 декабря 2023',
    'how many people live in Tokyo',
    'What is the current SNB policy rate?',
  ];
  for (const q of cases) {
    assert.equal(isQuantitativeFactQuestion(q), true, q);
    assert.equal(needsFreshWebInfo(q), true, q);
  }
  assert.equal(isQuantitativeFactQuestion('How are you today?'), false);
  assert.equal(needsFreshWebInfo('How are you today?'), false);
});

// --- Reply asserts quantity ---

test('contract: replyAssertsSpecificQuantity detects percents and large counts', () => {
  assert.equal(replyAssertsSpecificQuantity('The share is about 12% according to inventory.'), true);
  assert.equal(replyAssertsSpecificQuantity('The population was 8 962 300.'), true);
  assert.equal(replyAssertsSpecificQuantity('about 8.96 million residents'), true);
  assert.equal(replyAssertsSpecificQuantity('I could not find a reliable figure.'), false);
  assert.equal(replyAssertsSpecificQuantity('You are welcome!'), false);
});

test('contract: replyAssertsGroundedPercentage requires percent-like claim', () => {
  assert.equal(replyAssertsGroundedPercentage('по данным инвентаризации доля составляет 15%'), true);
  assert.equal(replyAssertsGroundedPercentage('население 8962300'), false);
});

// --- Ungrounded gate (search status is the only grounding signal here) ---

test('contract: gate leaves reply when search used or used_weak', () => {
  const reply = 'The population was 8 962 300.';
  for (const status of ['used', 'used_weak']) {
    assert.equal(
      applyUngroundedStatisticGate({
        userText: 'What was Switzerland permanent resident population on 31 December 2023?',
        reply,
        searchStatus: status,
      }),
      reply,
    );
  }
});

test('contract: gate replaces quantitative claim when search not grounded', () => {
  const userText = 'What was Switzerland permanent resident population on 31 December 2023?';
  const reply = 'The population was 8 962 300.';
  for (const status of ['not_run', 'failed', 'skipped', '']) {
    const out = applyUngroundedStatisticGate({ userText, reply, searchStatus: status });
    assert.notEqual(out, reply, status);
    assert.match(out, /cannot confirm|search the web|not completed|usable sources/i);
  }
});

test('contract: gate does not rewrite non-quantitative chat', () => {
  const reply = 'You are very welcome!';
  assert.equal(
    applyUngroundedStatisticGate({
      userText: 'thank you',
      reply,
      searchStatus: 'not_run',
    }),
    reply,
  );
});

test('contract: gate RU message when user text is Cyrillic', () => {
  const out = applyUngroundedStatisticGate({
    userText: 'Какова численность постоянного населения Швейцарии на 31 декабря 2023?',
    reply: 'Постоянное население составляло 8 962 300 человек.',
    searchStatus: 'failed',
  });
  assert.match(out, /не могу подтвердить|поиск/i);
});

// --- HTTP envelope (ok() shape) ---

test('contract: extractAgentDataPayload reads nested data.reply', () => {
  const p = extractAgentDataPayload({
    success: true,
    data: { reply: 'Hello from nested', sources: [{ url: 'https://example.com/a' }] },
    meta: { model: 'x' },
  });
  assert.equal(p.reply, 'Hello from nested');
  assert.deepEqual(p.sources, ['https://example.com/a']);
  assert.equal(p.success, true);
});

test('contract: extractAgentDataPayload accepts flat reply for resilience', () => {
  const p = extractAgentDataPayload({ reply: 'flat', sources: ['https://x.test'] });
  assert.equal(p.reply, 'flat');
  assert.deepEqual(p.sources, ['https://x.test']);
});

test('contract: extractAgentDataPayload empty on garbage', () => {
  assert.equal(extractAgentDataPayload(null).reply, '');
  assert.equal(extractAgentDataPayload('x').reply, '');
  assert.equal(extractAgentDataPayload({ success: false, error: 'nope' }).reply, '');
});

// --- Wiring contracts (source-level, high confidence) ---

test('contract: server wires gate only under UNGROUNDED_FACT_GATE', () => {
  const server = read('server.ts');
  assert.match(server, /UNGROUNDED_FACT_GATE === 'true'/);
  assert.match(server, /applyUngroundedStatisticGate/);
  // Must not apply gate unconditionally on every reply assignment without flag check nearby
  const flagHits = server.split("UNGROUNDED_FACT_GATE === 'true'").length - 1;
  assert.ok(flagHits >= 2, `expected Direct + structured paths, got ${flagHits}`);
});

test('contract: harness still targets nested data.reply (eval regression)', () => {
  const harness = read('scripts/baseline-eval.mjs');
  assert.match(harness, /data\.data/);
  assert.match(harness, /payload\.reply|extractProductPayload|empty data\.reply/);
});

test('contract: needsFreshWebInfo uses quantitative helper (not only share %)', () => {
  const web = read('server/webSearch.ts');
  assert.match(web, /isQuantitativeFactQuestion\(t\)/);
});
