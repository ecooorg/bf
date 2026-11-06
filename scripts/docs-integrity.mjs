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
  ['AGENTS.md', ['Single-source-of-truth map', 'Obligation map', 'Mandatory protocol for the beginning of every session', 'BIO-004', 'prescribe the next session’s task', 'Documentation layout (binding)']],
  ['TECHNICAL_SPECIFICATION.md', ['CURRENT NORMATIVE CONTRACT', 'Product success is user value, not test completion', 'Architect has one mode and one completion contract']],
  ['ROADMAP.md', ['CURRENT ROADMAP CONTROL', 'There is no persistent `NEXT_PATCH.md`', 'Current known high-priority product gap (revalidate every session)', 'Roadmap and history rules']],
  ['TECHNICAL_REPORT.md', ['CURRENT EVIDENCE NOTE', 'Evidence boundary']],
  ['CHANGELOG.md', ['Session governance and documentation consolidation']],
  ['README.md', ['AGENTS.md', 'mandatory governance, obligation map, session-start protocol']],
  ['docs/ARCHITECTURE.md', ['Architect user-flow invariant', 'Information quality workflow']],
  ['docs/API_CONTRACTS.md', ['Architect endpoints must implement one flow']],
  ['docs/TESTING_AND_ACCEPTANCE.md', ['Acceptance hierarchy', 'Architect acceptance scenario']],
  ['docs/USER_VALUE_EVALUATION.md', ['Current-documentation clarification', 'OBSERVED, INFERRED, and NOT_RUN']],
  ['docs/SECURITY_AND_PRIVACY.md', ['Authorization boundaries']],
  ['docs/OPERATIONS_AND_RELEASES.md', ['Artifact delivery policy', 'Render environment contract']],
  ['docs/DATA_AND_ARTIFACTS.md', ['Delivery states']],
  ['docs/DECISIONS.md', ['D-2026-10-30-01', 'D-2026-10-30-02', 'D-2026-10-30-03']],
  ['docs/TEST_MAP.md', ['agents-contract', 'providers-models']],
  ['docs/MODEL_REGISTRY.md', ['Gemini free-key allowlist', 'gemini-3.5-flash-lite']],
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
  'docs/INFORMATION_QUALITY_WORKFLOW.md', 'docs/RENDER_ENV_CONTRACT.md',
  'docs/MODEL_ALLOWLIST.md', 'docs/MODEL_SOURCES_CATALOG.md', 'docs/MODEL_SOURCES_INVENTORY.md',
  'docs/C123_MODEL_CAROUSEL.md', 'docs/C123_OPS.md',
  'docs/C124_INSTRUCTION_INVENTORY.md', 'docs/C124_INSTRUCTION_OPTIMIZATION.md',
  'docs/C125_ANSWER_QUALITY_PROGRAMME.md', 'docs/C125_WP3_WORKFLOW_AUDIT.md',
  'docs/C126_USER_LEVEL_VALIDATION.md',
  'docs/USER_VALUE_EXPERT_C122.md',
  'docs/WEB_SEARCH_REMEDIATION.md', 'docs/biforge-web-search-analysis.md',
  'docs/BIFORGE_DIAGNOSTIC_REPORT_124.32.md', 'docs/BiForge-AUDIT-REPORT-P124-9.md',
];
for (const rel of retiredDocs) if (existsSync(join(root, rel))) fail(`${rel} is retired and must be deleted after its current rules are consolidated`);
if (retiredDocs.every(rel => !existsSync(join(root, rel)))) ok('Retired competing prose documents are absent');

// docs/ root may contain only allowlisted prose + machine JSON
const docsDir = join(root, 'docs');
if (existsSync(docsDir)) {
  const allowProse = new Set([
    'ARCHITECTURE.md', 'API_CONTRACTS.md', 'TESTING_AND_ACCEPTANCE.md',
    'USER_VALUE_EVALUATION.md', 'SECURITY_AND_PRIVACY.md', 'OPERATIONS_AND_RELEASES.md',
    'DATA_AND_ARTIFACTS.md', 'DECISIONS.md', 'TEST_MAP.md', 'MODEL_REGISTRY.md', 'VIX-CONCEPT.md', 'EXPERIMENTS.md', 'BIFORGE Perestroika.md',
  ]);
  const allowJsonPrefixes = ['generated-', 'schema-', 'architecture-', 'verification-manifest', 'p120-acceptance-record'];
  for (const name of readdirSync(docsDir)) {
    const full = join(docsDir, name);
    if (isDir(full)) { fail(`docs/ must not contain nested folders: ${name}`); continue; }
    if (name.endsWith('.md')) {
      if (!allowProse.has(name)) fail(`docs/ prose not on allowlist: ${name}`);
    } else if (name.endsWith('.json')) {
      if (!allowJsonPrefixes.some(p => name.startsWith(p) || name === 'verification-manifest.json' || name === 'p120-acceptance-record.json')) {
        // allow known architecture-*.json
        if (!name.startsWith('architecture-')) fail(`docs/ unexpected json: ${name}`);
      }
    } else {
      fail(`docs/ unexpected file type: ${name}`);
    }
  }
  ok('docs/ layout matches prose allowlist + machine JSON');
}

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
