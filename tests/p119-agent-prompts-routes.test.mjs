/**
 * P119.0.4 — agent-owned prompt text, agent-named routes, client route choice.
 * GOLDEN hashes lock the reviewed prompt contracts. Expert information wording changed in P123.10; Expert decision wording changed in P123.12; Expert research wording
 * was aligned in P123.13. P123.15 aligns the remaining engineering and dialogue-paragraph snapshots with the same reviewed source contract.
 * Keep these snapshots exact so subsequent unreviewed prompt drift remains detectable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { readRepoFile } from './_sources.mjs';
import { modeParagraph } from '../server/conversationMode.ts';
import { buildConversationalPrompt } from '../server/conversationalAgent.ts';
import { buildExpertPrompt, expertDialogueParagraph, EXPERT_STEP_PREFIX, EXPERT_STAGES } from '../server/expertAgent.ts';
import { CONVERSATION_ROUTES, pinConversationAgent, resolveConversationAgent } from '../server/agentRouting.ts';

const sha = (s) => createHash('sha256').update(s).digest('hex');
const GOLDEN_STEP_PREFIX = '0dc8cdce3d35235c6e596af93b3988caa9cd576be44fe9923d382ff8f251e368';
const GOLDEN = {
  "conversational:information": "ac17f16bd0b0ef3b31dfd8b27d0e4532066a419e2a3ca0237b362cd625b5d4da",
  "expert:information": "90525cfce9a2010fdbd73e201de50b5f3414d5ba9296467aa117af20793881ac",
  "conversational:decision": "2dcdfba3d4edddc8be63471362c99e1969406d58557538aae8c431460bc20d92",
  "expert:decision": "1ef4e62e9c1f0d94bf87d613a810c8b201f8dad396f5cbc440392541126d8b66",
  "conversational:research": "2b01ca9d770c470cd02c7b2279a870a29ca5a1991bdbceb791c69e2db36df2d4",
  "expert:research": "21cac76f09f4541d462a1845b7b7f40b0a76a2482334728424cb9d28fbbe79cb",
  "conversational:engineering": "def3f9ef2ab36c1e6eb488989f8978dd24d9877c3fc60c9ba74799eae4abe206",
  "expert:engineering": "1121c970bf371e008c84d4dbe893af3129a64716efadd62b2ea6054af84cdcd9",
  "expertParagraph:unknown": "c9a7f250de5a96db6a49913d9ef107c630781ca8c859919e33e5a18c2c745c09",
  "expertParagraph:expand": "1ae85e750dac09cd3b856cd8ee4b29c5df9d55fc2e2d61776bcfe00721574912"
};
const MODES = ['information', 'decision', 'research', 'engineering'];

// Emit the complete matrix before assertions so one CI failure cannot hide later drift.
// The JSON artifact includes deterministic prompt inputs/outputs and the exact builder sources
// needed for semantic review; the paste summary carries the compact hash matrix.
function collectPromptSnapshotDiagnostics() {
  const actual = { 'expertStepPrefix': sha(EXPERT_STEP_PREFIX) };
  const prompts = {};
  for (const m of MODES) {
    const cp = { agent: 'conversational', productMode: 'Simple', conversationMode: m, modeBlock: modeParagraph(m) };
    const conversational = buildConversationalPrompt('IN', 'ATT', cp, '2026-10-29');
    const ep = { agent: 'expert', productMode: 'Expert', conversationMode: m, modeBlock: `${modeParagraph(m)}\n\n${expertDialogueParagraph('EXPAND', 'Facts: a')}` };
    const expert = buildExpertPrompt('IN', 'ATT', ep, '2026-10-29');
    actual[`conversational:${m}`] = sha(conversational);
    actual[`expert:${m}`] = sha(expert);
    prompts[`conversational:${m}`] = conversational;
    prompts[`expert:${m}`] = expert;
  }
  actual['expertParagraph:unknown'] = sha(expertDialogueParagraph('NOPE', ''));
  actual['expertParagraph:expand'] = sha(expertDialogueParagraph('EXPAND', 'Facts: a'));
  const sourcePaths = ['server/conversationMode.ts', 'server/conversationalAgent.ts', 'server/expertAgent.ts', 'server/promptPacks.ts'];
  const sources = Object.fromEntries(sourcePaths.map((file) => {
    const content = readRepoFile(file);
    return [file, { sha256: sha(content), content }];
  }));
  const diagnostic = {
    schemaVersion: 1,
    artifactType: 'prompt-snapshot-diagnostics',
    generatedAt: new Date().toISOString(),
    testInputs: { input: 'IN', attachmentsBlock: 'ATT', date: '2026-10-29', expertDialogue: 'EXPAND', expertFacts: 'Facts: a' },
    expected: { expertStepPrefix: GOLDEN_STEP_PREFIX, ...GOLDEN },
    actual,
    matches: Object.fromEntries(Object.entries(actual).map(([key, hash]) => [key, hash === (key === 'expertStepPrefix' ? GOLDEN_STEP_PREFIX : GOLDEN[key])])),
    prompts: Object.fromEntries(Object.entries(prompts).map(([key, text]) => [key, { sha256: sha(text), length: text.length, text }])),
    sources,
  };
  const outputDir = path.resolve(process.cwd(), process.env.CI_LOGS_DIR || 'artifacts/ci-checks');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'prompt-snapshot-diagnostics.json'), JSON.stringify(diagnostic, null, 2) + '\n');
  console.log(`PROMPT_SNAPSHOT_MATRIX=${JSON.stringify({ expected: diagnostic.expected, actual, matches: diagnostic.matches, sourceHashes: Object.fromEntries(Object.entries(sources).map(([file, value]) => [file, value.sha256])) })}`);
  return diagnostic;
}

test('agent prompt snapshots match the reviewed current prompt contracts (8 prompts, 2 paragraphs, step prefix)', () => {
  const diagnostic = collectPromptSnapshotDiagnostics();
  assert.equal(diagnostic.actual.expertStepPrefix, GOLDEN_STEP_PREFIX, 'expertStepPrefix');
  for (const m of MODES) {
    assert.equal(diagnostic.actual[`conversational:${m}`], GOLDEN[`conversational:${m}`], `conversational:${m}`);
    assert.equal(diagnostic.actual[`expert:${m}`], GOLDEN[`expert:${m}`], `expert:${m}`);
  }
  assert.equal(diagnostic.actual['expertParagraph:unknown'], GOLDEN['expertParagraph:unknown']);
  assert.equal(diagnostic.actual['expertParagraph:expand'], GOLDEN['expertParagraph:expand']);
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
