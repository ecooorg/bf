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
const GOLDEN_STEP_PREFIX = 'ddf3dee253485ce076127abf347bff2e8477a41e2fff87e645ecb03ef71516a2';
const GOLDEN = {
  "conversational:information": "5c3340389cdd55914c83281398fea387f44e27c502127086a0a62f8f6ba8a078",
  "expert:information": "be1dd3ec66ebd908f2b5b96a1d42493651b141454a342a2d77759258bb6ed92f",
  "conversational:decision": "ba1e8d072eb0ea8b9818369819e3a4f2565216bf1691fcbf081bccfcf1624415",
  "expert:decision": "2544fc34d3289c7558c2ccf7d1e30fdc32623216edc1efb3db7d8cca73d34423",
  "conversational:research": "f70855218aa6b4b30ad7142b3b912b5cb69b7f1edf95b034421ee1efffde65a5",
  "expert:research": "e14934aefde44024edb7d4c086cf6486f0e5ae75687d937766f71c1759d49fb6",
  "conversational:engineering": "629ef8771a9a0d6cf15a0da9c8d9325534adc4a591d39df6a800756d8bf6f12d",
  "expert:engineering": "c52a69fed1bb36d8725e09a0e86253daa3468c3ddd96a38cec8d7b8b6c26cb9e",
  "expertParagraph:unknown": "f0109360cbb7dcf550e183440caf1a015fe878fc1d2be2557f44421977424324",
  "expertParagraph:expand": "7b012347f3a4325ffcd23557946ecc16583284671511aafdfae5f1f0eb94fcb5"
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
