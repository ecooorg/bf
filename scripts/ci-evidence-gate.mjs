// P106: fail-closed CI evidence gate. Runs after patch-quality-report, before packaging.
// Exit 1 when the handoff is missing or unverified, its structured part is absent/invalid, or any evidence record violates its schema.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateArtifact } from './schemaValidate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.env.CI_LOGS_DIR || 'artifacts/ci-checks');
const problems = [];
let report = '';
try { report = fs.readFileSync(path.join(dir, 'NEXT_PATCH.md'), 'utf8'); } catch { problems.push('NEXT_PATCH.md is missing'); }
if (report) {
  if (/^PATCH_STATUS=UNVERIFIED$/m.test(report)) problems.push('PATCH_STATUS=UNVERIFIED (evidence missing, malformed or contradictory, or a check is BLOCKED, SKIPPED_BY_POLICY, NOT_RUN or UNKNOWN)');
  const line = report.match(/^HANDOFF_JSON=(.*)$/m);
  if (!line) problems.push('HANDOFF_JSON line is absent');
  else {
    try {
      const verdict = validateArtifact(JSON.parse(line[1]), 'handoff-report');
      if (!verdict.ok) problems.push(`HANDOFF_JSON violates the schema: ${verdict.errors.slice(0, 2).join(' | ')}`);
    } catch { problems.push(`HANDOFF_JSON is not usable: ${line[1].slice(0, 80)}`); }
  }
}
let names = [];
try { names = fs.readdirSync(dir).filter((n) => /^evidence-.*\.json$/.test(n)); } catch {}
for (const name of names) {
  try {
    const verdict = validateArtifact(JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')), 'evidence-record');
    if (!verdict.ok) problems.push(`${name} violates the schema: ${verdict.errors.slice(0, 2).join(' | ')}`);
  } catch { problems.push(`${name} is not valid JSON`); }
}
if (problems.length) {
  console.error(`CI evidence gate FAILED (${problems.length}):\n${problems.map((p) => `- ${p}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`CI evidence gate OK (${names.length} evidence record(s), structured handoff valid).`);
}
