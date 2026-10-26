import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateArtifact } from '../scripts/schemaValidate.mjs';
import {
  makeEvidenceRecord, assessEvidence, mapLegacyStatus, worstStatus, addRecordName,
  buildHandoffReport, buildFallbackHandoff, validateHandoffReport,
} from '../scripts/evidenceLib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOW = '2026-10-25T12:00:00.000Z';
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `biforge-p105-${name}-`));
const run = (script, dir, extra = {}) => spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', env: { ...process.env, CI_LOGS_DIR: dir, ...extra } });
const row = (id, status = 'PASS', extra = {}) => ({ id, status, command: `npm run ${id}`, startedAt: NOW, finishedAt: NOW, log: `${id}.log`, critical: true, ...extra });

/** A complete, consistent evidence set on disk; returns its directory. */
function evidenceDir(rows = [row('a'), row('b')], { marker = true, writeLogs = true } = {}) {
  const dir = tmp('set');
  const record = makeEvidenceRecord(rows, { revision: 'abc1234', environment: 'local', now: NOW });
  fs.writeFileSync(path.join(dir, 'evidence-x.json'), JSON.stringify(record));
  if (writeLogs) for (const r of rows) fs.writeFileSync(path.join(dir, r.log), 'ok\n');
  const results = { results: rows.map((r) => ({ id: r.id, status: r.status, log: r.log })), ...(marker ? { evidence: addRecordName(null, 'evidence-x.json') } : {}) };
  fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify(results));
  return dir;
}
const mutateRecord = (dir, fn) => {
  const file = path.join(dir, 'evidence-x.json');
  const rec = JSON.parse(fs.readFileSync(file, 'utf8')); fn(rec); fs.writeFileSync(file, JSON.stringify(rec));
};
const codes = (a) => a.problems.map((p) => p.code);

test('P105 status mapping never turns a blocked or unknown row into PASS', () => {
  assert.equal(mapLegacyStatus('PASS'), 'PASS');
  assert.equal(mapLegacyStatus('SKIPPED'), 'BLOCKED');
  assert.equal(mapLegacyStatus('INTERRUPTED'), 'UNKNOWN');
  assert.equal(mapLegacyStatus('whatever'), 'UNKNOWN');
  assert.equal(worstStatus(['PASS', 'TIMEOUT', 'UNKNOWN']), 'TIMEOUT');
  assert.equal(worstStatus(['PASS', 'PASS']), 'PASS');
  assert.equal(worstStatus([]), 'UNKNOWN');
});

test('P105 evidence records validate against the schema and aggregate to the worst status', () => {
  const rec = makeEvidenceRecord([row('a'), row('b', 'SKIPPED'), row('c', 'TIMEOUT')], { revision: 'abc1234', now: NOW });
  assert.equal(validateArtifact(rec, 'evidence-record').ok, true);
  assert.equal(rec.status, 'TIMEOUT');
  assert.equal(rec.items.find((i) => i.id === 'b').provenance.status, 'BLOCKED');
  const empty = makeEvidenceRecord([], { revision: 'abc1234', now: NOW });
  assert.equal(validateArtifact(empty, 'evidence-record').ok, true);
  assert.equal(empty.status, 'NOT_RUN');
});

test('P105 commands and notes are redacted inside evidence records', () => {
  const rec = makeEvidenceRecord([row('a', 'FAIL', { command: 'node x --GEMINI_API_KEY=supersecretvalue', note: 'Bearer abcdef123456 leaked' })], { revision: 'abc1234', now: NOW });
  const text = JSON.stringify(rec);
  assert.doesNotMatch(text, /supersecretvalue|abcdef123456/);
  assert.match(text, /\[REDACTED\]/);
});

test('P105 a complete evidence set is accepted', () => {
  const dir = evidenceDir();
  try {
    const a = assessEvidence(dir, JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8')));
    assert.equal(a.required, true); assert.equal(a.evidenceOk, true); assert.equal(a.completeness, 'complete');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('P105 missing, malformed and schema-invalid records are critical problems', () => {
  const doc = (d) => JSON.parse(fs.readFileSync(path.join(d, 'results.json'), 'utf8'));
  let dir = evidenceDir();
  try {
    fs.rmSync(path.join(dir, 'evidence-x.json'));
    const a = assessEvidence(dir, doc(dir));
    assert.ok(codes(a).includes('MISSING_RECORD')); assert.equal(a.evidenceOk, false); assert.equal(a.completeness, 'unavailable');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  dir = evidenceDir();
  try {
    fs.writeFileSync(path.join(dir, 'evidence-x.json'), '{not json');
    assert.ok(codes(assessEvidence(dir, doc(dir))).includes('MALFORMED_RECORD'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  dir = evidenceDir();
  try {
    mutateRecord(dir, (r) => { delete r.items[0].provenance.revision; });
    assert.ok(codes(assessEvidence(dir, doc(dir))).includes('INVALID_RECORD'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('P105 contradictions, missing logs, missing items and bad timestamps are critical problems', () => {
  const doc = (d) => JSON.parse(fs.readFileSync(path.join(d, 'results.json'), 'utf8'));
  let dir = evidenceDir();
  try {
    const d = doc(dir); d.results[0].status = 'FAIL';
    assert.ok(codes(assessEvidence(dir, d)).includes('CONTRADICTION'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  dir = evidenceDir();
  try {
    fs.rmSync(path.join(dir, 'a.log'));
    assert.ok(codes(assessEvidence(dir, doc(dir))).includes('MISSING_LOG'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  dir = evidenceDir();
  try {
    const d = doc(dir); d.results.push({ id: 'orphan', status: 'PASS', log: 'orphan.log' });
    assert.ok(codes(assessEvidence(dir, d)).includes('MISSING_ITEM'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  dir = evidenceDir();
  try {
    mutateRecord(dir, (r) => { r.items[0].provenance.timestamp = 'not-a-date'; });
    assert.ok(codes(assessEvidence(dir, doc(dir))).includes('INVALID_TIMESTAMP'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('P105 results without an evidence marker are legacy: not enforced, reported as minimal', () => {
  const dir = evidenceDir([row('a')], { marker: false });
  try {
    const a = assessEvidence(dir, JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8')));
    assert.equal(a.required, false); assert.equal(a.completeness, 'minimal');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('P105 handoff report built from any status validates against the schema', () => {
  for (const patchStatus of ['PASSED', 'FAILED', 'CANCELLED', 'UNVERIFIED', 'weird']) {
    const r = buildHandoffReport({ patchStatus, summary: 's', evidence: { completeness: 'partial', refs: ['evidence-x.json'] }, failedStages: ['a:FAIL'], blockedStages: ['b'], nextAction: 'n', limitations: 'l' });
    assert.equal(validateHandoffReport(r).ok, true, patchStatus);
  }
  assert.equal(buildHandoffReport({ patchStatus: 'UNVERIFIED' }).status, 'UNKNOWN');
  const fb = buildFallbackHandoff('failure');
  assert.equal(validateHandoffReport(fb).ok, true); assert.equal(fb.status, 'UNKNOWN'); assert.equal(fb.evidenceCompleteness, 'unavailable');
});

test('P105 generator: complete evidence keeps PASSED and embeds a valid structured handoff', () => {
  const dir = evidenceDir();
  try {
    const r = run('scripts/patch-quality-report.mjs', dir, { CI_STATUS: 'success', GITHUB_SHA: 'abc1234' });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const report = fs.readFileSync(path.join(dir, 'NEXT_PATCH.md'), 'utf8');
    assert.match(report, /PATCH_STATUS=PASSED/); assert.match(report, /EVIDENCE=complete/); assert.match(report, /EVIDENCE_PROBLEMS=none/);
    const json = JSON.parse(report.match(/^HANDOFF_JSON=(.*)$/m)[1]);
    assert.equal(validateHandoffReport(json).ok, true); assert.equal(json.status, 'PASS'); assert.equal(json.evidenceCompleteness, 'complete');
    assert.equal(validateHandoffReport(JSON.parse(fs.readFileSync(path.join(dir, 'handoff-report.json'), 'utf8'))).ok, true);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('P105 generator: missing, malformed or contradictory evidence can never produce PASSED', () => {
  const cases = {
    missing: (d) => fs.rmSync(path.join(d, 'evidence-x.json')),
    malformed: (d) => fs.writeFileSync(path.join(d, 'evidence-x.json'), '[[['),
    contradictory: (d) => mutateRecord(d, (rec) => { rec.items[0].provenance.status = 'FAIL'; rec.status = 'FAIL'; }),
    noLog: (d) => fs.rmSync(path.join(d, 'b.log')),
  };
  for (const [name, break_] of Object.entries(cases)) {
    const dir = evidenceDir();
    try {
      break_(dir);
      const r = run('scripts/patch-quality-report.mjs', dir, { CI_STATUS: 'success', GITHUB_SHA: 'abc1234' });
      assert.equal(r.status, 0, r.stderr || r.stdout);
      const report = fs.readFileSync(path.join(dir, 'NEXT_PATCH.md'), 'utf8');
      assert.match(report, /PATCH_STATUS=UNVERIFIED/, name);
      assert.doesNotMatch(report, /PATCH_STATUS=PASSED/, name);
      assert.doesNotMatch(report, /EVIDENCE_PROBLEMS=none/, name);
      const json = JSON.parse(report.match(/^HANDOFF_JSON=(.*)$/m)[1]);
      assert.equal(json.status, 'UNKNOWN', name); assert.notEqual(json.evidenceCompleteness, 'complete', name);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test('P105 generator: a real failure stays FAILED and still lists the evidence problems', () => {
  const dir = evidenceDir([row('a'), row('b', 'FAIL')]);
  try {
    fs.rmSync(path.join(dir, 'evidence-x.json'));
    const r = run('scripts/patch-quality-report.mjs', dir, { CI_STATUS: 'failure', GITHUB_SHA: 'abc1234' });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const report = fs.readFileSync(path.join(dir, 'NEXT_PATCH.md'), 'utf8');
    assert.match(report, /PATCH_STATUS=FAILED/); assert.match(report, /MISSING_RECORD/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('P105 generator: legacy results without records keep their previous behaviour', () => {
  const dir = evidenceDir([row('a')], { marker: false });
  try {
    const r = run('scripts/patch-quality-report.mjs', dir, { CI_STATUS: 'success' });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const report = fs.readFileSync(path.join(dir, 'NEXT_PATCH.md'), 'utf8');
    assert.match(report, /PATCH_STATUS=PASSED/); assert.match(report, /EVIDENCE=minimal/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('P105 fallback: ci-summary writes a schema-valid minimal handoff when the generator produced nothing', () => {
  const dir = tmp('fallback');
  try {
    const r = run('scripts/ci-summary.mjs', dir, { CI_STATUS: 'failure' });
    assert.equal(r.status, 0, r.stderr); assert.equal(r.stdout, '', 'ci-summary must stay silent');
    const report = fs.readFileSync(path.join(dir, 'NEXT_PATCH.md'), 'utf8');
    assert.match(report, /NEXT_PATCH\.md missing/);
    const fb = JSON.parse(fs.readFileSync(path.join(dir, 'handoff-report.json'), 'utf8'));
    assert.equal(validateHandoffReport(fb).ok, true); assert.equal(fb.status, 'UNKNOWN');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('P105 fallback: an existing report is left untouched', () => {
  const dir = tmp('keep');
  try {
    fs.writeFileSync(path.join(dir, 'NEXT_PATCH.md'), '# kept\nPATCH_STATUS=PASSED\n');
    run('scripts/ci-summary.mjs', dir, {});
    assert.equal(fs.readFileSync(path.join(dir, 'NEXT_PATCH.md'), 'utf8'), '# kept\nPATCH_STATUS=PASSED\n');
    assert.equal(fs.existsSync(path.join(dir, 'handoff-report.json')), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('P105 end to end: the independent runner writes records that the generator accepts', () => {
  const dir = tmp('e2e');
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const names = [...new Set([...pkg.scripts.check.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)].map((m) => m[1]))];
    const skip = names.filter((n) => n !== 'lint:copy').join(',');
    const r = run('scripts/run-independent-checks.mjs', dir, { CHECK_SKIP_SCRIPTS: skip, GITHUB_SHA: 'abc1234' });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const results = JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8'));
    assert.deepEqual(results.evidence.records, ['evidence-independent-checks.json']);
    const record = JSON.parse(fs.readFileSync(path.join(dir, 'evidence-independent-checks.json'), 'utf8'));
    assert.equal(validateArtifact(record, 'evidence-record').ok, true);
    assert.deepEqual(record.items.map((i) => i.id).sort(), ['lint:copy', 'version-consistency']);
    assert.equal(record.items[0].provenance.revision, 'abc1234');
    const g = run('scripts/patch-quality-report.mjs', dir, { CI_STATUS: 'success', GITHUB_SHA: 'abc1234' });
    assert.equal(g.status, 0, g.stderr || g.stdout);
    const report = fs.readFileSync(path.join(dir, 'NEXT_PATCH.md'), 'utf8');
    assert.match(report, /PATCH_STATUS=PASSED/); assert.match(report, /EVIDENCE=complete/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ---- P106: fail-closed CI evidence gate ----
const gate = (dir) => run('scripts/ci-evidence-gate.mjs', dir, {});

test('P106 evidence gate passes on a complete run and fails closed otherwise', () => {
  let dir = evidenceDir();
  try {
    run('scripts/patch-quality-report.mjs', dir, { CI_STATUS: 'success', GITHUB_SHA: 'abc1234' });
    const ok = gate(dir);
    assert.equal(ok.status, 0, ok.stderr || ok.stdout);
    assert.match(ok.stdout, /evidence gate OK/i);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }

  // UNVERIFIED report -> red
  dir = evidenceDir();
  try {
    fs.rmSync(path.join(dir, 'evidence-x.json'));
    run('scripts/patch-quality-report.mjs', dir, { CI_STATUS: 'success', GITHUB_SHA: 'abc1234' });
    const bad = gate(dir);
    assert.equal(bad.status, 1); assert.match(bad.stderr, /UNVERIFIED/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }

  // missing report -> red
  dir = tmp('gate-empty');
  try { const bad = gate(dir); assert.equal(bad.status, 1); assert.match(bad.stderr, /NEXT_PATCH\.md is missing/); } finally { fs.rmSync(dir, { recursive: true, force: true }); }

  // report without structured handoff -> red
  dir = tmp('gate-nojson');
  try {
    fs.writeFileSync(path.join(dir, 'NEXT_PATCH.md'), '# x\nPATCH_STATUS=PASSED\n');
    const bad = gate(dir); assert.equal(bad.status, 1); assert.match(bad.stderr, /HANDOFF_JSON line is absent/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }

  // schema-invalid record next to a valid report -> red
  dir = evidenceDir();
  try {
    run('scripts/patch-quality-report.mjs', dir, { CI_STATUS: 'success', GITHUB_SHA: 'abc1234' });
    fs.writeFileSync(path.join(dir, 'evidence-bogus.json'), JSON.stringify({ status: 'PASS' }));
    const bad = gate(dir); assert.equal(bad.status, 1); assert.match(bad.stderr, /evidence-bogus\.json violates the schema/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('P106 the fallback handoff produced by ci-summary satisfies the gate', () => {
  const dir = tmp('gate-fallback');
  try {
    run('scripts/ci-summary.mjs', dir, { CI_STATUS: 'failure' });
    const r = gate(dir);
    assert.equal(r.status, 0, r.stderr || r.stdout);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
