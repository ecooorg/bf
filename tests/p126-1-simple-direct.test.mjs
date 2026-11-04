import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSimpleDirectPrompt, handleSimpleDirectConversation, normalizeSimpleDirectReply, SIMPLE_DIRECT_SYSTEM } from '../server/simpleDirectConversation.ts';

test('Simple Direct prompt preserves natural multi-turn history and attachment text', () => {
  const prompt = buildSimpleDirectPrompt({
    latestUserMessage: 'And what about the second option?',
    history: [
      { role: 'user', content: 'Compare two approaches.' },
      { role: 'assistant', content: 'Approach A and approach B.' },
    ],
    attachmentText: 'report.pdf: revenue was stable',
  });
  assert.match(prompt, /User: Compare two approaches\./);
  assert.match(prompt, /Assistant: Approach A and approach B\./);
  assert.match(prompt, /Latest user message:\nAnd what about the second option\?/);
  assert.match(prompt, /report\.pdf: revenue was stable/);
});

test('Simple Direct normalization rejects empty model output without manufacturing a reply', () => {
  assert.equal(normalizeSimpleDirectReply('  useful answer  '), 'useful answer');
  assert.equal(normalizeSimpleDirectReply('  '), '');
  assert.equal(normalizeSimpleDirectReply(null), '');
});

test('Simple route returns before the legacy intelligence pipeline; Expert remains routed separately', () => {
  const source = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  const handlerStart = source.indexOf('const conversationHandler =');
  const directStart = source.indexOf('if (req.body?.productMode !== \'Expert\' && !distressMarkerDetected)', handlerStart);
  const intentStart = source.indexOf('const intentFlags = detectUserIntentFlags', handlerStart);
  const directReturn = source.indexOf('return ok(res, {', directStart);
  assert.ok(handlerStart >= 0 && directStart > handlerStart);
  assert.ok(directReturn > directStart && directReturn < intentStart);
  assert.match(source, /handleSimpleDirectConversation\(/);
  assert.match(source, /app\.post\('\/api\/agent\/expert', pinConversationAgent\('expert'\), conversationHandler\)/);
  assert.match(SIMPLE_DIRECT_SYSTEM, /honest/i);
});

test('Simple Direct handler makes exactly one generation call and returns the model text unchanged', async () => {
  const calls = [];
  const result = await handleSimpleDirectConversation({
    latestUserMessage: 'What follows from that?',
    history: [{ role: 'user', content: 'First question' }, { role: 'assistant', content: 'First answer' }, { role: 'user', content: 'What follows from that?' }],
    attachmentText: 'notes.txt: source text',
    byokKey: 'user-key',
    preferredModel: 'preferred-model',
    attachmentParts: [{ text: 'file part' }],
  }, async (...args) => {
    calls.push(args);
    return { text: '  The direct answer.  ', model: 'gemini-model', durationMs: 12, keySlot: -1, keyAttempts: 1 };
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /First question/);
  assert.match(calls[0][0], /First answer/);
  assert.match(calls[0][0], /notes\.txt: source text/);
  assert.equal(calls[0][1], 'user-key');
  assert.equal(calls[0][2], 'preferred-model');
  assert.deepEqual(calls[0][3], [{ text: 'file part' }]);
  assert.equal(calls[0][4], false);
  assert.equal(result.reply, 'The direct answer.');
});

test('Simple Direct handler rejects empty Gemini output', async () => {
  await assert.rejects(handleSimpleDirectConversation({
    latestUserMessage: 'Question', history: [],
  }, async () => ({ text: '   ', model: 'gemini-model', durationMs: 1, keySlot: 0, keyAttempts: 1 })), /empty response/i);
});
