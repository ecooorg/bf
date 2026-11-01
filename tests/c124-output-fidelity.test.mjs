import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripUserFacingUrls, buildVisibleReply } from '../server/reasoningState.ts';
import { detectUserIntentFlags } from '../server/intentFlags.ts';

const root = new URL('../', import.meta.url);
const serverSource = readFileSync(new URL('server.ts', root), 'utf8');

test('C124: automatic source URLs stay hidden when the user did not request links', () => {
  const answer = 'The station is open today. Source: https://example.test/station';
  assert.equal(stripUserFacingUrls(answer), 'The station is open today.');
});

test('C124: explicit request for a link preserves model-provided URLs', () => {
  const flags = detectUserIntentFlags('Дай ссылку на официальный сайт.');
  assert.equal(flags.userAskedLinks, true);
  assert.equal(flags.userForbadeLinks, false);
  const answer = '[Official site](https://example.test)';
  assert.equal(stripUserFacingUrls(answer, flags.userAskedLinks && !flags.userForbadeLinks), answer);
});

test('C124: an explicit no-links instruction overrides an earlier link request', () => {
  const flags = detectUserIntentFlags('Без ссылок, просто объясни.', [
    { role: 'user', content: 'Дай ссылку на официальный сайт.' },
  ]);
  assert.equal(flags.userAskedLinks, false);
  assert.equal(flags.userForbadeLinks, true);
});

test('C124: a later explicit link request overrides an earlier no-links preference', () => {
  const flags = detectUserIntentFlags('Теперь дай ссылку на официальный сайт.', [
    { role: 'user', content: 'Без ссылок, просто объясни.' },
  ]);
  assert.equal(flags.userAskedLinks, true);
  assert.equal(flags.userForbadeLinks, false);
});

test('C124: model-authored answer text is not passed through broad Markdown or legacy-label stripping', () => {
  assert.match(serverSource, /const cleanReply = stripUserFacingUrls\(\s*scrubInternalLabels\(out\.reply\)/);
  assert.doesNotMatch(serverSource, /stripMarkdown\(scrubInternalLabels\(out\.reply\)/);
  assert.match(serverSource, /const cleanDoc = \(t: string\) => scrubInternalLabels\(t\)/);
  assert.doesNotMatch(serverSource, /stripMarkdown/);
  assert.doesNotMatch(serverSource, /Split\[- _\]\?base\|Sequence\|Timing/);
  assert.match(serverSource, /intentFlags\.userAskedLinks && !intentFlags\.userForbadeLinks/);
});

test('C124: Expert workflow prompts no longer force arbitrary output quotas', () => {
  assert.doesNotMatch(serverSource, /exactly 3[–-]5 additional options|3[–-]5 strongest objections|3[–-]5 strong objections|5[–-]8 most plausible causes|Exactly 5 paragraphs|250[–-]350 words|Find the 1-5 uncertainties|produce 2-4 specific actions|Chance \(area "LUCK"\) is the last question|synthesisIssues|synthesis-retry|FORMAT CHECK FAILED on the previous draft/);
  assert.match(serverSource, /Return JSON: \{[\s\S]*?"options": \[/);
  assert.match(serverSource, /"paragraphs": \["\.\.\."\]/);
  assert.match(serverSource, /"questions": \[\{"area":"DATA"/);
});

test('C124: adding a follow-up never removes any of the model answer', () => {
  const answer = 'A complete answer. First question? Second question?';
  const result = buildVisibleReply(answer, 'A separate follow-up?', true);
  assert.ok(result.startsWith(answer));
  assert.ok(result.endsWith('A separate follow-up?'));
});
