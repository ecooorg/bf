import test from 'node:test';
import assert from 'node:assert/strict';
import { redactSecrets, redactDeep, SECRET_ENV_NAMES } from '../server/redact.ts';

test('secret environment inventory includes all provider secrets and resolved Gemini slots', () => {
  for (const name of ['SERPER_API_KEY', 'CLOUDFLARE_API_TOKEN', 'GITHUB_TOKEN', 'GEMINI_API_KEY_1', 'GEMINI_API_KEY_10']) {
    assert.ok(SECRET_ENV_NAMES.includes(name), name);
  }
});

test('key-shaped credentials and x-byok-key request header values are redacted without env access', () => {
  const secrets = [`AIza${'A'.repeat(35)}`, `ghp_${'b'.repeat(36)}`, `sk-${'c'.repeat(40)}`, 'synthetic-byok-secret-value-123456'];
  const log = `Google=${secrets[0]} GitHub=${secrets[1]} OpenAI=${secrets[2]} x-byok-key: ${secrets[3]}`;
  const clean = redactSecrets(log, {});
  for (const secret of secrets) assert.ok(!clean.includes(secret), `secret survived redaction: ${secret}`);
  assert.equal((clean.match(/\[REDACTED\]/g) || []).length, 4);
});

test('serialized BYOK headers are redacted recursively and in JSON log text', () => {
  const byok = 'synthetic-byok-secret-value-123456';
  const result = redactDeep({ headers: { 'x-byok-key': byok } }, {});
  assert.equal(result.headers['x-byok-key'], '[REDACTED]');
  const jsonLog = JSON.stringify({ headers: { 'x-byok-key': byok } });
  const cleanLog = redactSecrets(jsonLog, {});
  assert.ok(!cleanLog.includes(byok));
  assert.ok(cleanLog.includes('[REDACTED]'));
});

test('known provider environment values are removed even when they do not match generic key formats', () => {
  const env = {
    SERPER_API_KEY: 'serper-custom-secret-123456',
    CLOUDFLARE_API_TOKEN: 'cloudflare-custom-secret-123456',
    GITHUB_TOKEN: 'github-custom-secret-123456',
    GEMINI_API_KEY_10: 'gemini-slot-ten-secret-123456',
  };
  const clean = redactSecrets(Object.values(env).join('|'), env);
  for (const secret of Object.values(env)) assert.ok(!clean.includes(secret));
});
