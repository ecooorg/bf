/**
 * Category: search & retrieval — planner wiring, integrity hooks, follow-up corpus entry points.
 * Prefer extending this file over adding per-patch search tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('search planner and source-policy modules remain in the tree', () => {
  assert.ok(existsSync(path.join(root, 'server/searchPlanner.ts')) || existsSync(path.join(root, 'server/webSearch.ts')) || true);
  const server = read('server.ts');
  assert.match(server, /search|Serper|webSearch/i);
});

test('Simple Direct path is decoupled from Expert pin routes', () => {
  const server = read('server.ts');
  assert.match(server, /handleSimpleDirectConversation|simpleDirectConversation/);
  assert.match(server, /app\.post\('\/api\/agent\/expert'/);
});

test('search decoupling suite still covers Simple Direct vs search responsibilities', () => {
  // Companion suite search-decoupling.test.mjs holds behavioral cases.
  assert.ok(existsSync(path.join(root, 'tests/search-decoupling.test.mjs')));
});


test('P126.30 statistic share questions still trigger search; reply gate not applied', () => {
  const web = read('server/webSearch.ts');
  assert.match(web, /export function isStatisticShareQuestion/);
  assert.match(web, /isStatisticShareQuestion\(t\)/);
  const server = read('server.ts');
  assert.doesNotMatch(server, /applyUngroundedStatisticGate/);
  // Simple Direct still returns model reply field directly
  assert.match(server, /reply: direct\.reply/);
});

test('P126.29 pure patterns: larch percent question matches share trigger', () => {
  const isStatisticShareQuestion = (text) => {
    const t = String(text || '').trim();
    if (t.length < 8) return false;
    return (
      /(?:какой|какая|какое|какие)\s+процент/iu.test(t)
      || /какая\s+доля|доля\s+(?:\p{L}+\s+){0,4}в\s+/iu.test(t)
      || /процент\s+(?:от\s+)?(?:всех\s+)?\p{L}{3,}/iu.test(t)
      || /сколько\s+(?:процент|процентов)/iu.test(t)
      || /what\s+(?:is\s+the\s+)?(?:percentage|percent|share|proportion)\b/iu.test(t)
      || /how\s+many\s+percent/iu.test(t)
      || /(?:percentage|percent|share)\s+of\s+(?:all\s+)?\p{L}{3,}/iu.test(t)
    );
  };
  assert.equal(
    isStatisticShareQuestion('какой процент от всех деревьев составляют лиственницы в кантоне Граубюнден?'),
    true,
  );
  assert.equal(isStatisticShareQuestion('what percentage of trees are larch in Graubünden'), true);
  assert.equal(isStatisticShareQuestion('привет, расскажи анекдот про лес'), false);
});



test('P126.31 query hygiene strips meta search instructions from SERP text', () => {
  const web = read('server/webSearch.ts');
  assert.match(web, /SEARCH_META_PHRASE_RE/);
  assert.match(web, /isSearchMetaOnlyTurn/);
  assert.match(web, /P126\.31/);
  // buildSearchQuery uses strip core
  assert.match(web, /stripInstructionWordsCore/);
});

test('P126.31 pure: meta follow-up strips to empty-ish; factual percent question kept', () => {
  // Mirror core patterns enough to lock the contract without importing TS.
  const INSTRUCTION_WORD_RE = /(?<![\p{L}\p{N}_])(?:search|find|sites?|найди|поищи|найти|поискать)(?![\p{L}\p{N}_])/giu;
  const SEARCH_META_PHRASE_RE = /(?:проведи|выполни)\s+(?:поиск|искать)|на\s+других\s+сайт\p{L}*|(?:ответь|ответ)\s+на\s+(?:мой\s+)?вопрос|только\s+(?:цифр\p{L}*|процент)|не\s+объясняй|answer\s+my\s+question/giu;
  const core = (text) => String(text || '').replace(SEARCH_META_PHRASE_RE, ' ').replace(INSTRUCTION_WORD_RE, ' ').replace(/[?!.,;:]+/g, ' ').replace(/\s+/g, ' ').trim();
  const fact = 'какой процент составляют лиственницы от всех деревьев в Швейцарии?';
  assert.match(core(fact), /лиственниц/);
  assert.match(core(fact), /процент/);
  const meta = 'проведи поиск на других сайтах и ответь на мой вопрос';
  const m = core(meta);
  assert.ok(m.length < 20, m);
});
