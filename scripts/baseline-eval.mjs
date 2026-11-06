#!/usr/bin/env node
/**
 * P127.1 baseline-eval harness (EXPERIMENT). Pure functions exported for tests.
 * Modes: --dry-run | --smoke | full | --score <labels.json>
 * Configs A/B/C/D/N per docs/BIFORGE Perestroika.md §7.1.
 * Live product calls and live Gemini are NOT_RUN in this delivery.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── pure: schema ────────────────────────────────────────────────────────────
const CATEGORIES = new Set(['statistic', 'current', 'lookup', 'ambiguous', 'multiturn', 'chat', 'explicit_meta']);
const BURNED = /\b(larch|graubünden|graubunden|switzerland.*larch|larch.*switzerland)\b/i;

export function validateQuestionSet(doc) {
  const errors = [];
  if (!doc || typeof doc !== 'object') return ['root must be object'];
  if (!Array.isArray(doc.questions)) return ['questions must be array'];
  const ids = new Set();
  for (const q of doc.questions) {
    if (!q.id || typeof q.id !== 'string') { errors.push('missing id'); continue; }
    if (ids.has(q.id)) errors.push(`duplicate id ${q.id}`);
    ids.add(q.id);
    if (!CATEGORIES.has(q.category)) errors.push(`${q.id}: bad category`);
    if (!Array.isArray(q.turns) || q.turns.length === 0) errors.push(`${q.id}: turns required`);
    if (q.reference != null) {
      const r = q.reference;
      if (!r.sourceUrl || !r.retrievedOn || !r.asOf) errors.push(`${q.id}: reference needs sourceUrl, retrievedOn, asOf`);
      if (q.volatile && r.value != null && typeof r.value === 'number' && !r.criteria) {
        /* volatile with fixed value is discouraged but not hard-fail if dates present */
      }
    }
    if (q.category === 'ambiguous' && (!Array.isArray(q.acceptableBehaviours) || q.acceptableBehaviours.length === 0)) {
      errors.push(`${q.id}: ambiguous needs acceptableBehaviours`);
    }
    const text = JSON.stringify(q);
    if (BURNED.test(text)) errors.push(`${q.id}: burned-question terms`);
  }
  return errors;
}

export function questionSetHash(doc) {
  const canonical = JSON.stringify(doc.questions.map(q => ({ id: q.id, turns: q.turns, category: q.category })));
  return crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

// ── pure: numeric equivalence / scoring helpers ─────────────────────────────
export function normalizeNumber(s) {
  if (s == null) return null;
  let t = String(s).trim().replace(/\s/g, '').replace(/'/g, '');
  // decimal comma → point when European style (e.g. 8 962 300 or 1,7)
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d+,\d+$/.test(t)) t = t.replace(',', '.');
  else t = t.replace(/,/g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function numbersMatch(a, b, { relTol = 0.02, absTol = 0.5 } = {}) {
  const na = typeof a === 'number' ? a : normalizeNumber(a);
  const nb = typeof b === 'number' ? b : normalizeNumber(b);
  if (na == null || nb == null) return false;
  const diff = Math.abs(na - nb);
  if (diff <= absTol) return true;
  const scale = Math.max(Math.abs(na), Math.abs(nb), 1);
  return diff / scale <= relTol;
}

export function detectAbstention(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase();
  const patterns = [
    /i (do not|don't|cannot|can't) (know|verify|confirm|find)/i,
    /не могу (найти|подтвердить|сказать|проверить)/i,
    /неизвестно|нет данных|не располагаю/i,
    /ich (weiss|weiß) (es )?nicht|kann (es )?nicht (bestätigen|finden)/i,
    /je ne (sais|peux) pas|aucune (donnée|information)/i,
    /clarif(y|ication)|уточн(ите|ение)|welche (genau|region)/i,
    /could you (clarify|specify)|please specify/i,
  ];
  return patterns.some(p => p.test(text));
}

export function provisionalLabel(answerText, question, sources = []) {
  if (!answerText) return 'I';
  const ref = question.reference;
  if (!ref) {
    if (question.category === 'chat') return detectAbstention(answerText) ? 'A' : 'G';
    if (question.category === 'ambiguous') {
      if (detectAbstention(answerText)) return 'A';
      return 'N';
    }
    return 'N';
  }
  const hasSource = Array.isArray(sources) && sources.length > 0;
  const numInAnswer = extractNumbers(answerText);
  const target = ref.value;
  if (typeof target === 'number' && numInAnswer.some(n => numbersMatch(n, target))) {
    return hasSource ? 'G' : 'W';
  }
  if (typeof target === 'string' && answerText.includes(String(target).slice(0, 10))) {
    return hasSource ? 'G' : 'W';
  }
  if (detectAbstention(answerText)) return 'A';
  if (numInAnswer.length && !hasSource) return 'W';
  return 'N';
}

function extractNumbers(text) {
  const out = [];
  const re = /[\d][\d\s.,']*(?:\d)/g;
  let m;
  while ((m = re.exec(text))) {
    const n = normalizeNumber(m[0]);
    if (n != null) out.push(n);
  }
  return out;
}

// ── pure: intervals (Wilson score interval upper bound for zero errors) ─────
export function wilsonUpper(errors, n, z = 1.96) {
  if (n <= 0) return null;
  const p = errors / n;
  const denom = 1 + z * z / n;
  const centre = p + z * z / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n);
  return (centre + margin) / denom;
}

export function rateWithInterval(count, n) {
  if (n <= 0) return { rate: null, lower: null, upper: null, n: 0 };
  const rate = count / n;
  const upper = wilsonUpper(count, n);
  const lower = 1 - wilsonUpper(n - count, n); // approx
  return { rate, lower: Math.max(0, lower), upper: Math.min(1, upper), n, count };
}

// ── pure: blinding ──────────────────────────────────────────────────────────
export function blindAnswers(records, seed = 42) {
  // records: [{ configId, questionId, answer, sources }]
  // returns { blinded: [{ questionId, slots: [{ label: 'X1', answer, sources }] }], mapping: { X1: configId, ... } }
  const byQ = new Map();
  for (const r of records) {
    if (!byQ.has(r.questionId)) byQ.set(r.questionId, []);
    byQ.get(r.questionId).push(r);
  }
  let s = seed;
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const mapping = {};
  const blinded = [];
  for (const [qid, arr] of byQ) {
    const shuffled = [...arr].sort(() => rand() - 0.5);
    const slots = shuffled.map((r, i) => {
      const label = `X${i + 1}`;
      mapping[`${qid}:${label}`] = r.configId;
      return { label, answer: r.answer, sources: r.sources || [] };
    });
    blinded.push({ questionId: qid, slots });
  }
  return { blinded, mapping };
}

export function unblind(mapping, questionId, label) {
  return mapping[`${questionId}:${label}`] || null;
}

// ── report skeleton ─────────────────────────────────────────────────────────
export function buildReportSkeleton({ commit, setHash, modelIds, slotCount, runtimeSnapshot, configs, notRun }) {
  return {
    runId: `dry-${Date.now()}`,
    commit: commit || 'NOT_RUN',
    version: '127',
    patch: '127.1',
    questionSetVersion: 'dev-1',
    questionSetHash: setHash,
    runtimeSnapshot: runtimeSnapshot || { note: 'NOT_RUN' },
    modelIds: modelIds || {},
    slotCount: slotCount ?? 0,
    configurations: configs || ['A', 'B', 'C', 'D', 'N'],
    records: [],
    aggregates: {},
    notRun: notRun || ['live_product_A', 'live_product_B', 'live_gemini_C', 'live_gemini_D', 'live_negative_N'],
    canary: null,
    holdoutAggregate: null,
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function loadQuestions() {
  const p = path.join(ROOT, 'config', 'eval-questions.json');
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  const errs = validateQuestionSet(doc);
  if (errs.length) {
    console.error('Schema errors:', errs);
    process.exit(1);
  }
  return doc;
}

function writeReports(report, summaryMd) {
  const outDir = path.join(ROOT, 'artifacts');
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'eval-report.json');
  const mdPath = path.join(outDir, 'eval-summary.md');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, summaryMd);
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
}

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry-run') || args.includes('--smoke') || args.length === 0;
  const scoreIdx = args.indexOf('--score');
  if (scoreIdx >= 0) {
    console.log('Offline scoring mode: NOT implemented fully in P127.1 skeleton; use pure functions.');
    process.exit(0);
  }

  const doc = loadQuestions();
  const hash = questionSetHash(doc);
  console.log(`Questions: ${doc.questions.length}, hash=${hash}`);

  const report = buildReportSkeleton({
    commit: process.env.GITHUB_SHA || 'local',
    setHash: hash,
    modelIds: { primary: 'from-config/model-sources.json', note: 'NOT_RUN live' },
    slotCount: 0,
    runtimeSnapshot: { harness: 'dry-run', flags: 'NOT_RUN' },
    notRun: [
      'live_product_A (Simple)',
      'live_product_B (Expert)',
      'live_gemini_C (same model + googleSearch)',
      'live_gemini_D (strongest model)',
      'live_negative_N (ENABLE_WEB_SEARCH=false)',
      'production /health/runtime-config snapshot',
    ],
  });

  // Fake provider answers for dry-run so pipeline is exercised
  const fakeRecords = [];
  for (const q of doc.questions) {
    for (const cfg of ['A', 'B', 'C', 'N']) {
      const answer = q.reference && typeof q.reference.value === 'number'
        ? `According to the source, the figure is approximately ${q.reference.value}.`
        : (q.category === 'chat' ? 'You are welcome.' : 'I could not verify this from the available sources.');
      fakeRecords.push({
        questionId: q.id,
        configId: cfg,
        answer,
        sources: q.reference ? [q.reference.sourceUrl] : [],
        provisional: provisionalLabel(answer, q, q.reference ? [q.reference.sourceUrl] : []),
      });
    }
  }
  report.records = fakeRecords;
  const { blinded, mapping } = blindAnswers(fakeRecords.map(r => ({
    configId: r.configId, questionId: r.questionId, answer: r.answer, sources: r.sources,
  })), 42);
  report.blindMappingNote = 'mapping present in full report only; summary is blinded';

  // Aggregates (provisional machine labels only)
  const byCfg = {};
  for (const r of fakeRecords) {
    if (!byCfg[r.configId]) byCfg[r.configId] = { G: 0, W: 0, A: 0, N: 0, I: 0, total: 0 };
    byCfg[r.configId][r.provisional] = (byCfg[r.configId][r.provisional] || 0) + 1;
    byCfg[r.configId].total += 1;
  }
  report.aggregates = {};
  for (const [cfg, c] of Object.entries(byCfg)) {
    report.aggregates[cfg] = {
      G: rateWithInterval(c.G, c.total),
      W: rateWithInterval(c.W, c.total),
      A: rateWithInterval(c.A, c.total),
      n: c.total,
    };
  }

  const summaryMd = [
    '# Eval summary (blinded view) — P127.1 dry-run',
    '',
    `Question-set hash: \`${hash}\``,
    `Commit: \`${report.commit}\``,
    `Live results: **NOT_RUN**`,
    '',
    '## Blinded answers (seed 42)',
    'Labels X1… are shuffled; mapping only in machine report.',
    '',
    ...blinded.slice(0, 3).flatMap(b => [
      `### ${b.questionId}`,
      ...b.slots.map(s => `- **${s.label}**: ${String(s.answer).slice(0, 120)}…`),
      '',
    ]),
    '… (truncated)',
    '',
    '## Provisional machine aggregates (dry-run fake provider)',
    '```',
    JSON.stringify(report.aggregates, null, 2),
    '```',
    '',
    '## NOT_RUN',
    ...report.notRun.map(x => `- ${x}`),
  ].join('\n');

  writeReports(report, summaryMd);
  console.log('Dry-run complete. Live product/Gemini calls remain NOT_RUN.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
