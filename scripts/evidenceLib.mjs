// P105: evidence records with mandatory provenance + fail-closed assessment + handoff report builder.
// Library only; used by the CI runners (write), patch-quality-report (assess) and ci-summary (fallback).
import fs from 'node:fs';
import path from 'node:path';
import { validateArtifact } from './schemaValidate.mjs';

export const SCHEMA_VERSION = '1.0.0';
const SCHEMA_BASE = 'https://biforge.local/schemas/schema-';
// Worst first. Anything that is not PASS stays non-PASS.
const SEVERITY = ['FAIL', 'TIMEOUT', 'BLOCKED', 'UNKNOWN', 'NOT_RUN', 'PARTIAL', 'SKIPPED_BY_POLICY', 'PASS'];

export const worstStatus = (list) => {
  const present = (Array.isArray(list) ? list : []).filter((s) => SEVERITY.includes(s));
  if (!present.length) return 'UNKNOWN';
  return SEVERITY.find((s) => present.includes(s));
};

/** Runner row status -> schema status. A skipped-because-blocked row is BLOCKED, never PASS. */
export function mapLegacyStatus(status) {
  switch (String(status || '').toUpperCase()) {
    case 'PASS': return 'PASS';
    case 'FAIL': return 'FAIL';
    case 'TIMEOUT': return 'TIMEOUT';
    case 'SKIPPED': case 'BLOCKED': return 'BLOCKED';
    case 'NOT_RUN': return 'NOT_RUN';
    case 'PARTIAL': return 'PARTIAL';
    case 'SKIPPED_BY_POLICY': return 'SKIPPED_BY_POLICY';
    default: return 'UNKNOWN';
  }
}

export const redactText = (value) => String(value ?? '')
  .replace(/\u001b\[[0-9;]*m/g, '').replace(/\r/g, '')
  .replace(/(GEMINI_API_KEY|GOOGLE_API_KEY|GROQ_API_KEY|OPENAI_API_KEY|API_KEY|SESSION_SECRET|APP_PASSWORD|DATABASE_URL)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
  .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
  .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[REDACTED_GOOGLE_KEY]')
  .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, '[REDACTED_API_KEY]');

const meta = (artifactType, now) => ({
  schemaId: `${SCHEMA_BASE}${artifactType}.json`, schemaVersion: SCHEMA_VERSION, artifactType, generatedAt: now,
});

/**
 * Build one Evidence Record from runner rows.
 * row: { id, status, command?, startedAt?, finishedAt?, log?, note?, critical? }
 * ctx: { revision, environment, now? }
 */
export function makeEvidenceRecord(rows, ctx = {}) {
  const now = ctx.now || new Date().toISOString();
  const revision = String(ctx.revision || process.env.GITHUB_SHA || 'UNKNOWN');
  const environment = String(ctx.environment || (process.env.GITHUB_ACTIONS ? 'github-actions' : 'local'));
  const items = (Array.isArray(rows) ? rows : []).map((row) => {
    const status = mapLegacyStatus(row.status);
    const provenance = {
      revision,
      commandOrObservation: redactText(row.command || row.script || row.id).slice(0, 600) || String(row.id),
      environment,
      timestamp: String(row.finishedAt || row.startedAt || now),
      status,
      completenessLimits: 'Proves only that this command ended with the recorded status in this environment; it does not prove production behaviour.',
    };
    if (row.log) provenance.logRef = path.basename(String(row.log));
    if (row.note) provenance.redactionNotes = redactText(row.note).slice(0, 300);
    return { id: String(row.id), claim: `Check ${row.id} ended with status ${status}`, provenance, critical: row.critical === true };
  });
  if (!items.length) {
    items.push({
      id: 'no-checks-recorded', claim: 'No check was recorded by this runner',
      provenance: { revision, commandOrObservation: 'runner produced no rows', environment, timestamp: now, status: 'NOT_RUN', completenessLimits: 'Nothing was verified.' },
      critical: false,
    });
  }
  return { meta: meta('evidence-record', now), status: worstStatus(items.map((i) => i.provenance.status)), items };
}

export function writeEvidenceRecord(dir, fileName, record) {
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, path.basename(fileName));
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(record, null, 2) + '\n');
  fs.renameSync(tmp, target);
  return target;
}

const addRecordName = (doc, name) => {
  const names = Array.isArray(doc?.evidence?.records) ? doc.evidence.records : [];
  return { schemaVersion: 1, records: [...new Set([...names, name])] };
};
export { addRecordName };

/**
 * Fail-closed assessment of the evidence set of a CI run.
 * Enforced only for runs whose results.json advertises records (written by P105+ runners);
 * older results are reported as 'minimal' and are not penalised.
 */
export function assessEvidence(dir, resultsDoc) {
  const advertised = resultsDoc?.evidence?.records;
  const rows = Array.isArray(resultsDoc?.results) ? resultsDoc.results : [];
  const out = { required: false, completeness: 'minimal', problems: [], records: [], refs: [], evidenceOk: true };
  if (!Array.isArray(advertised)) return out;
  out.required = true;
  const problem = (code, detail) => out.problems.push({ severity: 'critical', code, detail: redactText(detail).slice(0, 300) });
  const covered = new Set();
  let valid = 0;
  for (const raw of advertised) {
    const name = path.basename(String(raw));
    out.refs.push(name);
    let text;
    try { text = fs.readFileSync(path.join(dir, name), 'utf8'); } catch { problem('MISSING_RECORD', `${name} is advertised by results.json but absent`); continue; }
    let record;
    try { record = JSON.parse(text); } catch { problem('MALFORMED_RECORD', `${name} is not valid JSON`); continue; }
    let verdict;
    try { verdict = validateArtifact(record, 'evidence-record'); } catch (e) { problem('INVALID_RECORD', `${name}: validator failed: ${e.message}`); continue; }
    if (!verdict.ok) { problem('INVALID_RECORD', `${name}: ${verdict.errors.slice(0, 3).join(' | ')}`); continue; }
    let recordOk = true;
    for (const item of record.items) {
      covered.add(item.id);
      const p = item.provenance;
      const row = rows.find((r) => r.id === item.id);
      if (row && mapLegacyStatus(row.status) !== p.status) {
        problem('CONTRADICTION', `${item.id}: record says ${p.status} but results.json says ${row.status}`); recordOk = false;
      }
      if (Number.isNaN(Date.parse(p.timestamp))) { problem('INVALID_TIMESTAMP', `${item.id}: unparseable timestamp`); recordOk = false; }
      if (!String(p.revision || '').trim()) { problem('MISSING_REVISION', `${item.id}: empty revision`); recordOk = false; }
      if (p.status === 'PASS' && item.critical === true) {
        const log = p.logRef ? path.basename(p.logRef) : '';
        if (!log || !fs.existsSync(path.join(dir, log))) { problem('MISSING_LOG', `${item.id}: critical PASS without an existing log`); recordOk = false; }
      }
    }
    if (recordOk) valid += 1;
    out.records.push({ file: name, status: record.status, items: record.items.length });
  }
  for (const row of rows) {
    if (row && row.id && !covered.has(row.id)) problem('MISSING_ITEM', `${row.id}: result row has no evidence item`);
  }
  out.evidenceOk = out.problems.length === 0;
  out.completeness = out.evidenceOk ? 'complete' : valid > 0 ? 'partial' : 'unavailable';
  return out;
}

const HANDOFF_STATUS = { PASSED: 'PASS', FAILED: 'FAIL', CANCELLED: 'PARTIAL', UNVERIFIED: 'UNKNOWN' };

export function buildHandoffReport({ patchStatus, summary, evidence, failedStages, blockedStages, nextAction, limitations, now }) {
  const stamp = now || new Date().toISOString();
  const report = {
    meta: meta('handoff-report', stamp),
    status: HANDOFF_STATUS[patchStatus] || 'UNKNOWN',
    summary: redactText(summary || 'No summary available.').slice(0, 600) || 'No summary available.',
    evidenceCompleteness: evidence?.completeness || 'unavailable',
    failedStages: (failedStages || []).map(String),
    notRunStages: [],
    blockedStages: (blockedStages || []).map(String),
    evidenceRefs: (evidence?.refs || []).map(String),
    nextAction: redactText(nextAction || '').slice(0, 600),
    limitations: redactText(limitations || '').slice(0, 600),
    secretsRedacted: true,
  };
  return report;
}

/** Minimal handoff used when the generator itself produced nothing. Always schema-valid. */
export function buildFallbackHandoff(ciStatus) {
  return buildHandoffReport({
    patchStatus: 'UNVERIFIED',
    summary: `Report generator produced no evidence (CI status: ${ciStatus || 'unknown'}).`,
    evidence: { completeness: 'unavailable', refs: [] },
    failedStages: [],
    blockedStages: [],
    nextAction: 'Inspect workflow and report-generator logs; do not infer a product-code root cause.',
    limitations: 'Fallback handoff: no stage results were available.',
  });
}

export function validateHandoffReport(report) { return validateArtifact(report, 'handoff-report'); }
