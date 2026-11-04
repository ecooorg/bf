import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);

test('canonical workflows use one unified diagnostics summary', () => {
  for (const name of ['ci.yml', 'acceptance.yml', 'architect-compare.yml', 'ops.yml', 'expert-verify.yml', 'answer-quality-verify.yml']) {
    const workflow = fs.readFileSync(path.join(root, '.github/workflows', name), 'utf8');
    assert.match(workflow, /diagnostics-summary\.mjs/, name);
    assert.match(workflow, /ASSISTANT_SUMMARY\.md/, name);
    assert.doesNotMatch(workflow, /ASSISTANT_PASTE(?:_\*|\.txt)|biforge-ci-logs\.zip/, `${name} must not publish split handoffs or nested diagnostic archives`);
  }
});

test('legacy paste-summary command is no longer part of the workflow handoff contract', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:diagnostics-summary'], 'node --test tests/diagnostics-summary-contract.test.mjs tests/assistant-run-summary-contract.test.mjs');
});
