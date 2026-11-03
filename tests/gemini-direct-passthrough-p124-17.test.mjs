import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

test('direct conversational mode returns raw Gemini text and uses retrieval before generation when needed', () => {
  assert.match(server, /async function generateGeminiPassThrough/);
  assert.match(server, /responseMimeType:\s*'application\/json'/); // retained only in the legacy structured path
  assert.match(server, /turnPlan\.agent === 'conversational' && !distressMarkerDetected && process\.env\.BIFORGE_GEMINI_DIRECT_MODE === 'true'/);
  assert.match(server, /searchInvoked, searchProvider:/);
  assert.match(server, /const directSearchExpected = directSearchEnabled && shouldSearchWeb/);
  assert.match(server, /GEMINI_DIRECT_UNAVAILABLE/);
  assert.match(server, /No alternative provider or generated fallback was used/);
  assert.match(server, /rawOutput:\s*direct\.text, visibleReply:\s*direct\.text/);
  assert.match(server, /rawOutputSha256:\s*outputHash,\s*visibleReplySha256:\s*outputHash,\s*outputModified:\s*false/);
  assert.match(server, /reply:\s*direct\.text/);
  const branchStart = server.indexOf("if (turnPlan.agent === 'conversational' && !distressMarkerDetected");
  const branchEnd = server.indexOf('// P50: optional fresh-web lookup', branchStart);
  const branch = server.slice(branchStart, branchEnd);
  assert.match(branch, /fetchSerperDigestMulti/);
  assert.match(branch, /toEnglishSearchQuery/);
  assert.match(branch, /directSearchBlock/);
  assert.ok(!branch.includes('runConversationWebSearch'));
  assert.ok(!branch.includes('stripUserFacingUrls'));
  assert.ok(!branch.includes('scrubInternalLabels'));
  assert.ok(!branch.includes('runEpistemicVerifier'));
});

test('direct Gemini helper makes one text generation call without JSON mode or provider fallback', () => {
  const helper = server.match(/async function generateGeminiPassThrough[\s\S]*?\n}\n/)?.[0] || '';
  assert.ok(helper);
  assert.match(helper, /client\.models\.generateContent/);
  assert.match(helper, /config:\s*\{ abortSignal: controller\.signal, temperature: 0\.2, \.\.\.\(useSearch \? \{ tools: \[googleSearchToolForModel\(model\)\] \} : \{\}\) \}/);
  assert.match(helper, /extractGrounding\(response\)/);
  assert.doesNotMatch(helper, /responseMimeType|routeCall|createOpenAICompatibleAdapter|parseJson|retry/i);
});

test('P124.21: direct mode uses Serper evidence first and Gemini grounding as fallback', () => {
  const branch = server.slice(server.indexOf("if (turnPlan.agent === 'conversational' && !distressMarkerDetected"), server.indexOf('// P50: fresh-web lookup'));
  assert.match(branch, /const directSearchExpected = directSearchEnabled && shouldSearchWeb/);
  assert.match(branch, /directSearchBlock \? 'Use the retrieved web evidence below as the primary source/);
  assert.match(branch, /requestPreferredModel, attachParts, directUseGoogleGrounding\)/);
  assert.ok(!branch.includes('Do not claim to have accessed live data, websites, or tools'));
  assert.match(branch, /sources: directSources/);
  assert.match(branch, /reply: direct\.text/);
});

test('P124.20: direct helper rotates pool keys only on quota/auth/5xx, bounded, never logs key material', () => {
  const helper = server.match(/async function generateGeminiPassThrough[\s\S]*?\n}\n/)?.[0] || '';
  assert.match(helper, /MAX_DIRECT_KEY_ATTEMPTS/);
  assert.match(helper, /geminiKeyPoolState\.available\(geminiKeySlots\)/);
  assert.match(helper, /if \(!shouldRotateKeySlot\(cls\)\) throw e/);
  assert.match(helper, /markCooldown\(slot/);
  assert.doesNotMatch(helper, /console\.\w+\([^)]*\bkey\b[^)]*\)/);
});

test('P124.20: classifyKeyError rotates on quota, auth and 5xx but not on timeouts or other errors', async () => {
  const { classifyKeyError } = await import('../server/keyPool.ts');
  assert.equal(classifyKeyError({ status: 429 }), 'PROVIDER_QUOTA');
  assert.equal(classifyKeyError(new Error('RESOURCE_EXHAUSTED: quota')), 'PROVIDER_QUOTA');
  assert.equal(classifyKeyError({ status: 403 }), 'PROVIDER_AUTH');
  assert.equal(classifyKeyError({ status: 503 }), 'PROVIDER_TRANSIENT');
  assert.equal(classifyKeyError(new Error('This operation was aborted')), 'OTHER');
  assert.equal(classifyKeyError({ status: 400 }), 'OTHER');
});
