import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);

test('Core CI uses one unified diagnostics summary; Answer Quality is a focused second workflow', () => {
  const ci = fs.readFileSync(path.join(root, '.github/workflows', 'ci.yml'), 'utf8');
  assert.match(ci, /diagnostics-summary\.mjs/);
  assert.match(ci, /ASSISTANT_SUMMARY\.md/);
  assert.doesNotMatch(ci, /ASSISTANT_PASTE(?:_\*|\.txt)|biforge-ci-logs\.zip/);
  const aq = fs.readFileSync(path.join(root, '.github/workflows', 'answer-quality-verify.yml'), 'utf8');
  assert.match(aq, /Answer Quality/);
  assert.doesNotMatch(aq, /ASSISTANT_PASTE(?:_\*|\.txt)|biforge-ci-logs\.zip/);
});

test('legacy paste-summary command is no longer part of the workflow handoff contract', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:diagnostics-summary'], 'node --test tests/diagnostics-summary-contract.test.mjs tests/assistant-run-summary-contract.test.mjs');
});
