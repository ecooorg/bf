/**
 * P119.0.4 — agent-owned prompt text, agent-named routes, client route choice.
 * GOLDEN hashes lock the current agent-owned prompt text. The P123.17 evidence-preservation updates intentionally changed shared dialogue prompts; these snapshots lock the reviewed post-update bytes.
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
const GOLDEN_STEP_PREFIX = '30fdcd3569a5ee1f2d8c4df7c091fe64b0958f70ae4a4afa790668b817e0e49b';
const GOLDEN = {
  "conversational:information": "ac17f16bd0b0ef3b31dfd8b27d0e4532066a419e2a3ca0237b362cd625b5d4da",
  "expert:information": "6b35eb0154015eca8aa2ce762ce7d36e4bad613b40eafd21f85464b6978fdcee",
  "conversational:decision": "6546223a87080a7b3a0ce541085eaa3c6aca4461a03c2a808357ab13da559b19",
  "expert:decision": "c00c8d514240fbc4cafafa8653c26400f48d52b274773584e80542a575b60c48",
  "conversational:research": "45d7e16b419f105614ae4190c0607910132d29f63f85e04b764583c45e1452cb",
  "expert:research": "0e20164babcce7a79b6414145b90fdbeb9df56686f5b320961feddbf25711430",
  "conversational:engineering": "6f8a83dee535827e3337b770f35483e323f509113abcc10961dca64bfff15801",
  "expert:engineering": "0039bb85c31fe89b39fa101503f9d88a799af14b9984cf7fbfe6580cdd3a43e5",
  "expertParagraph:unknown": "dee81076621e1bbaf42986a0a9b3dd9f7890196e373cfc473a28ab09c012089b",
  "expertParagraph:expand": "0e852e141bfa4feae2dd1239a965fa7f8ce15a6f02253999259a6cd6fca3763c"
};
const MODES = ['information', 'decision', 'research', 'engineering'];

test('agent-owned prompt bytes match the reviewed golden snapshots', () => {
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
