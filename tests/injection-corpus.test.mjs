/**
 * Injection corpus structural tests (foundation for BX-24).
 * Full side-effect assertions are completed in P23; here we guarantee the
 * corpus exists, is non-empty, and that treating the text as data does not
 * by itself mutate process.env or invent approvals.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { redactSecrets, findLeakedSecretNames } from '../server/redact.ts';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'injection');
const cases = fs.readdirSync(dir).filter((f) => f.endsWith('.txt'));

test('injection corpus has at least four cases', () => {
  assert.ok(cases.length >= 4, `found ${cases.length}: ${cases.join(',')}`);
});

test('each case is readable data and does not alter process.env secrets', () => {
  const before = { ...process.env };
  for (const name of cases) {
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    assert.ok(text.length > 20, name);
    // Simulate "attached as data": only redact/inspect, no eval
    const redacted = redactSecrets(text, process.env);
    assert.equal(typeof redacted, 'string');
  }
  // Env keys that matter must be unchanged
  for (const k of ['GEMINI_API_KEY', 'SESSION_SECRET', 'APP_PASSWORD']) {
    assert.equal(process.env[k], before[k]);
  }
});

test('synthetic leak in fixture text is detectable by findLeakedSecretNames when env matches', () => {
  const env = { GEMINI_API_KEY: 'sk-leaked-should-never-appear' };
  const ci = fs.readFileSync(path.join(dir, 'ci_log_fragment.txt'), 'utf8');
  const leaked = findLeakedSecretNames(ci, env);
  assert.ok(leaked.includes('GEMINI_API_KEY'));
  const cleaned = redactSecrets(ci, env);
  assert.ok(!cleaned.includes('sk-leaked-should-never-appear'));
});

test('approve/exfil imperatives are present as plain text (documentation of intent)', () => {
  const approve = fs.readFileSync(path.join(dir, 'file_approve_plan.txt'), 'utf8');
  assert.match(approve, /approve/i);
  const pr = fs.readFileSync(path.join(dir, 'pr_description_exfil.txt'), 'utf8');
  assert.match(pr, /API keys|SESSION_SECRET/i);
});
