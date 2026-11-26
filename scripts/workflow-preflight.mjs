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
// C131: materialize soft-price repair body from text parts when present (Core CI does not run ensure-repair).
{
  const parts = [0, 1, 2].map((i) => path.join(root, 'server', `immofinderRepair.ts.body.p${i}`));
  if (parts.every((p) => fs.existsSync(p))) {
    const full = parts.map((p) => fs.readFileSync(p, 'utf8')).join('');
    if (full.length > 20000 && full.includes('export function hardRejectReason') && full.includes('never hide a verified listing')) {
      fs.writeFileSync(path.join(root, 'server', 'immofinderRepair.ts'), full);
      console.log('preflight: joined immofinderRepair.ts from body parts', full.length);
    }
  }
}
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
  for (const m of text.matchAll(/uses:\s*([^\s#]+)/g)) {
    const u = m[1].trim();
    if (u.startsWith('./') || u.startsWith('.github/')) refs.add(u);
  }
  for (const m of text.matchAll(/run:\s*\|?[\s\S]*?(?=\n\s*(?:-\s+name:|-\s+uses:|-\s+run:|permissions:|env:|defaults:|concurrency:|jobs:|$))/g)) {
    for (const s of m[0].matchAll(/npm\s+run\s+([a-zA-Z0-9:_-]+)/g)) refs.add(`script:${s[1]}`);
  }
  for (const m of text.matchAll(/npm\s+run\s+([a-zA-Z0-9:_-]+)/g)) refs.add(`script:${m[1]}`);
  for (const m of text.matchAll(/node\s+(scripts\/[\w./-]+\.m?js)/g)) refs.add(m[1]);
  for (const m of text.matchAll(/tsx\s+(scripts\/[\w./-]+\.m?js)/g)) refs.add(m[1]);
  for (const r of refs) {
    if (r.startsWith('script:')) {
      const s = r.slice(7);
      if (!pkg.scripts || !pkg.scripts[s]) fail(`${name}: npm script ${s} missing`);
    } else if (r.startsWith('./') || r.startsWith('.github/')) {
      if (!exists(r.replace(/^\.\//, ''))) fail(`${name}: path ${r} missing`);
    } else if (r.startsWith('scripts/')) {
      if (!exists(r)) fail(`${name}: ${r} missing`);
    }
  }
  for (const m of text.matchAll(/uses:\s*(\.\/[^\s#]+)/g)) if (!exists(path.join(m[1], 'action.yml'))) fail(`${name}: local action ${m[1]} has no action.yml`);
}

// Required scripts for Core CI DAG profile
for (const s of ['typecheck', 'test:core', 'docs:integrity', 'workflow:preflight', 'version:check']) {
  if (!pkg.scripts?.[s]) fail(`required script ${s} missing`);
}

// Export surface for key modules used by tests
for (const [file, names] of Object.entries({
  'server/immofinderRepair.ts': ['hardRejectReason', 'sanitizeNewRecord', 'REPAIR_RULES_VERSION'],
})) {
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
