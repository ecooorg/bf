import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts/assistant-run-summary.mjs');

test('assistant-run-summary script exists', () => {
  assert.ok(existsSync(script));
});

test('assistant-run-summary writes ASSISTANT_PASTE.txt from synthetic fail log', () => {
  const dir = path.join(root, 'artifacts', 'assistant-summary-test');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'test_web.log'), [
    'not ok 8 - P116 freshness disclosure',
    '  error: The input did not match',
    '  name: AssertionError',
    '# fail 1',
  ].join('\n'));
  const r = spawnSync(process.execPath, [script], {
    cwd: root,
    env: {
      ...process.env,
      CI_LOGS_DIR: dir,
      CI_STATUS: 'failure',
      GITHUB_WORKFLOW: 'ci',
      GITHUB_SHA: 'abc123deadbeef',
      GITHUB_RUN_ID: '1',
      GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_REPOSITORY: 'ecooorg/bf',
    },
    encoding: 'utf8',
    timeout: 15_000,
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const paste = readFileSync(path.join(dir, 'ASSISTANT_PASTE.txt'), 'utf8');
  assert.match(paste, /ASSISTANT_PASTE/);
  assert.match(paste, /STATUS=failure/);
  assert.match(paste, /not ok 8|AssertionError|P116/);
  assert.ok(existsSync(path.join(dir, 'ASSISTANT_SUMMARY.json')));
});

test('canonical workflows emit assistant paste step', () => {
  for (const name of ['ci.yml', 'acceptance.yml', 'architect-compare.yml', 'ops.yml']) {
    const yml = readFileSync(path.join(root, '.github/workflows', name), 'utf8');
    assert.match(yml, /assistant-run-summary\.mjs/, name);
    assert.match(yml, /ASSISTANT_PASTE|artifacts\/ci-checks/, name);
  }
});
