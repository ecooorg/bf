import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { shouldSearchWeb, searchContextForTurn, isContextDependentFollowup, formatSearchStatusBlock } from '../server/webSearch.ts';
import { buildSimpleDirectSystem, simpleSearchWaitMs, SIMPLE_SEARCH_DEADLINE_MS } from '../server/simpleDirectConversation.ts';

const trig = (userText) => ({ enabled: true, mode: 'auto', userText, userAskedSearch: false });

test('P126.12 item 1: live-data questions trigger search in direct mode', () => {
  for (const q of [
    'какие результаты выборов в США сегодня?',
    'сколько демократы получили мест в конгрессе?',
    'кто выиграл выборы губернатора в Вирджинии',
    'курс франка к евро',
    'какая погода в Осло',
    'новости Украины сегодня',
    'who won the governor election in Virginia?',
    'election results in Germany',
    'какой счёт матча Спартак Зенит',
    'how many seats did the Democrats get in the House?',
  ]) assert.equal(shouldSearchWeb(trig(q)), true, q);
});

test('P126.12 item 1: personal or timeless text does not trigger search', () => {
  for (const q of [
    'в последнее время я очень устал на работе',
    'объясни, как работает рекурсия в программировании',
    'напиши стихотворение про осень',
    'почему небо голубое?',
    'помоги составить план переезда',
  ]) assert.equal(shouldSearchWeb(trig(q)), false, q);
});

test('P126.12 item 2: wait is aligned with the 9 s search deadline', () => {
  assert.equal(SIMPLE_SEARCH_DEADLINE_MS, 9000);
  assert.equal(simpleSearchWaitMs({}), 8500);
  assert.equal(simpleSearchWaitMs({ SIMPLE_SEARCH_WAIT_MS: '3000' }), 3000);
  assert.equal(simpleSearchWaitMs({ SIMPLE_SEARCH_WAIT_MS: '60000' }), 9000);
  assert.equal(simpleSearchWaitMs({ SIMPLE_SEARCH_WAIT_MS: '10' }), 500);
  const block = formatSearchStatusBlock({ status: 'failed', reason: 'timeout' }, true, true);
  assert.match(block, /TIMED_OUT/);
  assert.match(block, /Tell the user/);
  const src = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(src, /timeoutMs: simpleSearchWaitMs\(\)/);
  assert.match(src, /Date\.now\(\) \+ SIMPLE_SEARCH_DEADLINE_MS/);
});

test('P126.12 item 3: prior turns reach search only for explicit follow-ups', () => {
  const prior = ['какая погода в Цюрихе', 'а завтра?'];
  assert.equal(searchContextForTurn('какие результаты выборов в США сегодня?', prior), '');
  assert.equal(searchContextForTurn('курс франка к евро', prior), '');
  assert.notEqual(searchContextForTurn('а завтра?', prior), '');
  assert.notEqual(searchContextForTurn('and in Celsius?', prior), '');
  assert.notEqual(searchContextForTurn('search again', prior), '');
  assert.equal(isContextDependentFollowup('кто выиграл выборы губернатора в Вирджинии'), false);
});

test('P126.12 item 4: system prompt carries the date and the capability rule', () => {
  const s = buildSimpleDirectSystem(new Date('2026-11-05T10:00:00Z'));
  assert.match(s, /2026-11-05/);
  assert.match(s, /Never claim that you have no internet access/);
  assert.match(s, /SEARCH STATUS/);
});
