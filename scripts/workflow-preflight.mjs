#!/usr/bin/env node
/**
 * Workflow preflight: fails when a workflow references something that no longer exists
 * (files, npm scripts, exports) or when package metadata is inconsistent.
 * Writes <CI_LOGS_DIR>/00-preflight.log (PASS/FAIL lines are read by diagnostics-summary).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logDir = path.resolve(root, process.env.CI_LOGS_DIR || 'artifacts/diagnostics');
fs.mkdirSync(logDir, { recursive: true });
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const pkg = JSON.parse(read('package.json'));
const lines = [];
const problems = [];
const note = (s) => lines.push(s);
const fail = (s) => { problems.push(s); lines.push(`FAIL ${s}`); };

const wfDir = '.github/workflows';
const workflows = fs.readdirSync(path.join(root, wfDir)).filter((n) => /\.ya?ml$/.test(n)).sort();
const only = process.env.PREFLIGHT_WORKFLOW;
for (const name of workflows) {
  if (only && name !== only) continue;
  const text = read(`${wfDir}/${name}`);
  const refs = new Set();
  for (const m of text.matchAll(/\b(?:node|tsx)(?:\s+--[\w-]+(?:=\S+)?)*\s+((?:scripts|tests|server)\/[\w./-]+\.(?:mjs|ts))/g)) refs.add(m[1]);
  for (const m of text.matchAll(/^\s+(tests\/[\w./-]+\.test\.mjs)\s*\\?$/gm)) refs.add(m[1]);
  for (const m of text.matchAll(/from '\.\/(server\/[\w./-]+\.ts)'/g)) refs.add(m[1]);
  for (const ref of refs) if (!exists(ref)) fail(`${name}: references missing file ${ref}`);
  for (const m of text.matchAll(/npm run ([\w:.-]+)/g)) if (!pkg.scripts?.[m[1]]) fail(`${name}: references missing npm script ${m[1]}`);
  // Non-glob entries of on.*.paths must exist; globs must match at least one tracked file prefix.
  for (const m of text.matchAll(/^\s+-\s+'([^']+)'\s*$/gm)) {
    const p = m[1];
    if (!/[*[\]]/.test(p)) { if (!exists(p)) fail(`${name}: paths filter lists missing file ${p}`); continue; }
    const prefix = p.split(/[*[]/)[0];
    const dir = prefix.endsWith('/') ? prefix : path.dirname(prefix);
    if (dir && dir !== '.' && !exists(dir)) fail(`${name}: paths filter glob ${p} points to missing directory ${dir}`);
  }
  for (const m of text.matchAll(/uses:\s*(\.\/[^\s#]+)/g)) if (!exists(path.join(m[1], 'action.yml'))) fail(`${name}: local action ${m[1]} has no action.yml`);
  note(`checked ${name}: ${refs.size} file reference(s)`);
}

// Current program state.
const patchNumeric = String(pkg.patch || '').replace(/[a-z]$/i, '');
const patchOk = /^\d+(\.\d+)+$/.test(patchNumeric) && patchNumeric.split('.')[0] === String(pkg.version);
if (!patchOk) fail(`package.json patch ${pkg.patch} does not belong to version ${pkg.version}`);
const lock = exists('package-lock.json') ? JSON.parse(read('package-lock.json')) : null;
if (lock && lock.version !== undefined && String(lock.version) !== String(pkg.version) && String(lock.version) !== String(pkg.patch)) {
  note(`lockfile root version ${lock.version} (package ${pkg.version}/${pkg.patch}); version-consistency check decides`);
}
const nvm = exists('.nvmrc') ? read('.nvmrc').trim().replace(/^v/, '') : '';
if (nvm && nvm.split('.')[0] !== process.versions.node.split('.')[0]) fail(`node ${process.version} differs from .nvmrc ${nvm}`);

// Live exports the Answer Quality workflow relies on.
const exportsExpected = { 'server/nationalAuthorities.ts': ['loadNationalAuthorities'], 'server/keyPool.ts': ['resolveGeminiKeySlots', 'KeyPoolState'] };
for (const [file, names] of Object.entries(exportsExpected)) {
  if (!exists(file)) { fail(`missing ${file}`); continue; }
  const src = read(file);
  for (const n of names) if (!new RegExp(`export\\s+(?:async\\s+)?(?:function|class|const)\\s+${n}\\b`).test(src)) fail(`${file} no longer exports ${n}`);
}

// Every current-cycle test must be reachable from some npm script (no orphaned coverage).
const scriptText = Object.values(pkg.scripts || {}).join('\n');
const manifest = exists('docs/verification-manifest.json') ? read('docs/verification-manifest.json') : '';
const cycle = `p${pkg.version}-`;
const orphans = fs.readdirSync(path.join(root, 'tests')).filter((n) => n.startsWith(cycle) && n.endsWith('.test.mjs'))
  .filter((n) => !scriptText.includes(n) && !manifest.includes(n));
for (const o of orphans) fail(`tests/${o} is not run by any npm script or verification check`);

const v = spawnSync(process.execPath, ['scripts/check-version.mjs'], { cwd: root, encoding: 'utf8' });
if (v.status !== 0) fail(`version check failed: ${(v.stdout + v.stderr).trim().slice(0, 300)}`);

lines.unshift(`${problems.length ? 'FAIL' : 'PASS'} workflow preflight — patch ${pkg.patch}, version ${pkg.version}, node ${process.version}, ${workflows.length} workflow(s)`);
fs.writeFileSync(path.join(logDir, '00-preflight.log'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
process.exit(problems.length ? 1 : 0);
