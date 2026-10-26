import fs from 'node:fs';
import path from 'node:path';

const PROTECTED = [
  /^tests\/.*(?:security|gate|acceptance|authorization|evidence|dag|p108).*\.test\.[cm]?[jt]sx?$/i,
  /^\.github\/workflows\//i,
  /^(?:scripts\/)?(?:ci-evidence-gate|patch-quality-report|evidenceLib|dagLib|run-dag|bounded-repair-p108|fault-injection-p108)\.mjs$/i,
  /^docs\/(?:verification-manifest|schema-.*)\.json$/i,
  /(?:^|\/)(?:auth|authorization|permissions|security)(?:\/|\.|$)/i,
];
const pathOf = (s) => s.replace(/^[ab]\//, '').replace(/^"|"$/g, '');
export function inspectRepairDiff(diff) {
  const problems = [];
  const lines = String(diff).split(/\r?\n/);
  let file = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('+++ ')) {
      file = pathOf(line.slice(4));
      if (file !== '/dev/null' && PROTECTED.some((p) => p.test(file))) problems.push(`PROTECTED_PATH:${file}`);
    }
    if (/^\+\s*.*(?:timeoutMs|timeout|threshold|minimum|budget|attempts|critical)\s*[:=]\s*\d+/i.test(line) &&
        /^\-\s*.*(?:timeoutMs|timeout|threshold|minimum|budget|attempts|critical)\s*[:=]\s*\d+/i.test(lines[i-1] || '')) {
      const prior = Number((lines[i-1].match(/\d+/g) || []).at(-1));
      const next = Number((line.match(/\d+/g) || []).at(-1));
      if (Number.isFinite(prior) && Number.isFinite(next) && next < prior) problems.push(`LOWERED_LIMIT:${line.trim()}`);
    }
  }
  return [...new Set(problems)];
}
export function boundedAttemptPlan(checkIds, maxAttempts = 2) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) throw new Error('maxAttempts must be an integer from 1 to 3');
  if (!Array.isArray(checkIds) || checkIds.length === 0 || checkIds.some((x) => typeof x !== 'string' || !x.trim())) throw new Error('checkIds must be a non-empty list of ids');
  return Array.from({ length: maxAttempts }, (_, i) => ({ attempt: i + 1, checks: [...new Set(checkIds)] }));
}
export function writeAttemptRecord(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const prior = (() => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { schemaVersion: 1, attempts: [] }; } })();
  prior.attempts.push(record);
  fs.writeFileSync(file, JSON.stringify(prior, null, 2) + '\n');
}
