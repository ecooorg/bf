import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

test('direct conversational mode returns raw Gemini text and bypasses search and rewrite pipeline', () => {
  assert.match(server, /async function generateGeminiPassThrough/);
  assert.match(server, /responseMimeType:\s*'application\/json'/); // retained only in the legacy structured path
  assert.match(server, /turnPlan\.agent === 'conversational' && !distressMarkerDetected && process\.env\.BIFORGE_GEMINI_DIRECT_MODE !== 'false'/);
  assert.match(server, /searchInvoked:\s*false/);
  assert.match(server, /GEMINI_DIRECT_UNAVAILABLE/);
  assert.match(server, /No alternative provider or generated fallback was used/);
  assert.match(server, /rawOutput:\s*direct\.text, visibleReply:\s*direct\.text/);
  assert.match(server, /rawOutputSha256:\s*outputHash,\s*visibleReplySha256:\s*outputHash,\s*outputModified:\s*false/);
  assert.match(server, /reply:\s*direct\.text/);
  const branch = server.slice(server.indexOf('if (process.env.BIFORGE_GEMINI_DIRECT_MODE'), server.indexOf('// P50: fresh-web lookup'));
  assert.ok(!branch.includes('runConversationWebSearch'));
  assert.ok(!branch.includes('stripUserFacingUrls'));
  assert.ok(!branch.includes('scrubInternalLabels'));
  assert.ok(!branch.includes('runEpistemicVerifier'));
});

test('direct Gemini helper makes one text generation call without JSON mode or provider fallback', () => {
  const helper = server.match(/async function generateGeminiPassThrough[\s\S]*?\n}\n/)?.[0] || '';
  assert.ok(helper);
  assert.match(helper, /client\.models\.generateContent/);
  assert.match(helper, /config:\s*\{ abortSignal: controller\.signal, temperature: 0\.2 \}/);
  assert.doesNotMatch(helper, /responseMimeType|routeCall|createOpenAICompatibleAdapter|parseJson|retry/i);
});
