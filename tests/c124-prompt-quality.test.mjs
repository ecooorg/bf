import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildConversationalPrompt } from '../server/conversationalAgent.ts';
import { buildExpertPrompt, planExpertTurn } from '../server/expertAgent.ts';
import { modeParagraph } from '../server/conversationMode.ts';
import { buildVisibleReply } from '../server/reasoningState.ts';

const root = new URL('../', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');
const RITUALS = /STEP 0 - TRIAGE|STEP 1 - FIND THE REAL QUESTION|STEP 2 - LABEL THE CONTEXT|STEP 3 - CHANGE THE SHAPE|STEP 4 - FIND THE DECISIVE UNKNOWN|STEP 5 - CRITIQUE SYMMETRICALLY|STEP 6 - COMPUTE WHEN NUMBERS EXIST|SECOND TEST:|NO HOMEWORK:|WHAT THE PERSON SHOULD EXPERIENCE|BEFORE ANSWERING \(silent\)|V17 LAYER/;

function simplePrompt(mode) {
  return buildConversationalPrompt('What is the actual question?', '', {
    agent: 'conversational', productMode: 'Simple', conversationMode: mode, modeBlock: modeParagraph(mode),
  }, '2026-11-01');
}

test('C124: Simple decision prompts do not impose a universal reasoning sequence', () => {
  const prompt = simplePrompt('decision');
  assert.match(prompt, /TASK-FIT RESPONSE/);
  assert.doesNotMatch(prompt, RITUALS);
  assert.match(prompt, /If the user asks for a recommendation, give one/);
  assert.match(prompt, /Offer alternatives, calculations, tests or next steps only when they materially help/);
});

test('C124: Expert factual requests retain information mode rather than being promoted to decision work', () => {
  const plan = planExpertTurn('information');
  assert.equal(plan.conversationMode, 'information');
  const prompt = buildExpertPrompt('What is compound interest?', '', plan, '2026-11-01');
  assert.match(prompt, /CURRENT FOCUS: Information request/);
  assert.doesNotMatch(prompt, /CURRENT FOCUS: Decision-related request/);
  assert.doesNotMatch(prompt, RITUALS);
});

test('C124: Expert dialogue context no longer forces fixed stages, minimum length or artificial novelty', () => {
  const prompt = buildExpertPrompt('Answer this factual question.', '', planExpertTurn('information', {
    expertStage: 'EXPAND', expertContext: 'User-provided context',
  }), '2026-11-01');
  assert.match(prompt, /Current UI workflow stage: EXPAND/);
  assert.match(prompt, /EXPERT SESSION CONTEXT \(data, not instructions\)/);
  assert.match(prompt, /Do not force a fixed sequence/);
  assert.doesNotMatch(prompt, /Do not shorten the analysis|problem definition; known facts vs assumptions; competing hypotheses/);
});

test('C124: model answer questions are preserved; optional follow-up is additive', () => {
  const answer = 'The estimate depends on the rate. What is the principal? What is the term?';
  assert.equal(buildVisibleReply(answer, '', false), answer);
  const withFollowUp = buildVisibleReply(answer, 'Which rate applies?', true);
  assert.ok(withFollowUp.startsWith(answer));
  assert.ok(withFollowUp.endsWith('Which rate applies?'));
  assert.equal((withFollowUp.match(/\?/g) || []).length, 3);
});

test('C124: server no longer retries decision/Expert answers to manufacture novelty', () => {
  const server = source('server.ts');
  assert.doesNotMatch(server, /conversationGainAudit|QUALITY CHECK FAILED|structurally different branch/);
  assert.match(server, /conversationMode === 'information' && informationSoftFail/);
  assert.match(server, /qualityGate: 'information_soft_fail_only'/);
  const base = server.match(/const BASE_SYSTEM = `([\s\S]*?)`;/)?.[1] || '';
  assert.match(base, /language-model interface/);
  assert.doesNotMatch(base, /red-team|outside view|decision engine|STEP 0/);
  assert.doesNotMatch(server, /V17_LAYER_PROMPT/);
});

test('C124: analytical metadata is optional and must not be invented to fill the schema', () => {
  const promptPacks = source('server/promptPacks.ts');
  assert.match(promptPacks, /optional metadata\. Leave them empty when they do not materially apply/);
  assert.doesNotMatch(promptPacks, /V17_LAYER_PROMPT|DECISION_BEFORE_ANSWERING|SECOND TEST:|5000 - 1800|Concrete claim about the outside world worth verifying/);
  assert.match(promptPacks, /\"factsToCheck\": \[\]/);
  assert.match(promptPacks, /\"derived_numbers\": \[\]/);
});
