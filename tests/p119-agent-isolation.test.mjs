/**
 * P119.0.3 — Conversational / Expert agent isolation on POST /api/conversation.
 * Behaviour must be byte-identical to the pre-split implementation (reference re-implemented below from the
 * pre-P119.0.3 server.ts logic); only ownership of the code changed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readRepoFile } from './_sources.mjs';
import { detectConversationMode, modeParagraph } from '../server/conversationMode.ts';
import { buildSimpleConversationPrompt, expertDialogueParagraph } from '../server/promptPacks.ts';
import { resolveConversationAgent, planConversationTurn, buildConversationTurnPrompt } from '../server/agentRouting.ts';
import { planConversationalTurn, buildConversationalPrompt } from '../server/conversationalAgent.ts';
import { planExpertTurn, buildExpertPrompt } from '../server/expertAgent.ts';

/** Reference = exact logic of the removed server.ts block (P52). */
function legacyPlan(body, detectedMode) {
  const productMode = body?.productMode === 'Expert' ? 'Expert' : 'Simple';
  const conversationMode = productMode === 'Expert' && detectedMode === 'information' ? 'decision' : detectedMode;
  const modeBlock = productMode === 'Expert'
    ? `${modeParagraph(conversationMode)}\n\n${expertDialogueParagraph(String(body?.expertStage || ''), typeof body?.expertContext === 'string' ? body.expertContext : '')}`
    : modeParagraph(conversationMode);
  return { productMode, conversationMode, modeBlock };
}

const BODIES = [
  undefined, null, {}, { productMode: 'Simple' }, { productMode: 'expert' }, { productMode: ' Expert' },
  { productMode: true }, { productMode: ['Expert'] }, { productMode: 'Architect' }, { productMode: 'Project' },
  { productMode: 'Expert' },
  { productMode: 'Expert', expertStage: 'EXPAND', expertContext: 'Goal: ship\nRisk: time' },
  { productMode: 'Expert', expertStage: 'NOT_A_STAGE', expertContext: 42 },
  { expertStage: 'EXPAND', expertContext: 'ignored without productMode' },
];
const MODES = ['information', 'decision', 'research', 'engineering'];

test('P119.0.3 agent resolution: Expert iff productMode === "Expert"', () => {
  for (const b of BODIES) {
    assert.equal(resolveConversationAgent(b), b?.productMode === 'Expert' ? 'expert' : 'conversational', JSON.stringify(b));
  }
  assert.equal(resolveConversationAgent('Expert'), 'conversational');
  assert.equal(resolveConversationAgent(7), 'conversational');
});

test('P119.0.3 planner output equals the pre-split logic for every body × detected mode', () => {
  for (const b of BODIES) for (const m of MODES) {
    const got = planConversationTurn(b, m);
    const want = legacyPlan(b, m);
    assert.equal(got.productMode, want.productMode, JSON.stringify([b, m]));
    assert.equal(got.conversationMode, want.conversationMode);
    assert.equal(got.modeBlock, want.modeBlock);
  }
});

test('P119.0.3 prompt text is byte-identical to the pre-split builder', () => {
  const input = 'User brief and conversation: hello';
  for (const b of BODIES) for (const m of MODES) {
    const plan = planConversationTurn(b, m);
    const want = legacyPlan(b, m);
    const ref = buildSimpleConversationPrompt(input, 'ATT', want.modeBlock, '2026-10-29', want.conversationMode, want.productMode);
    assert.equal(buildConversationTurnPrompt(input, 'ATT', plan, '2026-10-29'), ref);
  }
});

test('P119.0.3 Expert never gets the information contract; Conversational keeps it', () => {
  assert.equal(planExpertTurn('information').conversationMode, 'decision');
  assert.equal(planConversationalTurn('information').conversationMode, 'information');
  for (const m of ['decision', 'research', 'engineering']) {
    assert.equal(planExpertTurn(m).conversationMode, m);
    assert.equal(planConversationalTurn(m).conversationMode, m);
  }
});

test('P119.0.3 Conversational plan carries no Expert stage/method text; Expert plan does', () => {
  const c = planConversationTurn({ expertStage: 'EXPAND', expertContext: 'SECRET-METHOD-STATE' }, 'decision');
  assert.equal(c.agent, 'conversational');
  assert.doesNotMatch(c.modeBlock, /PRODUCT MODE: Expert|SECRET-METHOD-STATE/);
  const e = planConversationTurn({ productMode: 'Expert', expertStage: 'EXPAND', expertContext: 'SECRET-METHOD-STATE' }, 'decision');
  assert.equal(e.agent, 'expert');
  assert.match(e.modeBlock, /PRODUCT MODE: Expert/);
  assert.match(e.modeBlock, /SECRET-METHOD-STATE/);
});

test('P119.0.3 each agent entry builds its own prompt and rejects the other plan shape by construction', () => {
  const cp = planConversationalTurn('decision');
  const ep = planExpertTurn('decision');
  assert.match(buildConversationalPrompt('x', '', cp, '2026-10-29'), /BiForge in Simple Mode/);
  assert.match(buildExpertPrompt('x', '', ep, '2026-10-29'), /BiForge in Expert Mode/);
  assert.doesNotMatch(buildExpertPrompt('x', '', ep, '2026-10-29'), /BiForge in Simple Mode/);
});

test('P119.0.3 import isolation: agents do not import each other, the router, server.ts or Architect modules', () => {
  const bad = /from '\.\/(expertAgent|conversationalAgent|agentRouting|projectRoutes|projectRepository|codeTaskService|appBuilder\w*)\.ts'|from '\.\.\/(server|appBuilder)/;
  for (const f of ['server/conversationalAgent.ts', 'server/expertAgent.ts']) {
    assert.doesNotMatch(readRepoFile(f), bad, f);
  }
  const router = readRepoFile('server/agentRouting.ts');
  assert.match(router, /from '\.\/conversationalAgent\.ts'/);
  assert.match(router, /from '\.\/expertAgent\.ts'/);
  assert.doesNotMatch(router, /projectRoutes|appBuilder|ProjectMode/);
});

test('P119.0.3 server.ts no longer builds conversation prompts or Expert paragraphs itself', () => {
  const s = readRepoFile('server.ts');
  assert.doesNotMatch(s, /buildSimpleConversationPrompt|expertDialogueParagraph|function buildConversationPrompt/);
  assert.match(s, /from '\.\/server\/agentRouting\.ts'/);
});

test('P119.0.3 user-facing copy uses only Conversational / Expert / Architect (no Simple chat / Project workspace)', () => {
  const guide = readRepoFile('src/UserGuide.tsx');
  const app = readRepoFile('src/App.tsx');
  for (const legacy of ['Simple chat', 'Simple mode', 'Project mode', 'Project Mode', 'Project workspace', 'Expert method', 'all three BiForge modes']) {
    assert.ok(!guide.includes(legacy), `UserGuide still says "${legacy}"`);
  }
  assert.doesNotMatch(app, /Open Project\?/);
  assert.doesNotMatch(app, /Simple and Expert conversations/);
  assert.match(guide, /Conversational/);
  assert.match(guide, /Architect/);
});

test('P119.0.3 typecheck scripts run tsc with a larger stack (intermittent RangeError mitigation)', async () => {
  const { readFileSync } = await import('node:fs');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  for (const k of ['typecheck', 'lint', 'build:server']) {
    assert.match(pkg.scripts[k], /--stack-size=4000 node_modules\/typescript\/bin\/tsc/, k);
  }
});
