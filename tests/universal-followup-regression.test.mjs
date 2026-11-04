/** Cross-domain conversational search regressions. These protect generic context resolution, not domain answers. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSearchDecision, contextualizeSearchText, hasRecentSearchIntent, isSearchFollowup,
} from '../server/webSearch.ts';

const cases = [
  {
    domain: 'software releases',
    prior: 'What is the latest stable Node.js LTS version?',
    followup: 'Run another search and verify the exact release.',
    retained: ['Node', 'LTS'],
  },
  {
    domain: 'travel schedules',
    prior: 'Find the current direct train schedule from Zurich to Milan for Friday.',
    followup: 'Check another source and give me the precise departure times.',
    retained: ['Zurich', 'Milan', 'Friday'],
  },
  {
    domain: 'product availability',
    prior: 'Find current availability and prices for Sony WH-1000XM6 in Switzerland.',
    followup: 'Search again and compare the exact offers.',
    retained: ['Sony WH-1000XM6', 'Switzerland'],
  },
  {
    domain: 'public policy',
    prior: 'What are the current EU rules for AI Act implementation deadlines?',
    followup: 'Verify this with primary sources and more precise dates.',
    retained: ['EU', 'AI Act'],
  },
  {
    domain: 'business research',
    prior: 'Find the latest annual revenue reported by ASML for its most recent fiscal year.',
    followup: 'Please repeat the search and confirm the exact figure.',
    retained: ['ASML', 'revenue'],
  },
  {
    domain: 'weather (one ordinary domain among many)',
    prior: 'What is the current weather in Zurich and Washington DC?',
    followup: 'Выполни ещё один поиск и найди более точные проверенные данные в этих двух городах.',
    retained: ['Zurich', 'Washington DC'],
  },
];

test('cross-domain follow-ups retain the prior user task and its named entities', () => {
  for (const item of cases) {
    assert.equal(isSearchFollowup(item.followup), true, item.domain);
    const resolved = contextualizeSearchText(item.followup, item.prior);
    for (const token of item.retained) assert.match(resolved.toLowerCase(), new RegExp(token.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), item.domain);
  }
});

test('model-planner absence or provider failure still returns a contextual search plan', async () => {
  for (const item of cases) {
    for (const client of [undefined, { models: { generateContent: async () => { throw new Error('429 quota'); } } }]) {
      const decision = await buildSearchDecision({
        userText: item.followup,
        recentTurns: [{ role: 'user', content: item.prior }, { role: 'assistant', content: 'Here is the initial result.' }],
        client,
        heuristic: () => false,
      });
      assert.equal(decision.search, true, item.domain);
      assert.equal(decision.decisionSource, 'heuristic', item.domain);
      // P125.4+: live_task_followup supersedes contextual_followup_fallback for the same behaviour.
      assert.ok(
        decision.decisionNote === 'live_task_followup' || decision.decisionNote === 'contextual_followup_fallback',
        `${item.domain}: unexpected decisionNote ${decision.decisionNote}`,
      );
      assert.ok(decision.plan?.query, item.domain);
      for (const token of item.retained) assert.ok(decision.plan.query.toLowerCase().includes(token.toLowerCase()), item.domain);
      assert.doesNotMatch(decision.plan.query, /initial result/i, 'assistant output must not leak into the search query');
    }
  }
});

test('recent current-information intent makes an elliptical follow-up eligible for search', () => {
  assert.equal(hasRecentSearchIntent('What is the latest stable Node.js LTS version?'), true);
  assert.equal(hasRecentSearchIntent('Explain what a compiler is.'), false);
});

test('unrelated new turns do not inherit the previous task', () => {
  const resolved = contextualizeSearchText('Explain how photosynthesis works.', 'What is the latest stable Node.js LTS version?');
  assert.equal(resolved, 'Explain how photosynthesis works.');
  const afterTopicSwitch = contextualizeSearchText('Run another search and verify the result.', 'What is the latest stable Node.js LTS version?\nExplain how photosynthesis works.');
  assert.equal(afterTopicSwitch, 'Run another search and verify the result.');
});

test('search decision does not revive an older lookup after a topic switch', async () => {
  const decision = await buildSearchDecision({
    userText: 'Run another search and verify the result.',
    recentTurns: [
      { role: 'user', content: 'What is the latest stable Node.js LTS version?' },
      { role: 'assistant', content: 'Here is the result.' },
      { role: 'user', content: 'Explain how photosynthesis works.' },
    ],
    heuristic: () => false,
  });
  assert.equal(decision.search, false);
});

test('private data in a contextual query remains excluded by the search planner', async () => {
  const decision = await buildSearchDecision({
    userText: 'Search again using this phone number 079 123 45 67',
    recentTurns: [{ role: 'user', content: 'Find the current opening hours of the museum.' }],
    heuristic: () => true,
  });
  assert.equal(decision.search, false);
});
