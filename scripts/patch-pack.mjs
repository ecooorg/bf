// One command for a patch (P13a, TZ 16.3.2; hardened after the P13b hang):
//   npm run patch:pack -- --base <archive.zip|folder> --patch P13b --agent "tool, model" [--out patch.zip] [--report patch-report.md]
//   [--ci] [--skip ci,typecheck,check,live,build,<step name>] [--only <step names or groups>] [--notes "text"] [--owner-steps "a;b;c"]
//   [--step-timeout 300] [--total-timeout 1800] [--attempts 2] [--log-dir patch-logs] [--strict]
// Order: preflight -> archive is built FIRST -> every check runs as its own step with a time limit -> the report is rewritten after every step.
// So a red or hanging check never stops the archive; only the preflight (manifest, nested folders, secrets, protected paths) refuses it.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { readTree, readZipTree, diffTrees, summaryLine, buildZip, preflight, allowlistFromToml, firstFailure, overallStatus, renderReport } from './patch-tools.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def; };
const flag = (name) => args.includes(`--${name}`);
const num = (name, def) => { const n = Number(opt(name)); return Number.isFinite(n) && n > 0 ? n : def; };
const root = process.cwd();
const basePath = opt('base');
if (!basePath || !fs.existsSync(basePath)) { console.error('Usage: npm run patch:pack -- --base <archive.zip|folder> --patch <PNN> --agent "<tool, model>"'); process.exit(64); }
const outPath = path.resolve(opt('out', 'patch.zip')); const reportPath = path.resolve(opt('report', 'patch-report.md'));
const logDir = path.resolve(opt('log-dir', 'patch-logs'));
const skip = new Set(opt('skip', '').split(',').filter(Boolean));
const only = new Set(opt('only', '').split(',').filter(Boolean));
const stepTimeoutOverride = num('step-timeout', null);
const totalTimeout = num('total-timeout', 1800);
const attempts = Math.max(1, Math.floor(num('attempts', 2)));
const patch = opt('patch', 'PNN'); const agent = opt('agent', 'not stated');

const base = fs.statSync(basePath).isDirectory() ? readTree(basePath) : await readZipTree(fs.readFileSync(basePath));
const work = readTree(root);
const diff = diffTrees(base, work);
const files = new Map([...diff.replace, ...diff.add].map((rel) => [rel, work.get(rel)]));

const toml = fs.existsSync('.gitleaks.toml') ? fs.readFileSync('.gitleaks.toml', 'utf8') : '';
const violations = preflight({ files, deleted: diff.del, allowlist: allowlistFromToml(toml) });
const commands = [];
const limitsNote = `Лимиты запуска: шаг ${stepTimeoutOverride ?? 'по умолчанию 300 (ci и живые тесты 600)'} с, всего ${totalTimeout} с, попыток на красный шаг ${attempts} (таймаут не повторяется). Логи шагов: \`${path.relative(root, logDir)}/\` (в архив не входят).`;
const notes = [opt('notes'), limitsNote, only.size ? `Запуск с --only ${[...only].join(',')}: остальные шаги не выполнялись.` : ''].filter(Boolean).join('\n\n');
const ownerSteps = opt('owner-steps') ? opt('owner-steps').split(';').map((s) => s.trim()) : [
  'Upload the files from the archive to main (replace and add), delete the files listed as "delete", wait for CI; compare `commit` in /health with GitHub.',
  'Open the site and /project: the existing screens work as before.',
  `Do the patch check from its SPEC (docs/${patch}-SPEC.md).`];
const writeReport = (status) => fs.writeFileSync(reportPath, renderReport({ patch, agent, base: path.basename(basePath), diff, violations, commands, notes, ownerSteps, status }));

console.log(summaryLine(diff));
if (violations.length) {
  fs.rmSync(outPath, { force: true });   // a stale archive from an earlier run must not be mistaken for this one
  writeReport('FAIL');
  console.error(`Preflight failed, archive NOT built:\n${violations.map((x) => `- ${x}`).join('\n')}\nReport: ${reportPath}`);
  process.exit(1);
}
fs.writeFileSync(outPath, await buildZip(files));   // built before any check: a red or hanging check cannot stop it
console.log(`Archive: ${outPath} (${files.size} files), built before the checks`);

// ---------- steps ----------
let pkg = { scripts: {} };
try { pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); } catch { /* no package.json: every npm step becomes NOT_RUN */ }
const scripts = pkg.scripts ?? {};
const GROUP_CMD = { ci: 'npm ci', typecheck: 'npm run typecheck', check: 'npm run check', live: 'npm run test:database:live; npm run test:bx06:api', build: 'npm run build' };
const npmName = (cmd) => cmd.match(/^npm run ([\w:.-]+)$/)?.[1];
const steps = [];
const addStep = (group, cmd, o = {}) => { const name = o.name ?? npmName(cmd) ?? cmd; if (!steps.some((s) => s.name === name)) steps.push({ ...o, group, name, cmd }); };
if (flag('ci')) addStep('ci', 'npm ci --no-audit --no-fund', { timeout: 600 });
if (fs.existsSync('scripts/check-docs.mjs')) addStep('check', 'node scripts/check-docs.mjs', { name: 'check:docs' });   // documents first: it needs no dependencies
addStep('typecheck', 'npm run typecheck');
for (const part of String(scripts.check ?? '').split('&&').map((x) => x.trim()).filter(Boolean)) addStep('check', part, { dropDb: true });   // the chain of `npm run check`, one step per command, run without DATABASE_URL as in CI
if (process.env.DATABASE_URL) { addStep('live', 'npm run test:database:live', { timeout: 600 }); addStep('live', 'npm run test:bx06:api', { timeout: 600 }); }
addStep('build', 'npm run build', { dropDb: true });

// ---------- running ----------
let seq = 0; let current = null; let finished = false;
const killGroup = (child, sig) => { try { process.kill(-child.pid, sig); } catch { /* group already gone */ } };
const rel = (f) => path.relative(root, f).split(path.sep).join('/');

function runOnce(s, limitSec) {
  return new Promise((resolve) => {
    fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, `${String(++seq).padStart(2, '0')}-${s.name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 60)}.log`);
    const fd = fs.openSync(logFile, 'w');   // the child writes straight into the file: nothing is buffered, `tail -f` shows progress
    const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
    if (s.dropDb) { delete env.DATABASE_URL; delete env.PGSSLMODE; }
    const t0 = Date.now();
    const child = spawn('sh', ['-c', s.cmd], { env, detached: true, stdio: ['ignore', fd, fd] });   // own process group: the whole tree can be killed
    fs.closeSync(fd);
    current = child;
    let timedOut = false; let done = false;
    let timer; let hard;
    const finish = (code, signal) => {
      if (done) return; done = true; clearTimeout(timer); clearTimeout(hard);
      killGroup(child, 'SIGKILL');   // also reaps servers the step left behind
      current = null;
      resolve({ code, signal, timedOut, sec: Math.round((Date.now() - t0) / 1000), logFile });
    };
    timer = setTimeout(() => { timedOut = true; killGroup(child, 'SIGTERM'); setTimeout(() => killGroup(child, 'SIGKILL'), 3000).unref(); }, limitSec * 1000);
    hard = setTimeout(() => finish(null, 'SIGKILL'), (limitSec + 10) * 1000);
    child.on('exit', (code, signal) => finish(code, signal));
    child.on('error', () => finish(127, null));
  });
}
const tailOf = (file, n) => { try { return fs.readFileSync(file, 'utf8').slice(-2_000_000).trim().split('\n').slice(-n).join(' / ').slice(0, 300); } catch { return ''; } };

async function execute(s) {
  const limit = stepTimeoutOverride ?? s.timeout ?? 300;
  const max = s.group === 'ci' ? 1 : attempts;
  let r; let tries = 0;
  for (;;) {
    tries++;
    console.error(`[patch-pack] ${s.name}: start (limit ${limit} s, attempt ${tries}/${max})`);
    r = await runOnce(s, limit);
    if (r.code === 0 && !r.timedOut) break;
    if (r.timedOut || tries >= max) break;   // a hang is not retried: it would only repeat the wait
  }
  const log = rel(r.logFile);
  if (r.timedOut) return { cmd: s.cmd, status: 'TIMEOUT', note: `stopped after ${limit} s (no retry); last output: ${tailOf(r.logFile, 3) || '(none)'}`, log, failure: `TIMEOUT after ${limit} s; ${tailOf(r.logFile, 2) || 'no output'}` };
  if (r.code === 0) return { cmd: s.cmd, status: 'PASS', note: `exit 0, ${r.sec} s${tries > 1 ? `, passed on attempt ${tries} of ${max}` : ''}`, log };
  let text = ''; try { text = fs.readFileSync(r.logFile, 'utf8').slice(-2_000_000); } catch { /* unreadable log */ }
  const first = firstFailure(text) ?? tailOf(r.logFile, 3);
  return { cmd: s.cmd, status: 'FAIL', note: `exit ${r.code ?? r.signal}, ${r.sec} s, ${tries} attempt(s); first failure: ${first}`, log, failure: first };
}

const onSignal = (sig) => {
  if (finished) return;
  if (current) killGroup(current, 'SIGKILL');
  commands.push({ cmd: '(patch-pack)', status: 'FAIL', note: `interrupted by ${sig}`, failure: `interrupted by ${sig}` });
  writeReport('INTERRUPTED');
  console.error(`Interrupted by ${sig}. Archive: ${outPath}. Report: ${reportPath}`);
  process.exit(130);
};
process.on('SIGINT', () => onSignal('SIGINT')); process.on('SIGTERM', () => onSignal('SIGTERM'));

writeReport('IN_PROGRESS');
const started = Date.now();
for (const group of ['ci', 'typecheck', 'check', 'live', 'build']) {
  const gs = steps.filter((s) => s.group === group);
  const hasNpmScript = (s) => { const n = npmName(s.cmd); return !n || Boolean(scripts[n]); };
  if (skip.has(group)) { commands.push({ cmd: GROUP_CMD[group], status: 'NOT_RUN', note: `skipped by --skip ${group}` }); writeReport('IN_PROGRESS'); continue; }
  if (group === 'ci' && !gs.length) { commands.push({ cmd: GROUP_CMD.ci, status: 'NOT_RUN', note: 'not requested (flag --ci)' }); continue; }
  if (group === 'live' && !gs.length) { commands.push({ cmd: GROUP_CMD.live, status: 'NOT_RUN', note: 'DATABASE_URL is not set: no database in this environment' }); continue; }
  if (!gs.length) { commands.push({ cmd: GROUP_CMD[group], status: 'NOT_RUN', note: `no "${group}" script in package.json` }); continue; }
  for (const s of gs) {
    if (only.size && !only.has(s.name) && !only.has(group)) continue;
    if (skip.has(s.name)) { commands.push({ cmd: s.cmd, status: 'NOT_RUN', note: `skipped by --skip ${s.name}` }); continue; }
    if (!hasNpmScript(s)) { commands.push({ cmd: s.cmd, status: 'NOT_RUN', note: 'script not found in package.json' }); continue; }
    if (group !== 'ci' && !fs.existsSync('node_modules')) { commands.push({ cmd: s.cmd, status: 'BLOCKED', note: 'node_modules is missing; run npm ci' }); continue; }
    if ((Date.now() - started) / 1000 > totalTimeout) { commands.push({ cmd: s.cmd, status: 'BLOCKED', note: `total time limit ${totalTimeout} s reached: not checked` }); continue; }
    const res = await execute(s);
    commands.push(res);
    console.error(`[patch-pack] ${s.name}: ${res.status}`);
    writeReport('IN_PROGRESS');   // a killed process still leaves a current report
  }
}
finished = true;
const status = overallStatus(violations, commands);
writeReport(status);
const red = commands.filter((c) => c.status === 'FAIL' || c.status === 'TIMEOUT').length;
console.log(`Report: ${reportPath}\nStatus: ${status}${status === 'PARTIAL' ? ` — archive is built, ${red} red step(s); see "Красные проверки" in the report and the logs in ${path.relative(root, logDir)}/` : ''}`);
if (flag('strict') && status !== 'PASS') process.exit(2);
process.exit(0);
