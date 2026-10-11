// P13a acceptance (no database): patch tools, preflight, report, CI summary. Describes docs/P13a-SPEC.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import JSZip from 'jszip';
import {
  readTree, readZipTree, diffTrees, summaryLine, buildZip, preflight, allowlistFromToml, scanSecrets, firstFailure, ciSummary, overallStatus, renderReport,
} from '../scripts/patch-tools.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const B = (s) => Buffer.from(s);
const tree = (o) => new Map(Object.entries(o).map(([k, v]) => [k, B(v)]));
const pf = (o, deleted = []) => preflight({ files: tree(o), deleted, allowlist: allowlistFromToml(fs.readFileSync(path.join(root, '.gitleaks.toml'), 'utf8')) });
const fakeKey = 'gh' + 'p_' + 'a'.repeat(36); // built at run time: no secret literal in the repository

test('diff: changed files are replaced, new files added, missing files listed for deletion', () => {
  const d = diffTrees(tree({ 'a.md': '1', 'b.md': '2', 'c.md': '3' }), tree({ 'a.md': '1', 'b.md': '22', 'd.md': '4' }));
  assert.deepEqual(d, { replace: ['b.md'], add: ['d.md'], del: ['c.md'] });
  assert.match(summaryLine(d), /^заменить 1, добавить 1, удалить 1\n/);
  assert.match(summaryLine(d), /заменить: b\.md/);
  assert.equal(summaryLine({ replace: [], add: [], del: [] }), 'заменить 0, добавить 0, удалить 0');
});

test('zip: a GitHub wrapper folder is stripped; a flat zip is kept; the archive has no wrapper and no manifest', async () => {
  const wrapped = new JSZip(); wrapped.file('repo-main/server/a.ts', 'x'); wrapped.file('repo-main/README.md', 'y');
  assert.deepEqual([...(await readZipTree(await wrapped.generateAsync({ type: 'nodebuffer' }))).keys()].sort(), ['README.md', 'server/a.ts']);
  const flat = new JSZip(); flat.file('server/a.ts', 'x'); flat.file('README.md', 'y');
  assert.deepEqual([...(await readZipTree(await flat.generateAsync({ type: 'nodebuffer' }))).keys()].sort(), ['README.md', 'server/a.ts']);
  const built = await readZipTree(await buildZip(tree({ 'server/a.ts': 'x', 'docs/b.md': 'y' })));
  assert.deepEqual([...built.keys()].sort(), ['docs/b.md', 'server/a.ts']);
  assert.deepEqual(Object.keys((await JSZip.loadAsync(await buildZip(tree({ 'docs/b.md': 'y' })))).files), ['docs/b.md']); // no folder entries
});

test('preflight accepts a clean flat patch (including names that only look like a manifest)', () => {
  assert.deepEqual(pf({
    'README.md': 'x', 'package.json': '{}', 'server/files.ts': 'x', 'migrations/008_artifact_manifests.sql': 'x', 'public/manifest.json': '{}',
    '.github/workflows/ci.yml': 'x', 'docs/NEXT.md': 'x', 'tests/p13a-acceptance.test.mjs': 'x',
  }), []);
});

test('preflight rejects a manifest, nested folders, a wrapper or new top-level folder, unsafe paths', () => {
  for (const bad of ['manifest.json', 'MANIFEST.txt', 'file-list.txt', 'changed_files.md', 'MANIFEST']) assert.match(pf({ [bad]: 'x' })[0], /manifest or file-list/, bad);
  assert.match(pf({ 'docs/archive/old.md': 'x' })[0], /nested folder/);
  assert.match(pf({ 'src/a/b.ts': 'x' })[0], /nested folder/);
  assert.match(pf({ '.github/other/x.yml': 'x' })[0], /nested folder/);
  assert.match(pf({ 'bf-main/server/a.ts': 'x' })[0], /nested folder|top-level folder/);
  assert.match(pf({ 'tools/a.ts': 'x' })[0], /top-level folder "tools"/);
  for (const bad of ['../x.md', '/abs.md', 'docs\\a.md', 'docs//a.md']) assert.match(pf({ [bad]: 'x' })[0], /unsafe path/, bad);
});

test('preflight rejects secrets (several formats) and respects the allowlist of .gitleaks.toml', () => {
  assert.match(pf({ 'docs/a.md': `token ${fakeKey}` })[0], /github_token/);
  assert.match(pf({ 'server/a.ts': 'const k = "AIza' + 'A'.repeat(35) + '"' })[0], /google_api_key/);
  assert.match(pf({ 'server/a.ts': '-----BEGIN RSA PRIVATE ' + 'KEY-----' })[0], /private_key/);
  assert.match(pf({ 'docs/a.md': 'postgres://admin:S3cretValue@db.example.com/x' })[0], /url_password/);
  assert.match(pf({ 'server/a.ts': 'const apiKey = "' + 'a1B2'.repeat(8) + '";' })[0], /quoted_secret/);
  assert.deepEqual(pf({ 'docs/a.md': 'postgres://user:password@host/db and postgres://u:p@localhost/db and process.env.GEMINI_API_KEY' }), []);
  assert.deepEqual(pf({ 'tests/fixture.mjs': fakeKey }), []);
  assert.deepEqual(scanSecrets('plain text'), []);
});

test('preflight rejects a change or deletion of tests/acceptance/**', () => {
  assert.ok(pf({ 'tests/acceptance/a.test.mjs': 'x' }).some((x) => /protected path/.test(x)));
  assert.match(pf({}, ['tests/acceptance/a.test.mjs'])[0], /protected path/);
  assert.deepEqual(pf({}, ['docs/old.md']), []);
});

test('the real repository passes the preflight (no false positives)', () => {
  const files = readTree(root);
  assert.ok(files.size > 100);
  assert.deepEqual(preflight({ files, allowlist: allowlistFromToml(fs.readFileSync(path.join(root, '.gitleaks.toml'), 'utf8')) }), []);
});

test('first failure is found in TAP, spec and error output; nothing found gives null', () => {
  assert.equal(firstFailure('ok 1 - a\nnot ok 2 - budget blocks the call\n  ---'), 'budget blocks the call');
  assert.equal(firstFailure('✔ fine\n✖ plan is refused (12.5ms)\n'), 'plan is refused');
  assert.match(firstFailure('x\nAssertionError [ERR_ASSERTION]: 1 !== 2'), /AssertionError/);
  assert.equal(firstFailure('all good'), null);
});

test('CI summary: green is one line; red names the first failed test, or says there is no test log', () => {
  assert.deepEqual(ciSummary('success', []), { ok: true, text: 'CI: green' });
  assert.equal(ciSummary('failure', ['ok 1 - a', 'not ok 1 - live restart test']).text, 'CI: red. First failed: live restart test');
  assert.match(ciSummary('failure', []).text, /no test log/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-'));
  fs.writeFileSync(path.join(dir, 'ci-check.log'), 'not ok 3 - something broke\n');
  const r = spawnSync('node', [path.join(root, 'scripts/ci-summary.mjs'), path.join(dir, 'ci-check.log'), path.join(dir, 'missing.log')], { env: { ...process.env, CI_STATUS: 'failure' }, encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^::error title=BiForge CI::CI: red\. First failed: something broke/);
});

test('the CI workflow writes the summary after every run and adds no new secret', () => {
  const ci = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  assert.match(ci, /if: always\(\)\n\s+run: node scripts\/ci-summary\.mjs ci-check\.log ci-live\.log ci-api\.log/);
  assert.match(ci, /CI_STATUS: \$\{\{ job\.status \}\}/);
  assert.deepEqual([...new Set([...ci.matchAll(/secrets\.([A-Z_]+)/g)].map((m) => m[1]))], ['GITHUB_TOKEN']);
});

test('report: statuses come from the commands; NOT_RUN and BLOCKED are never shown as PASS', () => {
  const cmds = [{ cmd: 'npm run check', status: 'PASS', note: 'exit 0' }, { cmd: 'live', status: 'NOT_RUN', note: 'DATABASE_URL is not set' }];
  assert.equal(overallStatus([], cmds), 'PASS');
  assert.equal(overallStatus([], [...cmds, { cmd: 'b', status: 'BLOCKED', note: '' }]), 'BLOCKED');
  assert.equal(overallStatus([], [...cmds, { cmd: 'b', status: 'FAIL', note: '' }]), 'PARTIAL');   // a red check does not stop the archive
  assert.equal(overallStatus([], [...cmds, { cmd: 'b', status: 'TIMEOUT', note: '' }]), 'PARTIAL');
  assert.equal(overallStatus(['x: nested folder'], cmds), 'FAIL');   // only the preflight refuses the archive
  const md = renderReport({ patch: 'P99', agent: 'tool', base: 'base.zip', diff: { replace: ['a.md'], add: [], del: ['c.md'] }, violations: [], commands: cmds, notes: '', ownerSteps: ['one', 'two', 'three'], status: 'PASS' });
  assert.match(md, /\| `live` \| NOT_RUN \| DATABASE_URL is not set \|/);
  assert.match(md, /3\. three/);
  assert.match(md, /delete \(by hand\)/);
});

test('pack end to end: only changed and new files in the archive, report written, a bad patch gives no archive', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pack-'));
  const write = (base, rel, text) => { const f = path.join(dir, base, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
  for (const rel of ['a.md', 'docs/keep.md', 'docs/gone.md']) write('base', rel, `v1 ${rel}`);
  for (const [rel, t] of [['a.md', 'v2'], ['docs/keep.md', 'v1 docs/keep.md'], ['server/new.ts', 'new']]) write('work', rel, t);
  const run = (extra) => spawnSync('node', [path.join(root, 'scripts/patch-pack.mjs'), '--base', path.join(dir, 'base'), '--patch', 'P99', '--agent', 'test', '--skip', 'ci,typecheck,check,live,build', ...extra],
    { cwd: path.join(dir, 'work'), env: { ...process.env, DATABASE_URL: '1' }, encoding: 'utf8' });
  const ok = run([]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /^заменить 1, добавить 1, удалить 1/);
  const zip = await readZipTree(fs.readFileSync(path.join(dir, 'work/patch.zip')));
  assert.deepEqual([...zip.keys()].sort(), ['a.md', 'server/new.ts']);
  const report = fs.readFileSync(path.join(dir, 'work/patch-report.md'), 'utf8');
  assert.match(report, /\| `npm run check` \| NOT_RUN \| skipped by --skip check \|/);
  assert.doesNotMatch(report, /\| PASS \|/);
  write('work', 'docs/deep/x.md', 'nested'); fs.rmSync(path.join(dir, 'work/patch.zip'));
  const bad = run([]);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /nested folder/);
  assert.equal(fs.existsSync(path.join(dir, 'work/patch.zip')), false);
});

// ---------- hardening: a red or hanging check never stops the archive ----------
const sandbox = (scripts, extra = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hang-'));
  const w = (rel, text) => { const f = path.join(dir, 'work', rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
  fs.mkdirSync(path.join(dir, 'base'), { recursive: true }); fs.writeFileSync(path.join(dir, 'base/a.md'), 'v1');
  w('a.md', 'v2'); w('node_modules/.keep', ''); w('package.json', JSON.stringify({ name: 'x', scripts }));
  for (const [rel, text] of Object.entries(extra)) w(rel, text);
  for (const rel of ['package.json', ...Object.keys(extra)]) fs.copyFileSync(path.join(dir, 'work', rel), path.join(dir, 'base', rel));   // fixtures are in the base: the diff is a.md only
  const pack = (more = [], env = {}) => spawnSync('node', [path.join(root, 'scripts/patch-pack.mjs'), '--base', path.join(dir, 'base'), '--patch', 'P99', '--agent', 'test', ...more],
    { cwd: path.join(dir, 'work'), env: { ...process.env, DATABASE_URL: '', ...env }, encoding: 'utf8', timeout: 60_000 });
  return { dir, work: path.join(dir, 'work'), pack };
};

test('a hanging step is killed at its limit, later steps still run, the archive and the report are written', async () => {
  const sb = sandbox(
    { typecheck: 'node ok.mjs', check: 'node ok.mjs && node hang.mjs && node red.mjs && node ok.mjs', build: 'node ok.mjs' },
    { 'ok.mjs': 'process.exit(0)', 'hang.mjs': 'setInterval(() => {}, 1000)', 'red.mjs': 'console.log("not ok 1 - budget test"); process.exit(3)' });
  const t0 = Date.now();
  const r = sb.pack(['--step-timeout', '2', '--attempts', '2', '--skip', 'live']);
  assert.equal(r.status, 0, r.stderr);                                   // red and hanging steps do not fail the pack
  assert.ok(Date.now() - t0 < 30_000, 'the hang must be cut at the step limit');
  assert.match(r.stdout, /Status: PARTIAL/);
  const zip = await readZipTree(fs.readFileSync(path.join(sb.work, 'patch.zip')));
  assert.deepEqual([...zip.keys()], ['a.md']);                           // the archive holds the change only; logs and node_modules never enter it
  const report = fs.readFileSync(path.join(sb.work, 'patch-report.md'), 'utf8');
  assert.match(report, /\| `node hang\.mjs` \| TIMEOUT \|/);
  assert.match(report, /\| `node red\.mjs` \| FAIL \|.*2 attempt\(s\); first failure: budget test/);
  assert.match(report, /## Красные проверки/);
  assert.match(report, /\| `npm run build` \| PASS \|/);               // the step after the red ones still ran
  assert.ok(fs.readdirSync(path.join(sb.work, 'patch-logs')).length >= 5, 'one log file per attempt');
  assert.doesNotMatch(report, /IN_PROGRESS/);
});

test('--strict turns a red check into exit 2 after the archive is built; the total time limit leaves the rest BLOCKED', () => {
  const sb = sandbox({ typecheck: 'node ok.mjs', check: 'node slow.mjs && node ok.mjs', build: 'node ok.mjs' },
    { 'ok.mjs': 'process.exit(0)', 'slow.mjs': 'setTimeout(() => process.exit(0), 2500)' });
  const r = sb.pack(['--skip', 'live', '--total-timeout', '1', '--strict']);
  assert.equal(r.status, 2);
  assert.ok(fs.existsSync(path.join(sb.work, 'patch.zip')));
  const report = fs.readFileSync(path.join(sb.work, 'patch-report.md'), 'utf8');
  assert.match(report, /BLOCKED \| total time limit 1 s reached/);
});

test('the pack keeps going without node_modules: BLOCKED rows, archive built, nothing hangs', () => {
  const sb = sandbox({ typecheck: 'node ok.mjs', check: 'node ok.mjs', build: 'node ok.mjs' }, { 'ok.mjs': 'process.exit(0)' });
  fs.rmSync(path.join(sb.work, 'node_modules'), { recursive: true });
  const r = sb.pack(['--skip', 'live']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Status: BLOCKED/);
  assert.ok(fs.existsSync(path.join(sb.work, 'patch.zip')));
});

test('every node:test script in package.json has a per-test limit; database waits are bounded; the virtual runner limits each file', () => {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts;
  for (const [name, cmd] of Object.entries(scripts)) {
    if (/node (--import tsx )?--test /.test(cmd)) assert.match(cmd, /--test-timeout=\d+ --test-force-exit/, `${name} has no test timeout`);
  }
  assert.match(scripts['test:database:live'], /--test-concurrency=1/);
  const db = fs.readFileSync(path.join(root, 'server/database.ts'), 'utf8');
  for (const k of ['statement_timeout', 'lock_timeout', 'idle_in_transaction_session_timeout']) assert.match(db, new RegExp(k));
  const run = fs.readFileSync(path.join(root, 'tests/run.sh'), 'utf8');
  assert.match(run, /timeout -k 5/);
  assert.doesNotMatch(run, /set -e/);   // one failed file must not hide the others
});
