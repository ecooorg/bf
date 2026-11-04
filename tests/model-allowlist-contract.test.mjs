/**
 * Locks free-key Gemini allowlist. Do not expand without Navigator approval and a working key test.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GEMINI_ALLOWED_MODELS, GEMINI_PROBE_CANDIDATES } from '../server/modelAvailability.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWED = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

test('GEMINI_ALLOWED_MODELS is exactly the two free-key flash-lite models', () => {
  assert.deepEqual([...GEMINI_ALLOWED_MODELS], ALLOWED);
  assert.deepEqual([...GEMINI_PROBE_CANDIDATES], ALLOWED);
});

test('server sources do not hard-code retired Gemini ids as defaults or probes', () => {
  const files = [
    'server/modelAvailability.ts',
    'server/modelRegistry.ts',
    'server.ts',
    '.env.example',
    '.github/workflows/ci.yml',
  ];
  const banned = [
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-3.6-flash',
    'gemini-3.8-flash',
    'gemma-4',
  ];
  for (const rel of files) {
    const text = readFileSync(path.join(root, rel), 'utf8');
    for (const id of banned) {
      // allow mentions in comments that say "never use X"
      const re = new RegExp(`['"\`]${id}['"\`]`);
      assert.equal(re.test(text), false, `${rel} must not quote ${id} as a usable model id`);
    }
  }
});
