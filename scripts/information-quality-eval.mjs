#!/usr/bin/env node
/**
 * Deterministic companion to docs/ARCHITECTURE.md (Information quality workflow summary).
 * Input: JSON array or JSONL of scenario records. Factual truth still requires blind review;
 * this runner enforces evidence/provenance contracts and aggregates human rubric scores.
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const DIMENSIONS = ['factualCorrectness', 'evidenceProvenance', 'relevanceCompleteness', 'calibration', 'reasoningIntegrity', 'continuity', 'usability'];
const HARD_FLAGS = ['fabricatedCitation', 'fabricatedLiveMeasurement', 'wrongEntity', 'materialEvidenceContradiction', 'artifactLoadFailed', 'coreUserPathFailed', 'runtimeClaimWithoutEvidence'];

function parseInput(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) return JSON.parse(trimmed);
  return trimmed.split(/\r?\n/).filter(Boolean).map((line, i) => {
    try { return JSON.parse(line); } catch (e) { throw new Error(`Invalid JSONL at line ${i + 1}: ${e.message}`); }
  });
}
function hasText(haystack, needle) {
  return String(haystack || '').toLocaleLowerCase().includes(String(needle || '').toLocaleLowerCase());
}
export function evaluate(record) {
  const errors = [];
  const mode = String(record.mode || '').toLowerCase();
  if (!['simple', 'expert', 'architect'].includes(mode)) errors.push('invalid_mode');
  const reply = String(record.reply || '');
  if (!reply.trim()) errors.push('empty_reply');
  for (const claim of record.mustInclude || []) if (!hasText(reply, claim)) errors.push(`missing_expected_claim:${claim}`);
  for (const claim of record.mustNotInclude || []) if (hasText(reply, claim)) errors.push(`forbidden_claim_present:${claim}`);

  const sourceIds = new Set((record.currentSources || []).map((s) => String(s.url || s.id || '')));
  for (const source of record.shownSources || []) {
    const id = String(source.url || source.id || '');
    if (!sourceIds.has(id)) errors.push(`source_not_from_current_turn:${id}`);
  }
  if (record.currentFactExpected && record.searchStatus !== 'used' && !record.replyMarksUnverified) errors.push('current_fact_without_grounding_or_disclosure');

  if (mode === 'architect') {
    if (record.artifactOutcome !== 'SUCCESS') errors.push(`architect_not_success:${record.artifactOutcome || 'missing'}`);
    if (record.staticChecksPassed !== true) errors.push('architect_static_checks_not_passed');
    if (record.runtimeChecksPassed !== true) errors.push('architect_runtime_checks_not_passed');
    if (record.importContractsPassed !== true) errors.push('architect_import_contracts_not_passed');
    if (record.noFabricatedFallbacks !== true) errors.push('architect_fallback_policy_not_confirmed');
  }
  const hardFailures = HARD_FLAGS.filter((flag) => record[flag] === true);
  const scores = {};
  for (const dim of DIMENSIONS) {
    const value = record.scores?.[dim];
    if (Number.isInteger(value) && value >= 0 && value <= 4) scores[dim] = value;
    else errors.push(`missing_or_invalid_score:${dim}`);
  }
  const scoreValues = Object.values(scores);
  const average = scoreValues.length === DIMENSIONS.length ? scoreValues.reduce((a, b) => a + b, 0) / DIMENSIONS.length : 0;
  const passed = errors.length === 0 && hardFailures.length === 0 && average >= 3.4 && Math.min(...scoreValues) >= 3;
  return { scenarioId: record.scenarioId || 'unnamed', mode, passed, average: Number(average.toFixed(2)), scores, errors, hardFailures };
}

function main() {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const input = get('--input');
  const output = get('--out');
  if (!input) {
    console.error('Usage: node scripts/information-quality-eval.mjs --input <JSON-or-JSONL> [--out report.json]');
    process.exitCode = 2;
    return;
  }
  const records = parseInput(fs.readFileSync(input, 'utf8'));
  const results = records.map(evaluate);
  const byMode = Object.fromEntries(['simple', 'expert', 'architect'].map((mode) => {
    const rows = results.filter((r) => r.mode === mode);
    return [mode, {
      scenarios: rows.length,
      passed: rows.filter((r) => r.passed).length,
      failed: rows.filter((r) => !r.passed).length,
      averageScore: rows.length ? Number((rows.reduce((sum, r) => sum + r.average, 0) / rows.length).toFixed(2)) : null,
      hardGateFailures: rows.reduce((sum, r) => sum + r.hardFailures.length, 0),
    }];
  }));
  const report = { generatedAt: new Date().toISOString(), scenarios: results.length, passed: results.filter((r) => r.passed).length, failed: results.filter((r) => !r.passed).length, byMode, results };
  const json = JSON.stringify(report, null, 2) + '\n';
  if (output) fs.writeFileSync(output, json);
  process.stdout.write(json);
  if (report.failed) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
