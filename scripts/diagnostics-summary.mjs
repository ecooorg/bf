/** One handoff file plus three readable, consistently named diagnostic logs for every workflow. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.env.CI_LOGS_DIR || 'artifacts/diagnostics');
fs.mkdirSync(dir, { recursive: true });
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const ignored = new Set(['ASSISTANT_SUMMARY.md', 'checks.log', 'failures.log', 'environment.log']);
const inputs = [];
function walk(folder, depth = 0) {
  if (depth > 4) return;
  for (const name of fs.readdirSync(folder).sort()) {
    const file = path.join(folder, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) walk(file, depth + 1);
    else if (!ignored.has(name) && stat.size && stat.size < 2_000_000 && /\.(?:log|txt|out|json|md|tap)$/i.test(name)) inputs.push(file);
  }
}
walk(dir);
const redactText = value => String(value)
  .replace(/((?:OPENAI|GEMINI|GOOGLE|SERPER|GROQ|ANTHROPIC)?[_-]?(?:API[_-]?KEY|TOKEN|PASSWORD|SECRET)\s*[:=]\s*[\"']?)[^\s,;\"'}]+/gi, '$1[REDACTED]')
  .replace(/(Bearer\s+)[A-Za-z0-9._~+\/-]+=*/gi, '$1[REDACTED]')
  .replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{25,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{15,})\b/g, '[REDACTED]')
  .replace(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, '[REDACTED PRIVATE KEY]');
const redactJson = value => {
  if (typeof value === 'string') return redactText(value);
  if (Array.isArray(value)) return value.map(redactJson);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, /(?:api[_-]?key|token|password|secret)/i.test(k) ? '[REDACTED]' : redactJson(v)]));
  return value;
};
const read = (file) => {
  const raw = fs.readFileSync(file, 'utf8').replace(/\u001b\[[0-9;]*m/g, '');
  if (file.endsWith('.json')) {
    try { const safe = JSON.stringify(redactJson(JSON.parse(raw)), null, 2) + '\n'; if (safe !== raw) fs.writeFileSync(file, safe); return safe; }
    catch { const safe = redactText(raw); if (safe !== raw) fs.writeFileSync(file, safe); return safe; }
  }
  const safe = redactText(raw); if (safe !== raw) fs.writeFileSync(file, safe); return safe;
};
const hardFailure = text => /(?:^|\s)not ok \d+\b|\bAssertionError\b|\b(?:TypeError|ReferenceError|SyntaxError):|\bERR_TEST_FAILURE\b|\btest timed out\b|^\s*(?:FAIL(?:ED)?|ERROR)(?:\s|:|$)|Process completed with exit code [1-9]/im.test(text);
const tapTotals = text => {
  const sum = pattern => [...text.matchAll(pattern)].reduce((n, match) => n + Number(match[1]), 0);
  const tests = sum(/^.*?# tests\s+(\d+)\s*$/gm);
  if (!tests) return null;
  return { tests, passed: sum(/^.*?# pass\s+(\d+)\s*$/gm), failed: sum(/^.*?# fail\s+(\d+)\s*$/gm), skipped: sum(/^.*?# skipped\s+(\d+)\s*$/gm) };
};
const failedNames = [];
const checks = [];
const failures = [];
const structuredReports = [];
const stageChecks = [];
const stageKeys = new Set();
const hasDagResults = inputs.some(file => path.basename(file) === 'results.json');
const manifest = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'docs/verification-manifest.json'), 'utf8')); }
  catch { return { checks: [] }; }
})();
const commands = new Map((manifest.checks || []).map(check => [check.id, (check.argv || []).join(' ')]));
for (const file of inputs) {
  const text = read(file);
  const rel = path.relative(dir, file).split(path.sep).join('/');
  const tap = tapTotals(text);
  const explicitStatus = text.match(/^\s*(BLOCKED|NOT_RUN|FAIL(?:ED)?|PASS)\b/im)?.[1]?.toUpperCase() || '';
  const state = hardFailure(text) || (tap && tap.failed > 0) ? 'FAIL'
    : ['BLOCKED', 'NOT_RUN'].includes(explicitStatus) ? explicitStatus
    : ['FAIL', 'FAILED'].includes(explicitStatus) ? 'FAIL'
    : tap && tap.passed > 0 ? 'PASS'
    : explicitStatus === 'PASS' || /(?:^|\n)\s*ok \d+\b/.test(text) ? 'PASS' : 'LOG';
  if (file.endsWith('.json')) {
    try {
      const data = JSON.parse(text);
      const base = path.basename(file);
      if (!['results.json', 'ci-metrics.json', 'evidence-dag.json'].includes(base)) {
        const fields = ['status', 'verdict', 'result', 'summary', 'error', 'reason', 'score', 'overallScore', 'coverage', 'passed', 'failed', 'total', 'dimensions', 'checks', 'warnings', 'advisories', 'samples', 'optionalProviders', 'runtimeConfigCommit'];
        const brief = Object.fromEntries(fields.filter(key => data && Object.hasOwn(data, key)).map(key => [key, data[key]]));
        if (Object.keys(brief).length) structuredReports.push({ file: rel, brief: JSON.stringify(brief).slice(0, 1_200) });
      }
      if (base === 'results.json' || (!hasDagResults && ['ci-metrics.json', 'evidence-dag.json'].includes(base))) {
        const collect = value => {
          if (!value || typeof value !== 'object') return;
          if (Array.isArray(value)) { for (const item of value) collect(item); return; }
          if (typeof value.id === 'string' && typeof value.status === 'string') {
            const row = { id: value.id, status: value.status, durationMs: value.durationMs ?? null,
              log: value.log || null, note: value.note || value.error || null, command: commands.get(value.id) || null };
            const key = `${row.id}|${row.status}|${row.durationMs}|${row.log || ''}`;
            if (!stageKeys.has(key)) { stageKeys.add(key); stageChecks.push(row); }
          }
          for (const [key, child] of Object.entries(value)) if (['results', 'checkResults'].includes(key) || (child && typeof child === 'object')) collect(child);
        };
        collect(data);
      }
    } catch { /* a malformed optional JSON artifact is still represented as a log file */ }
  }
  checks.push({ file: rel, state, ...(tap ? tap : {}) });
  for (const m of text.matchAll(/^\s*not ok \d+ - (.+?)(?:\s+#.*)?$/gm)) if (failedNames.length < 40) failedNames.push(`${rel}: ${m[1].slice(0, 160)}`);
  const lines = text.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    if (hardFailure(lines[i])) {
      hits.push(lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 9)).join('\n'));
      i += 5;
    }
  }
  if (hits.length) failures.push({ file: rel, excerpts: hits.slice(0, 4).map(hit => hit.slice(0, 1_200)) });
}
const env = [
  `workflow=${process.env.GITHUB_WORKFLOW || 'local'}`, `run=${process.env.GITHUB_RUN_ID || 'n/a'}`,
  `commit=${process.env.GITHUB_SHA || 'unknown'}`, `ref=${process.env.GITHUB_REF || 'unknown'}`,
  `event=${process.env.GITHUB_EVENT_NAME || 'unknown'}`, `status=${process.env.CI_STATUS || 'unknown'}`,
  `patch=${pkg.patch}`, `version=${pkg.version}`, `node=${process.version}`, `platform=${os.platform()} ${os.release()} ${os.arch()}`,
  `generated=${new Date().toISOString()}`,
].join('\n') + '\n';
const checkLog = [...checks.map(c => `${c.state.padEnd(7)} ${c.file}${c.tests !== undefined ? ` — ${c.passed}/${c.tests} passed, ${c.failed} failed, ${c.skipped} skipped` : ''}`), ...stageChecks.map(c => `${c.status.padEnd(7)} ${c.id}${c.durationMs !== null ? ` — ${c.durationMs} ms` : ''}${c.log ? ` — log: ${c.log}` : ''}`)].join('\n') + '\n';
const failLog = failures.map(f => `## ${f.file}\n${f.excerpts.join('\n---\n')}`).join('\n\n') || 'No failure signatures found.\n';
fs.writeFileSync(path.join(dir, 'environment.log'), env);
fs.writeFileSync(path.join(dir, 'checks.log'), checkLog);
fs.writeFileSync(path.join(dir, 'failures.log'), failLog);
const failed = checks.filter(c => c.state === 'FAIL');
const blocked = [...checks.filter(c => c.state === 'BLOCKED'), ...stageChecks.filter(c => c.status === 'BLOCKED')];
const dagFailures = stageChecks.filter(c => ['FAIL', 'TIMEOUT', 'INTERRUPTED'].includes(c.status));
const statusCounts = stageChecks.reduce((out, c) => { out[c.status] = (out[c.status] || 0) + 1; return out; }, {});
const total = checks.reduce((n,c) => n + (c.tests || 0), 0);
const passed = checks.reduce((n,c) => n + (c.passed || 0), 0);
const failedTests = checks.reduce((n,c) => n + (c.failed || 0), 0);
const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : '';
const rawWorkflowStatus = String(process.env.CI_STATUS || (failed.length ? 'failure' : 'unknown')).toLowerCase();
const workflowStatus = /^(?:success|successful|passed|pass)$/i.test(rawWorkflowStatus) ? 'PASS'
  : /^(?:failure|failed|error|cancelled|timed_out)$/i.test(rawWorkflowStatus) ? 'FAIL' : 'UNKNOWN';
const summary = [
  '# BiForge — Diagnostic Report', '',
  `- **Workflow status:** ${workflowStatus}${rawWorkflowStatus !== workflowStatus.toLowerCase() ? ` (${rawWorkflowStatus})` : ''}`, 
  `- **Workflow:** ${process.env.GITHUB_WORKFLOW || 'local'}`,
  `- **Patch / version:** ${pkg.patch} / ${pkg.version}`,
  `- **Commit:** ${process.env.GITHUB_SHA || 'unknown'}`,
  `- **Run:** ${runUrl || process.env.GITHUB_RUN_ID || 'local'}`,
  `- **Log files inspected:** ${checks.length}`,
  `- **TAP totals:** ${passed}/${total} passed; ${failedTests} failed`,
  `- **DAG:** ${stageChecks.length} checks; ${Object.entries(statusCounts).map(([k,v]) => `${k}=${v}`).join(', ') || 'no structured results'}`,
  `- **Files with failures:** ${failed.length}; failed/timed-out DAG checks: ${dagFailures.length}; blocked: ${blocked.length}`,
  '', '## Check Results', '',
  checks.length ? checks.map(c => `- **${c.state}** — \`${c.file}\`${c.tests !== undefined ? ` (${c.passed}/${c.tests}; failed ${c.failed}; skipped ${c.skipped})` : ''}`).join('\n') : 'No test logs found.',
  stageChecks.length ? `\n### DAG Checks (${stageChecks.length})\n\n${stageChecks.map(c => `- **${c.status}** — \`${c.id}\`${c.durationMs !== null ? ` (${c.durationMs} ms)` : ''}${c.note ? ` — ${String(c.note).slice(0, 180)}` : ''}`).join('\n')}` : '',
  structuredReports.length ? `\n## Structured Reports\n\n${structuredReports.slice(0, 8).map(r => `### ${r.file}\n\n\`\`\`json\n${r.brief}\n\`\`\``).join('\n\n')}` : '',
  '', '## Failures and Context', '',
  stageChecks.some(c => ['FAIL', 'TIMEOUT', 'BLOCKED', 'NOT_RUN'].includes(c.status)) ? `### DAG failures and rerun commands\n\n${stageChecks.filter(c => ['FAIL', 'TIMEOUT', 'BLOCKED', 'NOT_RUN'].includes(c.status)).map(c => `- **${c.status}** \`${c.id}\`${c.command ? ` — \`${c.command}\`` : ''}${c.log ? ` (log: \`${c.log}\`)` : ''}${c.note ? `\n  ${String(c.note).slice(0, 250)}` : ''}`).join('\n')}` : '',
  failures.length ? failures.slice(0, 8).map(f => `### ${f.file}\n\n\`\`\`text\n${f.excerpts.join('\n\n---\n\n').slice(0, 2_500)}\n\`\`\``).join('\n\n') : 'No failure signatures detected.',
  failedNames.length ? `\n### Failed test names (${failedNames.length}${failedNames.length >= 40 ? '+' : ''})\n\n${failedNames.map(n => `- ${n}`).join('\n')}` : '',
  '', '## Reproduction', '',
  process.env.WORKFLOW_RERUN ? `Workflow rerun commands:\n\n\`\`\`bash\n${process.env.WORKFLOW_RERUN.split(/;\s*|\s+&&\s+/).join('\n')}\n\`\`\`\n` : '',
  'Rerun the failed check command first, then rerun the complete workflow profile. BLOCKED and NOT_RUN are not successful results.',
  '', '## Companion Logs', '',
  '- `checks.log` — concise status for every log file and structured DAG check.',
  '- `failures.log` — failure excerpts with surrounding context.',
  '- `environment.log` — runtime environment and run identity.',
  '- Raw workflow logs — full command output; filenames identify the step and test area.',
  '', '## Evidence rules for the assistant', '',
  '- Only steps listed above ran. NOT_RUN, BLOCKED and absent steps are not PASS (AGENTS.md G5).',
  '- Preflight (`00-preflight.log`) states whether referenced files, npm scripts, exports and version metadata were current at this commit.',
  '- Green automated checks do not prove user value; report them separately from user-level evidence.',
  '',
].join('\n');
fs.writeFileSync(path.join(dir, 'ASSISTANT_SUMMARY.md'), summary);
console.log(`Diagnostics: ${checks.length} log(s), ${failed.length} failure file(s); wrote ASSISTANT_SUMMARY.md`);
