import test from 'node:test';
import assert from 'node:assert/strict';
import { needsFreshWebInfo, digestFromSerperResponse } from '../server/webSearch.ts';
import { modeParagraph, detectConversationMode } from '../server/conversationMode.ts';

test('P117.3 freshness triggers include intervening descriptors and version families', () => {
  for (const q of [
    'Какая сейчас актуальная LTS-версия Node.js?',
    'Какая сейчас актуальная LTS-версия Ubuntu?',
    'Какая последняя стабильная версия Python?',
    'What is the current stable Python version?',
    'What is the latest LTS version of Node.js?',
    'Какая актуальная версия Debian?',
    'Какая сейчас последняя версия PostgreSQL?',
    'What is the newest stable release of Firefox?',
    'Какая сейчас версия ядра Linux?',
    'Какая последняя версия .NET?',
  ]) assert.equal(needsFreshWebInfo(q), true, q);
});

test('P117.3 freshness trigger preserves private and timeless negative controls', () => {
  for (const q of [
    'В последнее время я стал хуже спать. Как наладить режим?',
    'Какая столица Австралии?',
    'Объясни, что такое LTS',
    'Я выбираю между переездом в Берлин и Варшаву',
    'What does stable mean in software?',
    'Расскажи о версии как понятии',
    'Мне в последнее время тревожно',
    'How do version numbers work?',
  ]) assert.equal(needsFreshWebInfo(q), false, q);
});

test('P117.3 Serper digest preserves dates on organic and news entries', () => {
  const r = digestFromSerperResponse({
    organic: [{ title: 'Release', snippet: 'Released today', date: 'Oct 27, 2026', link: 'https://example.com/article' }],
    news: [{ title: 'News', snippet: 'A concrete event', date: 'Oct 26, 2026', link: 'https://example.com/news/story' }],
  }, 'latest release');
  assert.match(r.digest, /date: Oct 27, 2026/);
  assert.match(r.digest, /date: Oct 26, 2026/);
});

test('P117.3 information prompt has no generic verification closer', () => {
  const p = modeParagraph('information');
  assert.doesNotMatch(p, /label them as general knowledge and worth verifying/i);
  assert.match(p, /Do not invent live measurements/);
});

test('P117.3 explicit research stems use Unicode-aware boundaries', () => {
  assert.equal(detectConversationMode('Сравни Берлин и Варшаву'), 'research');
  assert.notEqual(detectConversationMode('Я сравниваю варианты переезда'), 'research');
  assert.notEqual(detectConversationMode('Напомни, какие города сравниваем'), 'research');
});
