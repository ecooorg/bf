#!/usr/bin/env node
/** Enforces scripts/ allowlist: no per-patch pNNN tools, no retired one-offs. */
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scriptsDir = join(root, 'scripts');
let failed = false;
const fail = (s) => { console.error(`FAIL: ${s}`); failed = true; };
const ok = (s) => console.log(`PASS: ${s}`);

/** Active scripts only. Add a name here when introducing a maintained tool; do not add patch-scoped one-offs. */
const ALLOW = new Set([
  'acceptanceReport.mjs',
  'api-contract-coverage.mjs',
  'architectureChangeImpact.mjs',
  'architectureCheckBoundaries.mjs',
  'architectureGenerateModuleMap.mjs',
  'architectureLib.mjs',
  'architectureVerifyChange.mjs',
  'assistant-run-summary.mjs',
  'backup-restore-check.mjs',
  'baseline-eval.mjs',
  'capabilityGenerateGraph.mjs',
  'capabilityGraphLib.mjs',
  'carousel-live-smoke.mjs',
  'carousel-ops-probe.mjs',
  'carousel-render-probe.mjs',
  'carousel-search-smoke.mjs',
  'carousel-verify.mjs',
  'check-version.mjs',
  'ci-evidence-gate.mjs',
  'ci-run-history.mjs',
  'ci-summary.mjs',
  'contextSelect.mjs',
  'contextSelectLib.mjs',
  'copy-server-config.mjs',
  'dagLib.mjs',
  'diagnostics-report.mjs',
  'diagnostics-summary.mjs',
  'docs-env-example-check.mjs',
  'docs-integrity.mjs',
  'docs-reference-integrity.mjs',
  'docsCheckInventories.mjs',
  'docsGenerateInventories.mjs',
  'evidence-collect.mjs',
  'evidence-to-markdown.mjs',
  'evidenceLib.mjs',
  'gate-eval.mjs',
  'golden-eval.mjs',
  'golden-tasks.json',
  'lint-copy.mjs',
  'migrate.mjs',
  'monitor-connections.mjs',
  'pack-simple.mjs',
  'patch-pack.mjs',
  'patch-quality-report.mjs',
  'patch-tools.mjs',
  'run-dag.mjs',
  'schemaValidate.mjs',
  'scripts-integrity.mjs',
  'statusGraph.mjs',
  'verify-connections.mjs',
  'version-metadata.mjs',
  'workflow-preflight.mjs',
  'write-build-stamp.mjs',
]);

if (!existsSync(scriptsDir)) {
  fail('scripts/ missing');
} else {
  const names = readdirSync(scriptsDir);
  const nested = names.filter((n) => statSync(join(scriptsDir, n)).isDirectory());
  if (nested.length) fail(`scripts/ must not contain nested folders: ${nested.join(', ')}`);
  const unknown = names.filter((n) => !ALLOW.has(n));
  if (unknown.length) fail(`scripts/ not on allowlist: ${unknown.join(', ')}`);
  const patchLike = names.filter((n) => /^p\d{2,3}/i.test(n) || /-p\d{2,3}/i.test(n) || /p108|p93-7/i.test(n));
  if (patchLike.length) fail(`per-patch script names forbidden: ${patchLike.join(', ')}`);
  if (!unknown.length && !nested.length && !patchLike.length) ok(`scripts/ layout (${names.length} files on allowlist)`);
}

if (failed) {
  console.error('\nscripts:integrity FAILED');
  process.exit(1);
}
console.log('\nscripts:integrity PASS');
