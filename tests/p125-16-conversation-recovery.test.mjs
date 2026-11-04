import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('P125.16: conversation recovery retries transient model failures instead of synthetic agent fallback', async () => {
  const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
  const ui = await readFile(new URL('../src/ConversationScreens.tsx', import.meta.url), 'utf8');

  // Recovery loop and operational error path exist.
  assert.match(server, /conversation_recovery_retry/);
  assert.match(server, /conversation_recovery_success/);
  assert.match(server, /CONVERSATION_RECOVERY_MS/);
  assert.match(server, /conversation_model_unavailable/);
  assert.match(server, /const retryable = e\?\.retryable !== false && e\?\.details\?\.retryable !== false/);
  assert.match(server, /status === 502 \? 502 : 503/);
  assert.match(server, /retryable,\s*details: \{ upstreamMessage/);
  assert.match(server, /genErr\?\.retryable !== false/);
  assert.match(server, /Do not replay a cascade after it has exhausted every candidate/);
  assert.match(server, /retryAfterMs/);
  assert.match(server, /class GeminiFormatError[\s\S]*?status = 502[\s\S]*?retryable = false/);
  assert.match(server, /class GeminiQuotaError[\s\S]*?retryable = false/);
  assert.match(server, /class GeminiRateLimitError[\s\S]*?retryable = false/);

  // Technical fallback must never be returned as a successful agent reply.
  assert.doesNotMatch(server, /I saved your situation\. The AI model is temporarily unavailable/);
  assert.doesNotMatch(server, /stage: 'conversation-fallback'/);
  assert.doesNotMatch(server, /model: 'fallback'/);

  // Per-call latency hard caps remain (recovery uses fresh passes, not a multi-minute single generate).
  assert.match(server, /const callBudget = \{ used: 0, startedAt: requestStartedAt \}/);
  assert.doesNotMatch(server, /await sleep\(pause\)/);

  // UI shows live elapsed wait time on the thinking indicator.
  assert.match(ui, /Looking at your specific situation… \{formatWait\(waitSeconds\)\}/);
  assert.match(ui, /data-testid="conversation-thinking"/);
  assert.match(ui, /setWaitSeconds/);
});
