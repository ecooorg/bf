import test from 'node:test';
import assert from 'node:assert/strict';
import { planExpertTurn } from '../server/expertAgent.ts';
import { buildVisibleReply } from '../server/reasoningState.ts';

test('C124: factual Expert requests remain classified as information', () => {
  assert.equal(planExpertTurn('information').conversationMode, 'information');
});

test('C124: model answer questions are preserved; optional follow-up is additive', () => {
  const answer = 'The estimate depends on the rate. What is the principal? What is the term?';
  assert.equal(buildVisibleReply(answer, '', false), answer);
  const withFollowUp = buildVisibleReply(answer, 'Which rate applies?', true);
  assert.ok(withFollowUp.startsWith(answer));
  assert.ok(withFollowUp.endsWith('Which rate applies?'));
  assert.equal((withFollowUp.match(/\?/g) || []).length, 3);
});

