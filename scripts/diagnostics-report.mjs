/**
 * Canonical, workflow-independent diagnostics report.
 * Output: summary.md, summary.json, tests.log, failures.log, environment.log.
 * Raw test logs remain untouched for full fidelity.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.env.DIAGNOSTICS_DIR || 'artifacts/diagnostics');
fs.mkdirSync(dir, { recursive: true });
const walk = (base, depth = 0) => {
  if (!fs.existsSync(base) || depth > 5) return [];
  return fs.readdirSync(base, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(base, e.name);
    return e.isDirectory() ? walk(p, depth + 1) : [p];
  });
};
const files = [...new Set([...walk(path.join(root, 'artifacts')), ...walk(path.join(root, 'artifacts/ci-checks'))])]
  .filter((p) => !p.startsWith(dir) && /\.(?:tap|log|txt)$/i.test(p) && fs.statSync(p).size < 8_000_000);
const clean = (s) => s.replace(/\u001b\[[0-9;]*m/g, '')
  .replace(/((?:API_KEY|TOKEN|PASSWORD|SECRET|PRIVATE_KEY|DATABASE_URL)\s*[=:]\s*)\S+/gi, '$1[REDACTED]')
  .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
  .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[REDACTED_KEY]')
  .replace(/(postgres(?:ql)?:\/\/[^:/\s]+):[^@/\s]+@/gi, '$1:[REDACTED]@');
const logs = files.map((p) => ({ file: path.relative(root, p), text: clean(fs.readFileSync(p, 'utf8')) }));
const failureRe = /(?:^\s*not ok \d+|^\s*\[FAIL\]|\bAssertionError\b|\b(?:TypeError|SyntaxError|ReferenceError):|\b(?:TIMEOUT|timed out)\b|Process completed with exit code [1-9])/im;
const failures = logs.flatMap(({file,text}) => {
  const lines = text.split(/\r?\n/); const out = [];
  for (let i=0;i<lines.length;i++) if (failureRe.test(lines[i])) {
    out.push(`### ${file}\n${lines.slice(Math.max(0,i-2),Math.min(lines.length,i+9)).join('\n')}`);
    i += 7;
  }
  return out;
});
let dag = null;
for (const candidate of ['artifacts/ci-checks/results.json','artifacts/diagnostics/results.json']) {
  try { dag = JSON.parse(fs.readFileSync(path.join(root,candidate),'utf8')); break; } catch {}
}
const results = Array.isArray(dag?.results) ? dag.results : [];
const counts = Object.fromEntries(['PASS','FAIL','TIMEOUT','BLOCKED','SKIPPED','SKIPPED_BY_POLICY','NOT_RUN','UNKNOWN'].map(s => [s,results.filter(r => String(r.status||'UNKNOWN').toUpperCase()===s).length]));
const workflow = process.env.GITHUB_WORKFLOW || process.env.npm_lifecycle_event || 'local';
const status = process.env.CI_STATUS || (failures.length ? 'failure-signatures-found' : 'unknown');
const env = {
  workflow, status, sha: process.env.GITHUB_SHA || null, runId: process.env.GITHUB_RUN_ID || null,
  event: process.env.GITHUB_EVENT_NAME || null, node: process.version, platform: process.platform,
  arch: process.arch, generatedAt: new Date().toISOString(), logCount: logs.length, failureCount: failures.length,
};
const summary = { schemaVersion: 1, environment: env, checks: counts, dagWallClockMs: dag?.wallClockMs ?? null,
  dagResults: results.map(r => ({ id:r.id, status:r.status, durationMs:r.durationMs ?? null, log:r.log ?? null })),
  logs: logs.map(x => x.file), failures };
fs.writeFileSync(path.join(dir,'summary.json'), JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(path.join(dir,'environment.log'), Object.entries(env).map(([k,v])=>`${k}=${v ?? 'NOT_AVAILABLE'}`).join('\n')+'\n');
fs.writeFileSync(path.join(dir,'tests.log'), logs.map(x=>`\n===== ${x.file} =====\n${x.text}`).join('\n'));
fs.writeFileSync(path.join(dir,'failures.log'), failures.length ? failures.join('\n\n')+'\n' : 'No failure signatures captured. This does not imply unexecuted checks passed.\n');
const md = [
  '# Assistant diagnostic summary', '',
  `- Status: **${status}**`, `- Workflow: ${workflow}`, `- Commit: ${env.sha || 'NOT_AVAILABLE'}`,
  `- Run: ${env.runId || 'NOT_AVAILABLE'}`, `- Logs collected: ${logs.length}`, `- Failure signatures: ${failures.length}`, '',
  '## Verification counts', ...Object.entries(counts).map(([k,v])=>`- ${k}: ${v}`),
  `- DAG checks: ${results.length}`, `- DAG duration: ${summary.dagWallClockMs ?? 'NOT_AVAILABLE'} ms`, '',
  '## Failures', ...(failures.length ? failures.slice(0,12).map((f)=>`- ${f.split('\n').slice(0,4).join(' | ').slice(0,700)}`) : ['- No failure signatures captured; inspect NOT_RUN/BLOCKED status separately.']),
  '', '## Detailed evidence', '- `tests.log`: complete captured test output, grouped by source log.',
  '- `failures.log`: failure signatures with nearby context.', '- `environment.log`: run environment.', '- `summary.json`: machine-readable status and check inventory.', '',
].join('\n');
fs.writeFileSync(path.join(dir,'summary.md'), md);
console.log(`diagnostics report: ${dir} (${logs.length} logs, ${failures.length} failure signatures)`);
