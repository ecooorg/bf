/* Grouped test suite. Each original module has its own lexical scope.
 * Live PostgreSQL/API tests run only with their dedicated environment flag.
 *
 * P118.4.1 cleanup: removed PA-01 / PA-02 / PA-04 blocks that depended on
 * deleted e01 fixtures (pa01/pa02/pa04-fixtures.json) and e01-harness scripts.
 * Kept: gate-engine unit tests and PA-03 staging evidence tests.
 */

// ===== BEGIN gate-engine.test.mjs =====
{
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const { GATE_RULES_VERSION, RC_REQUIRED_GATES, canAdvance, evaluateAll, evaluateGate, evaluateTestIntegrity, gateForCheckName, releaseManifest, statusFromCheckRun, validateEvidence } = await import("../server/gateEngine.ts");

const A = 'a'.repeat(40), B = 'b'.repeat(40);
const ev = (o = {}) => ({ gate: 'build', checkName: 'build', status: 'PASS', commitSha: A, source: 'ci', rulesVersion: GATE_RULES_VERSION, tool: 'github-check:actions', createdAt: '2026-10-11T10:00:00Z', ...o });

test('PASS is impossible without evidence; no evidence is NOT_RUN', () => {
  assert.equal(evaluateGate('build', [], A).status, 'NOT_RUN');
  assert.equal(evaluateGate('build', [ev({ commitSha: B })], A).status, 'NOT_RUN', 'evidence of another commit does not count');
  assert.equal(evaluateGate('build', [ev({ invalidated: true })], A).status, 'NOT_RUN', 'invalidated evidence does not count');
  assert.equal(evaluateGate('build', [ev()], A).status, 'PASS');
});

test('model statements and malformed evidence are rejected', () => {
  assert.equal(validateEvidence(ev({ source: 'model' })), 'untrusted_source');
  assert.equal(validateEvidence(ev({ source: 'approval' })), 'source_not_allowed_for_gate');
  assert.equal(validateEvidence(ev({ commitSha: 'main' })), 'invalid_commit_sha');
  assert.equal(validateEvidence(ev({ rulesVersion: 'x' })), 'unknown_rules_version');
  assert.equal(validateEvidence(ev({ status: 'WAIVED' })), 'waived_requires_waiver_record');
  assert.equal(evaluateGate('build', [ev({ source: 'model' })], A).status, 'NOT_RUN');
});

test('check run conclusions map deterministically (logs are never read)', () => {
  assert.equal(statusFromCheckRun('completed', 'success'), 'PASS');
  assert.equal(statusFromCheckRun('completed', 'failure'), 'FAIL');
  for (const c of ['timed_out', 'cancelled', 'action_required', 'startup_failure', 'stale']) assert.equal(statusFromCheckRun('completed', c), 'BLOCKED');
  for (const c of ['neutral', 'skipped', null]) assert.equal(statusFromCheckRun('completed', c), 'NOT_RUN');
  assert.equal(statusFromCheckRun('in_progress', 'success'), 'NOT_RUN');
  assert.equal(gateForCheckName('Scan repository for leaked secrets'), 'security');
  assert.equal(gateForCheckName('unit tests'), 'test');
  assert.equal(gateForCheckName('Build application'), 'build');
  assert.equal(gateForCheckName('deploy preview'), null);
});

test('several checks per gate: any FAIL beats PASS; the latest result of a check wins', () => {
  const mixed = [ev({ checkName: 'a' }), ev({ checkName: 'b', status: 'FAIL' })];
  assert.equal(evaluateGate('build', mixed, A).status, 'FAIL');
  const rerun = [ev({ checkName: 'b', status: 'FAIL', createdAt: '2026-10-11T10:00:00Z' }), ev({ checkName: 'b', status: 'PASS', createdAt: '2026-10-11T10:05:00Z' })];
  assert.equal(evaluateGate('build', rerun, A).status, 'PASS');
  assert.equal(evaluateGate('build', [ev(), ev({ checkName: 'x', status: 'BLOCKED' })], A).status, 'BLOCKED');
  assert.equal(evaluateGate('build', [ev(), ev({ checkName: 'x', status: 'REAL_ONLY' })], A).status, 'REAL_ONLY');
});

test('Test Integrity: any change under tests/acceptance/** is FAIL', () => {
  assert.equal(evaluateTestIntegrity([{ filename: 'server/a.ts', status: 'modified' }]).status, 'PASS');
  for (const f of [{ filename: 'tests/acceptance/x.test.mjs', status: 'modified' }, { filename: 'tests/acceptance/x.test.mjs', status: 'removed' }, { filename: 'tests/acceptance/new.mjs', status: 'added' },
    { filename: 'tests/other.mjs', status: 'renamed', previous_filename: 'tests/acceptance/x.mjs' }, { filename: 'Tests/Acceptance/x.mjs', status: 'added' }, { filename: 'tests/acceptance/../../x', status: 'added' }]) {
    assert.equal(evaluateTestIntegrity([f]).status, 'FAIL', JSON.stringify(f));
  }
  assert.equal(evaluateTestIntegrity([], { truncated: true }).status, 'BLOCKED', 'an unreadable diff never passes');
  assert.equal(evaluateTestIntegrity([{ filename: 'tests/acceptance-notes.md', status: 'added' }]).status, 'PASS');
  // P20: paths declared in the approved Task Package do not fail integrity
  const base = evaluateTestIntegrity(
    [{ filename: 'tests/acceptance/from-package.test.mjs', status: 'added' }],
    { packageAcceptancePaths: ['tests/acceptance/from-package.test.mjs'] },
  );
  assert.equal(base.status, 'PASS');
  assert.ok(base.packageBaseline.length >= 1);
});

test('WAIVED needs a human reason and a matching commit', () => {
  const w = { gate: 'test_integrity', commitSha: A, reason: 'approved by owner', actor: 'owner' };
  const failing = [ev({ gate: 'test_integrity', checkName: 'd', status: 'FAIL', source: 'diff' })];
  assert.equal(evaluateGate('test_integrity', failing, A, [w]).status, 'WAIVED');
  assert.equal(evaluateGate('test_integrity', failing, B, [w]).status, 'NOT_RUN', 'a waiver does not carry to another commit');
  assert.equal(evaluateGate('test_integrity', failing, A, [{ ...w, reason: '  ' }]).status, 'FAIL');
});

test('Release Candidate is derived: PASS only when every other gate is PASS or WAIVED; advance is blocked otherwise', () => {
  const all = RC_REQUIRED_GATES.map((g) => ev({ gate: g, checkName: g, source: { requirements: 'approval', spec: 'approval', review: 'approval', test_integrity: 'diff' }[g] || 'ci' }));
  const full = evaluateAll(all, A);
  assert.equal(full.release_candidate.status, 'PASS');
  const m = releaseManifest(full, all, A, []);
  assert.equal(m.complete, true); assert.equal(m.commit, A); assert.equal(m.rules_version, GATE_RULES_VERSION);
  const missing = evaluateAll(all.filter((e) => e.gate !== 'security'), A);
  assert.equal(missing.release_candidate.status, 'NOT_RUN');
  assert.equal(canAdvance(missing, RC_REQUIRED_GATES).allowed, false);
  const failed = evaluateAll(all.map((e) => (e.gate === 'test' ? { ...e, status: 'FAIL' } : e)), A);
  assert.equal(failed.release_candidate.status, 'FAIL');
  assert.deepEqual(canAdvance(failed, ['test']).blockers, ['test:FAIL']);
  assert.equal(evaluateAll(all, B).release_candidate.status, 'NOT_RUN', 'code changed after the gate: evidence no longer applies');
});
}
// ===== END gate-engine.test.mjs =====

// ===== BEGIN pa03-acceptance.test.mjs =====
{
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const fs = (await import("node:fs")).default;
const { collectStagingEvidence, renderSummary } = await import("../scripts/staging-drills.mjs");

const response = (status, body, headers = {}) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });

test('PA-03 refuses missing or non-staging service URLs without making network calls', async () => {
  let calls = 0;
  const fetcher = async () => { calls += 1; throw new Error('must not be called'); };
  const missing = await collectStagingEvidence({ env: {}, fetcher });
  assert.equal(missing.checks.find((c) => c.id === 'staging_url').status, 'NOT_RUN');
  assert.equal(missing.scenario181.length, 12);
  assert.equal(missing.safety.writesPerformed, false);
  const production = await collectStagingEvidence({ env: { STAGING_SERVICE_URL: 'https://app.example.com' }, fetcher });
  assert.equal(production.checks.find((c) => c.id === 'staging_url').status, 'NOT_RUN');
  assert.equal(calls, 0);
});

test('PA-03 records health, readiness, authenticated ops, and bounded GET-only probe', async () => {
  const methods = [];
  const fetcher = async (url, options = {}) => {
    methods.push(options.method || 'GET');
    const u = new URL(url);
    if (u.pathname === '/health') return response(200, { status: 'ok', commit: 'abc123456789' });
    if (u.pathname === '/ready') return response(200, { status: 'ready' });
    if (u.pathname === '/api/login') return response(200, { success: true }, { 'set-cookie': 'session=synthetic; Path=/; HttpOnly' });
    if (u.pathname === '/ops') return response(200, '<h1>BiForge operations</h1>');
    if (u.pathname === '/api/ops') return response(200, { queue: { queued: 0 }, alerts: [] });
    return response(404, { error: 'not_found' });
  };
  let t = 100;
  const report = await collectStagingEvidence({
    env: { STAGING_SERVICE_URL: 'https://staging.example.com', STAGING_APP_PASSWORD: 'synthetic-test-only', GITHUB_SHA: 'abc123' },
    fetcher,
    clock: () => { t += 5; return t; },
  });
  for (const id of ['health', 'ready', 'staging_login', 'ops_html', 'ops_json', 'bounded_load']) {
    assert.equal(report.checks.find((c) => c.id === id).status, 'PASS', id);
  }
  assert.equal(report.checks.find((c) => c.id === 'bounded_load').requests, 20);
  assert.ok(methods.every((method) => method === 'GET' || method === 'POST'));
  assert.ok(methods.filter((method) => method === 'POST').length === 1, 'only login may POST');
  assert.equal(report.safety.modelCalls, 0);
  assert.equal(report.safety.restorePerformed, false);
  assert.ok(report.scenario181.every((item) => item.status === 'NOT_RUN'));
  assert.match(renderSummary(report), /Restore and rollback remain NOT_RUN/);
});

test('PA-03 reports live endpoint failures without leaking secrets', async () => {
  const report = await collectStagingEvidence({
    env: { STAGING_SERVICE_URL: 'https://staging.example.com', STAGING_APP_PASSWORD: 'do-not-print-this' },
    fetcher: async () => response(503, { error: 'unavailable' }),
  });
  assert.equal(report.checks.find((c) => c.id === 'health').status, 'FAIL');
  assert.equal(report.overall, 'FAIL');
  assert.ok(!JSON.stringify(report).includes('do-not-print-this'));
});


}
// ===== END pa03-acceptance.test.mjs =====

