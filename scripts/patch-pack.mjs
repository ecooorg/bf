// One command for a patch (P13a, TZ 16.3.2): npm run patch:pack -- --base <archive.zip|folder> --patch P13b --agent "tool, model" [--out patch.zip] [--report patch-report.md]
//   [--ci] [--skip typecheck,check,live,build] [--notes "text"] [--owner-steps "a;b;c"]
// Builds the cumulative archive (changed and new files only, repository paths, no manifest), runs the checks, writes the report, refuses an archive that fails the preflight.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readTree, readZipTree, diffTrees, summaryLine, buildZip, preflight, allowlistFromToml, firstFailure, overallStatus, renderReport } from './patch-tools.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def; };
const flag = (name) => args.includes(`--${name}`);
const root = process.cwd();
const basePath = opt('base');
if (!basePath || !fs.existsSync(basePath)) { console.error('Usage: npm run patch:pack -- --base <archive.zip|folder> --patch <PNN> --agent "<tool, model>"'); process.exit(64); }
const outPath = path.resolve(opt('out', 'patch.zip')); const reportPath = path.resolve(opt('report', 'patch-report.md'));
const skip = new Set((opt('skip', '')).split(',').filter(Boolean));

const base = fs.statSync(basePath).isDirectory() ? readTree(basePath) : await readZipTree(fs.readFileSync(basePath));
const work = readTree(root);
const diff = diffTrees(base, work);
const files = new Map([...diff.replace, ...diff.add].map((rel) => [rel, work.get(rel)]));

const toml = fs.existsSync('.gitleaks.toml') ? fs.readFileSync('.gitleaks.toml', 'utf8') : '';
const violations = preflight({ files, deleted: diff.del, allowlist: allowlistFromToml(toml) });
const commands = [];
if (fs.existsSync('scripts/check-docs.mjs')) {
  const r = spawnSync('node', ['scripts/check-docs.mjs'], { encoding: 'utf8' });
  if (r.status !== 0) violations.push(`stale document links: ${firstFailure(r.stderr + r.stdout) ?? (r.stderr || r.stdout).split('\n').find((l) => l.startsWith('- ')) ?? 'check:docs failed'}`);
} else commands.push({ cmd: 'node scripts/check-docs.mjs', status: 'NOT_RUN', note: 'file not found in the work tree' });

function run(cmd, npmArgs, { dropDb = false, key }) {
  if (skip.has(key)) return commands.push({ cmd, status: 'NOT_RUN', note: `skipped by --skip ${key}` });
  if (key !== 'ci' && !fs.existsSync('node_modules')) return commands.push({ cmd, status: 'BLOCKED', note: 'node_modules is missing; run npm ci' });
  const env = { ...process.env }; if (dropDb) { delete env.DATABASE_URL; delete env.PGSSLMODE; }
  const t = Date.now(); const r = spawnSync('npm', npmArgs, { env, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const log = `${r.stdout ?? ''}\n${r.stderr ?? ''}`; const sec = Math.round((Date.now() - t) / 1000);
  commands.push(r.status === 0 ? { cmd, status: 'PASS', note: `exit 0, ${sec} s` } : { cmd, status: 'FAIL', note: `exit ${r.status}, ${sec} s; first failure: ${firstFailure(log) ?? log.trim().split('\n').slice(-3).join(' / ')}` });
}
if (flag('ci')) run('npm ci', ['ci', '--no-audit', '--no-fund'], { key: 'ci' }); else commands.push({ cmd: 'npm ci', status: 'NOT_RUN', note: 'not requested (flag --ci)' });
run('npm run typecheck', ['run', 'typecheck'], { key: 'typecheck' });
run('npm run check', ['run', 'check'], { dropDb: true, key: 'check' });
if (process.env.DATABASE_URL) { run('npm run test:database:live', ['run', 'test:database:live'], { key: 'live' }); run('npm run test:bx06:api', ['run', 'test:bx06:api'], { key: 'live' }); }
else commands.push({ cmd: 'npm run test:database:live; npm run test:bx06:api', status: 'NOT_RUN', note: 'DATABASE_URL is not set: no database in this environment' });
run('npm run build', ['run', 'build'], { dropDb: true, key: 'build' });

const status = overallStatus(violations, commands);
const ownerSteps = opt('owner-steps') ? opt('owner-steps').split(';').map((s) => s.trim()) : [
  'Upload the files from the archive to main (replace and add), delete the files listed as "delete", wait for CI; compare `commit` in /health with GitHub.',
  'Open the site and /project: the existing screens work as before.',
  `Do the patch check from its SPEC (docs/${opt('patch', 'PNN')}-SPEC.md).`];
fs.writeFileSync(reportPath, renderReport({ patch: opt('patch', 'PNN'), agent: opt('agent', 'not stated'), base: path.basename(basePath), diff, violations, commands, notes: opt('notes'), ownerSteps, status }));
console.log(summaryLine(diff));
if (violations.length) { console.error(`Preflight failed, archive NOT built:\n${violations.map((x) => `- ${x}`).join('\n')}\nReport: ${reportPath}`); process.exit(1); }
if (status === 'FAIL') { console.error(`A check failed, archive NOT built. Report: ${reportPath}`); process.exit(2); }
fs.writeFileSync(outPath, await buildZip(files));
console.log(`Archive: ${outPath} (${files.size} files)\nReport: ${reportPath}\nStatus: ${status}`);
