/**
 * P119.0.4 — agent-owned prompt text, agent-named routes, client route choice.
 * GOLDEN hashes were captured from the P119.0.3 implementation (promptPacks.buildSimpleConversationPrompt) BEFORE the
 * text moved into conversationalAgent.ts / expertAgent.ts. They prove the move changed no byte the model sees.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readRepoFile } from './_sources.mjs';
import { modeParagraph } from '../server/conversationMode.ts';
import { buildConversationalPrompt } from '../server/conversationalAgent.ts';
import { buildExpertPrompt, expertDialogueParagraph, EXPERT_STEP_PREFIX, EXPERT_STAGES } from '../server/expertAgent.ts';
import { CONVERSATION_ROUTES, pinConversationAgent, resolveConversationAgent } from '../server/agentRouting.ts';

const sha = (s) => createHash('sha256').update(s).digest('hex');
const GOLDEN_STEP_PREFIX = 'efff65492278763b8b39085771198262c296222714645e64078e90417262c29c';
const GOLDEN = {
  "conversational:information": "ac17f16bd0b0ef3b31dfd8b27d0e4532066a419e2a3ca0237b362cd625b5d4da",
  "expert:information": "6b35eb0154015eca8aa2ce762ce7d36e4bad613b40eafd21f85464b6978fdcee",
  "conversational:decision": "2dcdfba3d4edddc8be63471362c99e1969406d58557538aae8c431460bc20d92",
  "expert:decision": "cdca660e6fc2a15b912d8b0c72829aa3d197e3382d92163b65f3c8593f71ebd7",
  "conversational:research": "2b01ca9d770c470cd02c7b2279a870a29ca5a1991bdbceb791c69e2db36df2d4",
  "expert:research": "e6a446e5daba37e874aba54b91811e454365826a255243a863e82ce28f6237f7",
  "conversational:engineering": "def3f9ef2ab36c1e6eb488989f8978dd24d9877c3fc60c9ba74799eae4abe206",
  "expert:engineering": "95b4691f26acc9f3659c66face4ec31eba84af47d503fd311ae48c5ec7347f32",
  "expertParagraph:unknown": "dee81076621e1bbaf42986a0a9b3dd9f7890196e373cfc473a28ab09c012089b",
  "expertParagraph:expand": "0e852e141bfa4feae2dd1239a965fa7f8ce15a6f02253999259a6cd6fca3763c"
};
const MODES = ['information', 'decision', 'research', 'engineering'];

test('P119.0.4 prompt bytes are identical to the pre-move implementation (8 prompts, 2 paragraphs, step prefix)', () => {
  assert.equal(sha(EXPERT_STEP_PREFIX), GOLDEN_STEP_PREFIX);
  for (const m of MODES) {
    const cp = { agent: 'conversational', productMode: 'Simple', conversationMode: m, modeBlock: modeParagraph(m) };
    assert.equal(sha(buildConversationalPrompt('IN', 'ATT', cp, '2026-10-29')), GOLDEN[`conversational:${m}`], `conversational:${m}`);
    const ep = { agent: 'expert', productMode: 'Expert', conversationMode: m, modeBlock: `${modeParagraph(m)}\n\n${expertDialogueParagraph('EXPAND', 'Facts: a')}` };
    assert.equal(sha(buildExpertPrompt('IN', 'ATT', ep, '2026-10-29')), GOLDEN[`expert:${m}`], `expert:${m}`);
  }
  assert.equal(sha(expertDialogueParagraph('NOPE', '')), GOLDEN['expertParagraph:unknown']);
  assert.equal(sha(expertDialogueParagraph('EXPAND', 'Facts: a')), GOLDEN['expertParagraph:expand']);
  assert.ok(EXPERT_STAGES.length >= 9);
});

test('P119.0.4 agent text ownership: intros live in the agent files; promptPacks.ts holds only shared blocks', () => {
  const packs = readRepoFile('server/promptPacks.ts');
  const conv = readRepoFile('server/conversationalAgent.ts');
  const exp = readRepoFile('server/expertAgent.ts');
  assert.doesNotMatch(packs, /EXPERT_STEP_PREFIX|EXPERT_STAGES|expertDialogueParagraph|SIMPLE_INTRO|BiForge in (Simple|Expert) Mode|buildSimpleConversationPrompt|ProductMode/);
  assert.match(conv, /const CONVERSATIONAL_INTRO = `You are BiForge in Simple Mode/);
  assert.match(exp, /const EXPERT_INTRO = `You are BiForge in Expert Mode/);
  assert.match(exp, /export const EXPERT_STEP_PREFIX =/);
  assert.match(exp, /export function expertDialogueParagraph\(/);
  assert.doesNotMatch(conv, /Expert Mode|PRODUCT MODE: Expert|EXPERT_/);
  assert.doesNotMatch(exp, /BiForge in Simple Mode/);
  assert.match(readRepoFile('server.ts'), /import \{ EXPERT_STEP_PREFIX \} from '\.\/server\/expertAgent\.ts';/);
});

test('P119.0.4 route table and pin middleware: the route decides the agent, the rest of the body is untouched', () => {
  assert.deepEqual(CONVERSATION_ROUTES, { legacy: '/api/conversation', conversational: '/api/agent/conversational', expert: '/api/agent/expert' });
  const run = (agent, body) => { const req = { body }; let called = 0; pinConversationAgent(agent)(req, null, () => { called++; }); assert.equal(called, 1); return req.body; };
  assert.equal(run('expert', { brief: 1 }).productMode, 'Expert');
  assert.equal(run('expert', { productMode: 'Simple', x: 1 }).productMode, 'Expert');
  assert.equal(run('conversational', { productMode: 'Expert' }).productMode, 'Simple');
  assert.deepEqual(run('conversational', { brief: { decision: 'x' }, history: [1] }), { brief: { decision: 'x' }, history: [1], productMode: 'Simple' });
  for (const bad of [undefined, null, 'str', 7, ['Expert']]) {
    assert.deepEqual(run('conversational', bad), { productMode: 'Simple' });
    assert.equal(resolveConversationAgent(run('expert', bad)), 'expert');
  }
});

test('P119.0.4 server.ts registers exactly the paths of CONVERSATION_ROUTES (inventory-readable literals)', () => {
  const s = readRepoFile('server.ts');
  for (const p of Object.values(CONVERSATION_ROUTES)) assert.equal((s.match(new RegExp(`app\\.post\\('${p.replace(/\//g, '\\/')}',`, 'g')) || []).length, 1, p);
});

test('P119.0.4 client uses the agent-named routes; the legacy path is no longer called by the UI', async () => {
  const { chatRoute, isChatRoute, CONVERSATIONAL_CHAT_ROUTE, EXPERT_CHAT_ROUTE } = await import('../src/conversationRoutes.ts');
  assert.equal(CONVERSATIONAL_CHAT_ROUTE, CONVERSATION_ROUTES.conversational);
  assert.equal(EXPERT_CHAT_ROUTE, CONVERSATION_ROUTES.expert);
  assert.equal(chatRoute(true), CONVERSATION_ROUTES.expert);
  assert.equal(chatRoute(false), CONVERSATION_ROUTES.conversational);
  assert.equal(chatRoute(undefined), CONVERSATION_ROUTES.conversational);
  for (const p of Object.values(CONVERSATION_ROUTES)) assert.equal(isChatRoute(p), true, p);
  for (const p of ['/api/understand', '/api/expand', '/api/synthesis', '/api/projects']) assert.equal(isChatRoute(p), false, p);
  const screens = readRepoFile('src/ConversationScreens.tsx');
  assert.equal((screens.match(/chatRoute\(expert\)/g) || []).length, 2);
  assert.doesNotMatch(screens, /'\/api\/conversation'/);
  assert.doesNotMatch(readRepoFile('src/App.tsx'), /'\/api\/conversation'/);
});
