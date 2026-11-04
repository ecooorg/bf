import test from 'node:test';
import assert from 'node:assert/strict';
import {
  searchPlannerGate, shouldSearchWeb, isPlannerCandidate, isTimeSensitiveQuestion, isAssistantMetaQuestion, refersToDialogue,
  hasRecentSearchIntent, preClassifyLiveDataIntent, buildSearchDecision, formatSourceQuestionBlock,
} from '../server/webSearch.ts';

const trig = (userText, extra = {}) => ({ enabled: true, mode: 'auto', userText, userAskedSearch: false, ...extra });

test('P124.38 time-sensitive questions reach the planner even when no keyword trigger matches', () => {
  for (const q of ['экзит-пулы что говорят?', 'подробнее что в толидо произошло?', 'выборы прошли без происшествий?', 'what are they saying about the vote?', 'who won the final?']) {
    assert.equal(isTimeSensitiveQuestion(q), true, q);
    assert.equal(searchPlannerGate(trig(q)), true, q);
  }
});

test('P124.38 a short follow-up inside a live thread reaches the planner, outside a live thread it does not', () => {
  assert.equal(searchPlannerGate(trig('восточные штаты', { priorLiveThread: true })), true);
  assert.equal(searchPlannerGate(trig('восточные штаты')), false);
  assert.equal(hasRecentSearchIntent('экзит-пулы что говорят?'), true, 'a time-sensitive question is a live task');
});

test('P124.38 planner candidates exclude personal text, explicit-only deployments, attachments, distress and plain date questions', () => {
  assert.equal(searchPlannerGate(trig('что произошло с моим другом?')), false);
  assert.equal(searchPlannerGate(trig('Какое сегодня число?')), false);
  assert.equal(searchPlannerGate(trig('I am afraid of the exam tomorrow')), false);
  assert.equal(isPlannerCandidate(trig('экзит-пулы что говорят?', { mode: 'explicit' })), false);
  assert.equal(searchPlannerGate(trig('экзит-пулы что говорят?', { hasAttachments: true })), false);
  assert.equal(searchPlannerGate(trig('экзит-пулы что говорят?', { distress: true })), false);
  assert.equal(searchPlannerGate(trig('экзит-пулы что говорят?', { triage: 'CRISIS' })), false);
  assert.equal(searchPlannerGate(trig('Why did the Roman Empire fall?')), false);
});

test('P124.38 questions about the assistant\'s own sources are never searched', () => {
  const q = 'какие источники ты использовал когда говорил об этой новости?';
  assert.equal(isAssistantMetaQuestion(q), true);
  assert.equal(isAssistantMetaQuestion('which sources did you use for that?'), true);
  assert.equal(isAssistantMetaQuestion('where did you get that?'), true);
  assert.equal(shouldSearchWeb(trig(q, { recentSearchIntent: true })), false);
  assert.equal(searchPlannerGate(trig(q, { priorLiveThread: true })), false);
  assert.equal(preClassifyLiveDataIntent(q), null);
  assert.equal(isAssistantMetaQuestion('какие источники по теме доступны?'), false);
  assert.match(formatSourceQuestionBlock(), /not available here/);
  assert.match(formatSourceQuestionBlock(), /NEVER say that you have no internet access/);
});

test('P124.38 the pre-classifier does not search a bare reference to the dialogue', () => {
  const q = 'найди эту новость в новостях сша';
  assert.equal(refersToDialogue(q), true);
  assert.equal(preClassifyLiveDataIntent(q), null);
  assert.equal(refersToDialogue('find this news about the vote'), true);
  assert.notEqual(preClassifyLiveDataIntent('latest news about the election'), null, 'self-contained live topics still take the shortcut');
});

test('P124.38 planner outage: a dialogue reference is searched with the prior task, not its own words', async () => {
  const d = await buildSearchDecision({
    userText: 'найди эту новость в новостях сша',
    recentTurns: [
      { role: 'user', content: 'подробнее что в толидо произошло?' },
      { role: 'assistant', content: 'Reply.' },
    ],
    heuristic: () => false,
  });
  assert.equal(d.search, true);
  // P125.4+ may resolve the same case via live_task_followup (prior task retained).
  assert.ok(
    d.decisionNote === 'dialogue_reference_fallback' || d.decisionNote === 'live_task_followup',
    d.decisionNote,
  );
  assert.match(d.plan.query, /толидо/i);
});

test('P124.38 meta question short-circuits the decision without a model call', async () => {
  let called = false;
  const client = { models: { generateContent: async () => { called = true; return { text: '{}' }; } } };
  const d = await buildSearchDecision({ userText: 'откуда ты это взял?', recentTurns: [{ role: 'user', content: 'новости про выборы' }], client, heuristic: () => true });
  assert.equal(d.search, false);
  assert.equal(d.decisionNote, 'meta_question_about_answer');
  assert.equal(called, false);
});
