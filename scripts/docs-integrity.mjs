#!/usr/bin/env node
/**
 * docs-integrity.mjs — current user-value documentation guard
 *
 * Verifies the three protected primary documents exist, contain required
 * sections, and that the count of REQ-IDs / critical headings has not
 * decreased below the baseline established by this patch.
 *
 * Exit 0 = PASS, non-zero = FAIL.
 * Intended to be wired into the verification DAG as node `docs:integrity`.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const PROTECTED = [
  {
    file: 'TECHNICAL_SPECIFICATION.md',
    requiredHeadings: [
      '## 1. System Overview and Architecture',
      '## 3. Data Model and Persistence',
      '## 4. API Contracts',
      '## 6. Three User Agents',
      '## 10. Testing Requirements and Acceptance Criteria',
    ],
    minReqIds: 10, // baseline; raise only, never lower without Navigator
  },
  {
    file: 'ROADMAP.md',
    requiredHeadings: [
      '## Phase 0 — Empty Repository Bootstrap',
      '## Phase 5 — Complex Software Architect Agent',
      '## Phase 6 — Product contract reconciliation',
      '## Phase 7 — Implement the single Architect workflow',
      '## Phase 9 — Final user-value release gate',
      '## Global Rules for Every Stage',
    ],
    minReqIds: 0,
  },
  {
    file: 'TECHNICAL_REPORT.md',
    requiredHeadings: [
      '## 1. Early Foundation Snapshots',
      '## 6. Complex Software Architect Agent',
      '## Current product-value assessment (authoritative current section)',
      '## 8. Summary of Confidence by Historical Archive Phase (not current product acceptance)',
      '## 9. Remaining Open Items',
    ],
    minReqIds: 0,
  },
];

let failed = false;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`PASS: ${msg}`);
}

for (const p of PROTECTED) {
  const path = join(root, p.file);
  if (!existsSync(path)) {
    fail(`${p.file} is missing`);
    continue;
  }
  const text = readFileSync(path, 'utf8');
  for (const h of p.requiredHeadings) {
    if (!text.includes(h)) {
      fail(`${p.file} missing required heading: ${h}`);
    }
  }
  if (p.minReqIds > 0) {
    const matches = text.match(/\*\*REQ-[A-Z]+-\d+\*\*/g) || [];
    const count = matches.length;
    if (count < p.minReqIds) {
      fail(`${p.file} REQ-ID count ${count} < baseline ${p.minReqIds}`);
    } else {
      ok(`${p.file} REQ-ID count ${count} (>= ${p.minReqIds})`);
    }
  } else {
    ok(`${p.file} exists and contains required headings`);
  }
}

// Extra: DOCUMENTATION-INDEX must mention the three protected files
const indexPath = join(root, 'docs', 'DOCUMENTATION-INDEX.md');
if (existsSync(indexPath)) {
  const idx = readFileSync(indexPath, 'utf8');
  for (const name of ['TECHNICAL_SPECIFICATION.md', 'ROADMAP.md', 'TECHNICAL_REPORT.md']) {
    if (!idx.includes(name)) {
      fail(`docs/DOCUMENTATION-INDEX.md does not reference ${name}`);
    }
  }
  ok('docs/DOCUMENTATION-INDEX.md references protected documents');
} else {
  fail('docs/DOCUMENTATION-INDEX.md is missing');
}

// AGENTS.md must contain D1–D4
const agentsPath = join(root, 'AGENTS.md');
if (existsSync(agentsPath)) {
  const agents = readFileSync(agentsPath, 'utf8');
  for (const d of ['**D1**', '**D2**', '**D3**', '**D4**']) {
    if (!agents.includes(d)) {
      fail(`AGENTS.md missing ${d}`);
    }
  }
  ok('AGENTS.md contains D1–D4');
} else {
  fail('AGENTS.md is missing');
}

if (failed) {
  console.error('\ndocs:integrity FAILED');
  process.exit(1);
}
console.log('\ndocs:integrity PASS');
process.exit(0);
