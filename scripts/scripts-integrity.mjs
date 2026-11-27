#!/usr/bin/env node
/** Enforces scripts/ allowlist: no per-patch pNNN tools, no retired one-offs. */
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scriptsDir = join(root, 'scripts');

function ok(msg) { console.log('OK', msg); }
function fail(msg) { console.error('FAIL', msg); process.exit(1); }

const ALLOW = new Set([
  'acceptanceReport.mjs', 'api-contract-coverage.mjs', 'architectureChangeImpact.mjs',
  'architectureCheckBoundaries.mjs', 'architectureGenerateModuleMap.mjs', 'architectureLib.mjs',
  'architectureVerifyChange.mjs', 'archive-immofinder-diagnostics.mjs', 'assistant-run-summary.mjs',
  'backup-restore-check.mjs', 'baseline-eval.mjs', 'capabilityGenerateGraph.mjs', 'capabilityGraphLib.mjs',
  'carousel-live-smoke.mjs', 'carousel-ops-probe.mjs', 'carousel-render-probe.mjs', 'carousel-search-smoke.mjs',
  'carousel-verify.mjs', 'check-version.mjs', 'ci-evidence-gate.mjs', 'ci-run-history.mjs', 'ci-summary.mjs',
  'collect-platform-logs.mjs', 'contextSelect.mjs', 'contextSelectLib.mjs', 'copy-server-config.mjs',
  'dagLib.mjs', 'diagnostics-report.mjs', 'diagnostics-summary.mjs', 'docs-env-example-check.mjs',
  'docs-integrity.mjs', 'docs-reference-integrity.mjs', 'docsCheckInventories.mjs', 'docsGenerateInventories.mjs',
  'evidence-collect.mjs', 'evidence-to-markdown.mjs', 'evidenceLib.mjs',
  'fix-agents-contract.mjs', 'fix-ci-scripts.mjs', 'gate-eval.mjs', 'golden-eval.mjs', 'golden-tasks.json',
  'immofinder-health-check.mjs', 'immofinder-recheck-feed.mjs', 'immogr-local-page-fetch.mjs', 'immogr-local-probe-batch.mjs',
  'immofinder-p0-feed-hygiene.mjs', 'immofinder-p1-rooms-hygiene.mjs', 'immofinder-verify-hygiene.mjs',
  'immofinder-p2-junk-hosts.mjs', 'immofinder-p3-version.mjs', 
  'immofinder-source-pilot.mjs',
  'restore-verify-test.mjs',
  'lint-copy.mjs', 'migrate.mjs', 'monitor-connections.mjs', 'pack-simple.mjs', 'patch-pack.mjs',
  'patch-quality-report.mjs', 'patch-tools.mjs', 'project-user-value-eval.mjs', 'project-user-value-live.mjs',
  'run-dag.mjs', 'schemaValidate.mjs', 'scripts-integrity.mjs', 'statusGraph.mjs', 'verify-connections.mjs',
  'version-metadata.mjs', 'workflow-preflight.mjs', 'write-build-stamp.mjs',
]);

const names = readdirSync(scriptsDir).filter((n) => {
  try { return statSync(join(scriptsDir, n)).isFile(); } catch { return false; }
});
const unknown = names.filter((n) => !ALLOW.has(n));
if (unknown.length) fail(`scripts/ not on allowlist: ${unknown.join(', ')}`);
if (!unknown.length) ok(`scripts/ layout (${names.length} files on allowlist)`);
