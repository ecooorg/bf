#!/usr/bin/env node
/** Enforces the canonical documentation topology and session-governance contract. */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;
const fail = (s) => { console.error(`FAIL: ${s}`); failed = true; };
const ok = (s) => console.log(`PASS: ${s}`);
const required = [
  ['AGENTS.md', ['Single-source-of-truth map', 'Obligation map', 'Mandatory protocol for the beginning of every session', 'BIO-004', 'prescribe the next session’s task']],
  ['TECHNICAL_SPECIFICATION.md', ['CURRENT NORMATIVE CONTRACT', 'Product success is user value, not test completion', 'Architect has one mode and one completion contract']],
  ['ROADMAP.md', ['CURRENT ROADMAP CONTROL', 'There is no persistent `NEXT_PATCH.md`', 'Current known high-priority product gap (revalidate every session)', 'Roadmap and history rules']],
  ['TECHNICAL_REPORT.md', ['CURRENT EVIDENCE NOTE', 'Evidence boundary']],
  ['CHANGELOG.md', ['Session governance and documentation consolidation']],
  ['README.md', ['mandatory governance, obligation map, session-start protocol', 'There is no persistent next-patch assignment file']],
  ['docs/ARCHITECTURE.md', ['Architect user-flow invariant']],
  ['docs/API_CONTRACTS.md', ['Architect endpoints must implement one flow']],
  ['docs/TESTING_AND_ACCEPTANCE.md', ['Acceptance hierarchy', 'Architect acceptance scenario']],
  ['docs/USER_VALUE_EVALUATION.md', ['Current-documentation clarification', 'OBSERVED, INFERRED, and NOT_RUN']],
  ['docs/SECURITY_AND_PRIVACY.md', ['Authorization boundaries']],
  ['docs/OPERATIONS_AND_RELEASES.md', ['Artifact delivery policy']],
  ['docs/DATA_AND_ARTIFACTS.md', ['Delivery states']],
  ['docs/DECISIONS.md', ['D-2026-10-30-01', 'D-2026-10-30-02', 'D-2026-10-30-03']],
];
for (const [rel, needles] of required) {
  const p = join(root, rel);
  if (!existsSync(p)) { fail(`${rel} missing`); continue; }
  const t = readFileSync(p, 'utf8');
  for (const n of needles) if (!t.includes(n)) fail(`${rel} missing required text: ${n}`);
  if (needles.every(n => t.includes(n))) ok(`${rel} has required current-contract markers`);
}
const spec = readFileSync(join(root, 'TECHNICAL_SPECIFICATION.md'), 'utf8');
for (const phrase of ['exactly three user-facing agents', 'one user-facing agent and one end-to-end workflow', 'a mode switch']) {
  if (!spec.toLowerCase().includes(phrase.toLowerCase())) fail(`TECHNICAL_SPECIFICATION.md missing Architect/product invariant: ${phrase}`);
}
const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
for (const obligation of ['BIO-001','BIO-002','BIO-003','BIO-004','BIO-005','BIO-006','BIO-007','BIO-008','BIO-009']) {
  if (!agents.includes(obligation)) fail(`AGENTS.md obligation map missing ${obligation}`);
}
if (existsSync(join(root, 'NEXT_PATCH.md'))) fail('root NEXT_PATCH.md is retired and must be deleted');
else ok('No persistent NEXT_PATCH.md assignment file');
const retiredDocs = [
  'docs/AI-USER-VALUE-SPEC.md', 'docs/AI-USER-VALUE-REPORT.md',
  'docs/AI-NATIVE-RENOVATION-ROADMAP.md', 'docs/AI-NATIVE-RENOVATION-TASK.md',
  'docs/AI-OPERATING-RULES.md', 'docs/AI-ENVIRONMENT-CONTEXT.md',
  'docs/OPERATIONS.md', 'docs/ARCHIVE-DELIVERY-CANON.md',
  'docs/architecture-guardrails.md', 'docs/DOCUMENTATION-INDEX.md',
  'docs/AI-NATIVE-GLOBAL-AUDIT-2026-10.md', 'docs/AUDIT-2026-10-29.md',
  'docs/P121_Browser_based_Model_Providers.md', 'docs/p119-p121.md',
];
for (const rel of retiredDocs) if (existsSync(join(root, rel))) fail(`${rel} is retired and must be deleted after its current rules are consolidated`);
if (retiredDocs.every(rel => !existsSync(join(root, rel)))) ok('Retired competing prose documents are absent');
// Executable workflow/test code must use the run-evidence artifact name, never the retired task-file name.
for (const rel of ['.github', 'scripts', 'tests']) {
  const dir = join(root, rel);
  if (!existsSync(dir)) continue;
  const walk = (d) => {
    for (const name of requireDir(d)) {
      const full = join(d, name);
      if (isDir(full)) walk(full);
      else if (full !== join(root, 'scripts/docs-integrity.mjs') && /\.(mjs|js|yml|yaml|json)$/.test(name)) {
        const body = readFileSync(full, 'utf8');
        if (/NEXT_PATCH\.md|BIForge-NEXT-PATCH/i.test(body)) fail(`${full.slice(root.length + 1)} still references retired next-patch artifact naming`);
      }
    }
  };
  walk(dir);
}
if (failed) { console.error('\ndocs:integrity FAILED'); process.exit(1); }
console.log('\ndocs:integrity PASS');
function requireDir(d) { return readdirSync(d); }
function isDir(p) { return statSync(p).isDirectory(); }
