import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const dir = path.join(root, 'artifacts', 'diagnostics-summary-contract');

test('all workflow diagnostics produce one self-contained assistant handoff and three consistent logs', () => {
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '01-core-tests.log'), '# tests 3\n# pass 2\n# fail 1\n# skipped 0\nnot ok 3 - current prompt contract\nAssertionError: obsolete prompt text\n# tests 2\n# pass 2\n# fail 0\n# skipped 0\n');
  fs.writeFileSync(path.join(dir, '02-build.log'), 'build completed successfully\n');
  fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ results: [{ id: 'test:core', status: 'FAIL', durationMs: 60000, log: 'test-core.log', note: 'test timed out' }, { id: 'typecheck', status: 'BLOCKED', note: 'test:core failed' }] }));
  fs.writeFileSync(path.join(dir, 'blind-review-report.json'), JSON.stringify({ status: 'PARTIAL', score: 0.72, summary: 'Review completed', apiKey: 'secret-review-key-1234567890' }));
  fs.writeFileSync(path.join(dir, '03-provider.log'), 'GEMINI_API_KEY=secret-provider-key-1234567890\nAuthorization: Bearer secret-bearer-token-1234567890\n');
  const run = spawnSync(process.execPath, ['scripts/diagnostics-summary.mjs'], { cwd: root, encoding: 'utf8', env: { ...process.env, CI_LOGS_DIR: path.relative(root, dir), CI_STATUS: 'failure', GITHUB_WORKFLOW: 'contract-test' } });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const names = fs.readdirSync(dir).sort();
  for (const name of ['ASSISTANT_SUMMARY.md', 'checks.log', 'failures.log', 'environment.log']) assert.ok(names.includes(name), `missing ${name}`);
  assert.equal(names.filter(n => /^ASSISTANT_/.test(n)).length, 1, 'exactly one assistant handoff file');
  const summary = fs.readFileSync(path.join(dir, 'ASSISTANT_SUMMARY.md'), 'utf8');
  assert.match(summary, /^# BiForge — Diagnostic Report/);
  assert.doesNotMatch(summary, /[А-Яа-яЁё]/, 'repository diagnostic artifacts remain English-only');
  assert.match(summary, /02-build\.log/); assert.match(summary, /01-core-tests\.log/);
  assert.match(summary, /4\/5/); assert.match(summary, /obsolete prompt text/);
  assert.match(fs.readFileSync(path.join(dir, 'failures.log'), 'utf8'), /AssertionError/);
  assert.match(fs.readFileSync(path.join(dir, 'checks.log'), 'utf8'), /test:core/);
  fs.rmSync(dir, { recursive: true, force: true });
});


test('passing TAP logs remain PASS when test titles contain BLOCKED', () => {
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'passing.log'), '# Subtest: BLOCKED is a word in this test title\nok 1 - BLOCKED title is not a workflow status\n# tests 1\n# pass 1\n# fail 0\n# skipped 0\n');
  const run = spawnSync(process.execPath, ['scripts/diagnostics-summary.mjs'], { cwd: root, encoding: 'utf8', env: { ...process.env, CI_LOGS_DIR: path.relative(root, dir), CI_STATUS: 'success' } });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(fs.readFileSync(path.join(dir, 'checks.log'), 'utf8'), /^PASS    passing\.log/m);
  fs.rmSync(dir, { recursive: true, force: true });
});
