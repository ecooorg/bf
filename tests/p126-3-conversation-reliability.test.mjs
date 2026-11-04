import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EventEmitter } from 'node:events';
import { buildSimpleDirectPrompt, handleSimpleDirectConversation } from '../server/simpleDirectConversation.ts';
import { observeSimpleResponseDelivery, simpleConversationMetricDetails } from '../server/simpleConversationDiagnostics.ts';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('P126.3: three dependent turns reach Gemini in natural chronological order', async () => {
  const history = [
    { role: 'user', content: 'I have two options: A and B.' },
    { role: 'assistant', content: 'A is cheaper; B is faster.' },
    { role: 'user', content: 'I prefer lower cost.' },
    { role: 'assistant', content: 'Then A is the better fit.' },
    { role: 'user', content: 'What risk should I check before choosing A?' },
  ];
  const prompt = buildSimpleDirectPrompt({ latestUserMessage: history.at(-1).content, history });
  assert.ok(prompt.indexOf('I have two options: A and B.') < prompt.indexOf('A is cheaper; B is faster.'));
  assert.ok(prompt.indexOf('A is cheaper; B is faster.') < prompt.indexOf('I prefer lower cost.'));
  assert.ok(prompt.indexOf('I prefer lower cost.') < prompt.indexOf('Then A is the better fit.'));
  assert.match(prompt, /Latest user message:\nWhat risk should I check before choosing A\?/);
});

test('P126.3: PDF/image attachment payloads are forwarded unchanged with the direct request', async () => {
  const parts = [
    { text: 'Attached file: scan.pdf' },
    { inlineData: { mimeType: 'application/pdf', data: 'cGRmLWRhdGE=' } },
    { text: 'Attached file: photo.png' },
    { inlineData: { mimeType: 'image/png', data: 'aW1hZ2UtZGF0YQ==' } },
  ];
  let received;
  const result = await handleSimpleDirectConversation({
    latestUserMessage: 'Summarize the attached files.',
    history: [{ role: 'user', content: 'Summarize the attached files.' }],
    attachmentText: 'scan.pdf and photo.png',
    attachmentParts: parts,
  }, async (...args) => {
    received = args;
    return { text: 'Both files were reviewed.', model: 'gemini-2.5-flash', durationMs: 20, keySlot: 2, keyAttempts: 2, modelRotations: 1 };
  });
  assert.deepEqual(received[3], parts);
  assert.equal(result.reply, 'Both files were reviewed.');
  assert.equal(result.keySlot, 2);
  assert.equal(result.keyAttempts, 2);
  assert.equal(result.modelRotations, 1);
});

test('P126.3: retry resends pending text and attachments without duplicating the user turn', () => {
  const ui = read('../src/ConversationScreens.tsx');
  assert.match(ui, /const baseHistory = fromRetry && waitingForAssistant \? history\.slice\(0, -1\) : history/);
  assert.match(ui, /send\(p\.text, p\.intent, true, p\.files\)/);
  assert.match(ui, /pendingSend/);
  assert.match(ui, /aria-label="Retry"/);
});

test('P126.3: BYOK remains isolated and API/model carousel remains the sole direct transport', () => {
  const server = read('../server.ts');
  const direct = server.slice(server.indexOf('async function generateGeminiPassThrough'), server.indexOf('async function generate('));
  assert.match(direct, /if \(byokKey\) return .*call\(byokKey, -1\)/);
  assert.doesNotMatch(direct, /byokKey[^\n]*\|\|\s*apiKey/);
  assert.match(direct, /callWithKeyPool/);
  assert.match(direct, /registryForGeminiCascade\('STRONG'\)/);
  assert.match(direct, /conversation_key_rotations/);
  assert.match(direct, /conversation_model_rotations/);
});

test('P126.3: distress safety and Expert routing remain outside Simple direct branch', () => {
  const server = read('../server.ts');
  assert.match(server, /BIFORGE_GEMINI_DIRECT_MODE === 'true' && req\.body\?\.productMode !== 'Expert' && !distressMarkerDetected/);
  assert.match(server, /hasDistressMarker\(lastUserText\)/);
  assert.match(server, /app\.post\('\/api\/agent\/expert', pinConversationAgent\('expert'\), conversationHandler\)/);
  assert.match(server, /SafetyBox/);
});

test('P126.3: diagnostics export includes the new reliability events', () => {
  const diagnostics = read('../server/conversationDiagnostics.ts');
  assert.match(diagnostics, /startsWith\('conversation_'\)/);
  assert.match(diagnostics, /startsWith\('simple_direct_'\)/);
  const server = read('../server.ts');
  for (const event of [
    'conversation_requests', 'conversation_model_success', 'conversation_model_failures',
    'conversation_key_rotations', 'conversation_model_rotations',
    'conversation_search_failures', 'conversation_search_degraded',
  ]) assert.ok(server.includes(event), `missing ${event}`);
});

test('P126.3: diagnostics separate generation success from HTTP response completion', () => {
  const details = simpleConversationMetricDetails({
    requestId: 'req-123', model: 'gemini-2.5-flash', keySlot: -1, keyAttempts: 1,
    durationMs: 55, hasAttachments: true, searchUsed: false, searchResult: 'not_run',
  });
  assert.equal(details.keySlot, -1);
  assert.equal(details.hasAttachments, true);
  assert.equal(details.searchUsed, false);

  const response = new EventEmitter();
  response.statusCode = 200;
  response.writableFinished = false;
  const events = [];
  observeSimpleResponseDelivery(response, (event, data) => events.push({ event, data }), details);
  response.writableFinished = true;
  response.emit('finish');
  response.emit('close');
  assert.equal(events.length, 1);
  assert.equal(events[0].event, 'conversation_http_response_success');
  assert.equal(events[0].data.clientRendered, 'not_observed');
});

test('P126.3: completed HTTP error is distinct from interrupted delivery', () => {
  const response = new EventEmitter();
  response.statusCode = 503;
  response.writableFinished = true;
  const events = [];
  observeSimpleResponseDelivery(response, (event, data) => events.push({ event, data }), { requestId: 'req-503' });
  response.emit('finish');
  assert.equal(events.length, 1);
  assert.equal(events[0].event, 'conversation_http_response_failure');
  assert.equal(events[0].data.userVisibleSuccess, 'not_observed');
});

test('P126.3: interrupted response is not counted as successful delivery', () => {
  const response = new EventEmitter();
  response.statusCode = 200;
  response.writableFinished = false;
  const events = [];
  observeSimpleResponseDelivery(response, (event, data) => events.push({ event, data }), { requestId: 'req-abort' });
  response.emit('close');
  assert.equal(events.length, 1);
  assert.equal(events[0].event, 'conversation_delivery_interrupted');
});
