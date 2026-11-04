/**
 * P126.5 — User-level validation gate (C126 §12.D / §13 P126.4).
 *
 * Live dual-run comparison against direct Gemini is NOT claimed here.
 * These checks lock the enablement policy and architectural invariants
 * that the validation ledger in docs/C126_USER_LEVEL_VALIDATION.md depends on.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('P126.5: Simple Direct remains opt-in via BIFORGE_GEMINI_DIRECT_MODE', () => {
  const server = read('server.ts');
  assert.match(
    server,
    /if \(process\.env\.BIFORGE_GEMINI_DIRECT_MODE === 'true' && req\.body\?\.productMode !== 'Expert' && !distressMarkerDetected\)/,
    'direct branch must require the env flag',
  );
  // Features probe reports the flag honestly.
  assert.match(server, /directGeminiMode:\s*process\.env\.BIFORGE_GEMINI_DIRECT_MODE === 'true'/);
});

test('P126.5: validation ledger exists and records enablement KEEP GATED', () => {
  const doc = read('docs/C126_USER_LEVEL_VALIDATION.md');
  assert.match(doc, /KEEP GATED/);
  assert.match(doc, /BIFORGE_GEMINI_DIRECT_MODE/);
  assert.match(doc, /NOT_RUN/);
  assert.match(doc, /OBSERVED/);
  // Thirty comparative scenarios are catalogued.
  for (const n of [1, 15, 30]) {
    assert.match(doc, new RegExp(`\\|\\s*${n}\\s*\\|`), `scenario ${n} missing from matrix`);
  }
});

test('P126.5: direct branch still excludes legacy intelligence stages', () => {
  const server = read('server.ts');
  const handlerStart = server.indexOf('const conversationHandler =');
  const gate = server.indexOf("BIFORGE_GEMINI_DIRECT_MODE === 'true'", handlerStart);
  const intent = server.indexOf('const intentFlags = detectUserIntentFlags', handlerStart);
  const directReturn = server.indexOf('return ok(res, {', gate);
  assert.ok(handlerStart >= 0 && gate > handlerStart, 'gate inside conversation handler');
  assert.ok(directReturn > gate && directReturn < intent, 'direct path returns before intentFlags');
  const directSlice = server.slice(gate, directReturn);
  for (const banned of [
    'detectConversationMode',
    'detectUserIntentFlags',
    'runEpistemicVerifier',
    'buildSearchDecision',
    'informationSoftFail',
    'informationRetryHint',
  ]) {
    assert.equal(directSlice.includes(banned), false, `direct branch must not call ${banned}`);
  }
  assert.match(directSlice, /handleSimpleDirectConversation/);
});

test('P126.5: Expert and Architect isolation markers remain', () => {
  const server = read('server.ts');
  assert.match(server, /app\.post\('\/api\/agent\/expert'/);
  assert.match(server, /pinConversationAgent\('expert'\)/);
  // Architect must not be rewritten by Simple Direct.
  assert.doesNotMatch(server, /Architect.*handleSimpleDirectConversation/);
});

test('P126.5: empty model output is not promoted to a successful reply', async () => {
  const { handleSimpleDirectConversation, normalizeSimpleDirectReply } = await import('../server/simpleDirectConversation.ts');
  assert.equal(normalizeSimpleDirectReply(''), '');
  assert.equal(normalizeSimpleDirectReply('   '), '');
  await assert.rejects(
    handleSimpleDirectConversation(
      { latestUserMessage: 'q', history: [] },
      async () => ({ text: '  ', model: 'm', durationMs: 1, keySlot: 0, keyAttempts: 1 }),
    ),
    /empty response/i,
  );
});

test('P126.5: .env.example documents the flag as opt-in', () => {
  const env = read('.env.example');
  assert.match(env, /BIFORGE_GEMINI_DIRECT_MODE/);
});
