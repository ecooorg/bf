/**
 * P110 — Intent/Policy Contract foundation.
 * Create, inspect and gate Intent/Policy Contract instances.
 * Rules:
 * - source "assumed" or "inferred" items must never be treated as approved policy.
 * - critical items with source "unknown" or contract status UNKNOWN/PARTIAL block release-style claims.
 * - validation is schema + semantic (no silent promotion).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const KINDS = new Set([
  'requirement',
  'constraint',
  'invariant',
  'assumption',
  'non_goal',
  'acceptance_criterion',
  'authority',
]);

const SOURCES = new Set(['explicit', 'inferred', 'assumed', 'unknown']);

/**
 * Build a minimal valid contract skeleton.
 * @param {object} opts
 * @returns {object}
 */
export function buildContract(opts = {}) {
  const {
    goal = 'Unspecified goal',
    status = 'UNKNOWN',
    items = [],
    changedFiles = [],
    notes = '',
    generatedAt = new Date().toISOString(),
  } = opts;
  return {
    meta: {
      schemaId: 'https://biforge.local/schemas/schema-intent-policy-contract.json',
      schemaVersion: '1.0.0',
      artifactType: 'intent-policy-contract',
      generatedAt,
    },
    goal,
    status,
    items,
    ...(changedFiles.length ? { changedFiles } : {}),
    ...(notes ? { notes } : {}),
  };
}

/**
 * Semantic checks that the JSON Schema cannot express alone.
 * Returns an array of problem strings (empty = ok).
 */
export function semanticProblems(contract) {
  const problems = [];
  if (!contract || typeof contract !== 'object') {
    return ['contract is not an object'];
  }
  if (!Array.isArray(contract.items)) {
    problems.push('items must be an array');
    return problems;
  }
  const ids = new Set();
  for (const [i, item] of contract.items.entries()) {
    if (!item || typeof item !== 'object') {
      problems.push(`items[${i}] is not an object`);
      continue;
    }
    if (!item.id || typeof item.id !== 'string') problems.push(`items[${i}].id missing`);
    else if (ids.has(item.id)) problems.push(`duplicate item id: ${item.id}`);
    else ids.add(item.id);
    if (!KINDS.has(item.kind)) problems.push(`items[${i}] (${item.id}): invalid kind`);
    if (!SOURCES.has(item.source)) problems.push(`items[${i}] (${item.id}): invalid source`);
    if (item.kind === 'assumption' && item.source === 'explicit') {
      // allowed, but caller must not treat it as requirement
    }
    // Silent promotion guard: an item labelled requirement/constraint/invariant
    // with source assumed/inferred is a semantic error for "approved policy".
    if (
      (item.kind === 'requirement' || item.kind === 'constraint' || item.kind === 'invariant') &&
      (item.source === 'assumed' || item.source === 'inferred')
    ) {
      problems.push(
        `items[${i}] (${item.id}): ${item.kind} cannot have source=${item.source}; use assumption or make source explicit`,
      );
    }
  }
  return problems;
}

/**
 * Whether the contract may support a release-style or "approved policy" claim.
 * Fail-closed: UNKNOWN/PARTIAL status, or any critical item with source unknown, blocks.
 */
export function blocksApprovedPolicyClaim(contract) {
  if (!contract) return true;
  if (contract.status === 'UNKNOWN' || contract.status === 'PARTIAL' || contract.status === 'NOT_RUN') {
    return true;
  }
  const items = Array.isArray(contract.items) ? contract.items : [];
  for (const item of items) {
    if (item.criticality === 'critical' && (item.source === 'unknown' || item.source === 'assumed')) {
      return true;
    }
  }
  return semanticProblems(contract).length > 0;
}

/**
 * Run the existing schema validator as a subprocess for a file.
 * Returns { ok: boolean, stdout, stderr, code }.
 */
export function validateFileWithSchema(filePath) {
  const script = path.join(root, 'scripts', 'schemaValidate.mjs');
  const r = spawnSync(
    process.execPath,
    [script, '--type', 'intent-policy-contract', '--file', filePath],
    { encoding: 'utf8', cwd: root },
  );
  return {
    ok: r.status === 0,
    code: r.status,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
  };
}

/**
 * Full gate: schema + semantic + approved-policy rule.
 * @returns {{ ok: boolean, problems: string[], blocksPolicy: boolean }}
 */
export function gateContract(contract) {
  const problems = semanticProblems(contract);
  const blocksPolicy = blocksApprovedPolicyClaim(contract);
  return {
    ok: problems.length === 0,
    problems,
    blocksPolicy,
  };
}
