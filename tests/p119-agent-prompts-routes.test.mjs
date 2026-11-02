/**
 * P119.0.4 — agent module ownership, agent-named routes, and client route choice.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readRepoFile } from './_sources.mjs';
import { CONVERSATION_ROUTES, pinConversationAgent, resolveConversationAgent } from '../server/agentRouting.ts';

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
