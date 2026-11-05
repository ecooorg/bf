import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const directModule = readFileSync(new URL('../server/simpleDirectConversation.ts', import.meta.url), 'utf8');

test('P126.1: Simple Direct handler runs before intent, search planning, and response audits', () => {
  const handlerStart = server.indexOf('const conversationHandler =');
  const directStart = server.indexOf("if (req.body?.productMode !== 'Expert' && !distressMarkerDetected)", handlerStart);
  const intentStart = server.indexOf('const intentFlags = detectUserIntentFlags', handlerStart);
  assert.ok(directStart > handlerStart && directStart < intentStart);
  assert.match(server.slice(directStart, intentStart), /handleSimpleDirectConversation\(/);
  assert.doesNotMatch(server.slice(directStart, intentStart), /detectUserIntentFlags|detectConversationMode|buildSearchDecision|runEpistemicVerifier|informationSoftFail/);
  assert.match(server, /app\.post\('\/api\/agent\/expert', pinConversationAgent\('expert'\), conversationHandler\)/);
});

test('P126.1: Gemini direct generation uses existing key and model carousel without JSON mode or rewrite', () => {
  const helper = server.match(/async function generateGeminiPassThrough[\s\S]*?\n}\n/)?.[0] || '';
  assert.ok(helper);
  assert.match(helper, /registryForGeminiCascade\('STRONG'\)/);
  assert.match(helper, /callWithKeyPool\(/);
  assert.match(helper, /pool: geminiPool/);
  assert.match(helper, /systemInstruction: buildSimpleDirectSystem\(\)/);
  assert.doesNotMatch(helper, /responseMimeType|parseJson|retryPrompt|runEpistemicVerifier/);
  assert.match(directModule, /export async function handleSimpleDirectConversation/);
});

test('P126.1: BYOK remains direct and is not replaced by an organisational key', () => {
  const helper = server.match(/async function generateGeminiPassThrough[\s\S]*?\n}\n/)?.[0] || '';
  assert.match(helper, /if \(byokKey\) return/);
  assert.match(helper, /callWithKeyPool/);
});
