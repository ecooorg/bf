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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Same env layout as server/keyPool.ts: GEMINI_API_KEY + GEMINI_API_KEY_1..10 */
function resolveGeminiKeys(env = process.env) {
  const seen = new Set();
  const out = [];
  const push = (slot, name, raw) => {
    const key = String(raw || '').trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ slot, envName: name, key });
  };
  push(0, 'GEMINI_API_KEY', env.GEMINI_API_KEY);
  for (let i = 1; i <= 10; i++) push(i, `GEMINI_API_KEY_${i}`, env[`GEMINI_API_KEY_${i}`]);
  return out;
}


function pickModels() {
  try {
    const ms = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/model-sources.json'), 'utf8'));
    const models = ms.sources?.[0]?.models || [];
    const primary = models.find(m => m.role === 'strong')?.id || models[0]?.id || 'gemini-3.5-flash-lite';
    const light = models.find(m => m.role === 'light')?.id || models[1]?.id || primary;
    return { primary, strongest: primary, light };
  } catch {
    return { primary: 'gemini-3.5-flash-lite', strongest: 'gemini-3.5-flash-lite', light: 'gemini-3.1-flash-lite' };
  }
}

/** Login once; returns Cookie header value or null. */
async function loginSession(baseUrl) {
  const password = process.env.EVAL_APP_PASSWORD || process.env.APP_PASSWORD || '';
  if (!password) return null;
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
    redirect: 'manual',
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`login HTTP ${res.status} ${t.slice(0, 120)}`);
  }
  // Node fetch may expose set-cookie as getSetCookie()
  const raw = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
  const parts = (raw || []).map(c => String(c).split(';')[0].trim()).filter(Boolean);
  if (!parts.length) {
    // some runtimes fold cookies
    const single = res.headers.get('set-cookie');
    if (single) parts.push(String(single).split(';')[0].trim());
  }
  if (!parts.length) throw new Error('login ok but no Set-Cookie');
  return parts.join('; ');
}

async function callProduct(baseUrl, route, turns, productMode, cookie) {
  const history = [];
  let lastReply = '';
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  for (let i = 0; i < turns.length; i++) {
    const userText = turns[i];
    history.push({ role: 'user', content: userText });
    const body = {
      productMode,
      brief: { decision: userText },
      history: history.slice(),
      state: {},
    };
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}${route}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} ${route}: ${text.slice(0, 160)}`);
    let data;
    try { data = JSON.parse(text); } catch { data = { reply: text }; }
    // Product envelope: { success, data: { reply, ... }, meta } (server ok())
    const payload = (data && typeof data === 'object' && data.data && typeof data.data === 'object')
      ? data.data
      : data;
    lastReply = payload.reply || payload.message || payload.text || payload.answer
      || data.reply || data.message || '';
    if (data && data.success === false) throw new Error(String(data.error || data.code || 'request failed'));
    if (!String(lastReply || '').trim()) {
      throw new Error('empty reply from product: ' + text.slice(0, 200));
    }
    history.push({ role: 'assistant', content: String(lastReply) });
    await sleep(Number(process.env.MODEL_MIN_INTERVAL_MS) || 5000);
  }
  return { answer: String(lastReply).trim(), sources: [], path: 'product', modelId: null };
}

async function callGeminiDirect(turns, modelIds, useSearch) {
  const slots = resolveGeminiKeys();
  if (!slots.length) throw new Error('GEMINI_API_KEY pool empty');
  const { GoogleGenAI } = await import('@google/genai');
  const prompt = turns.length === 1 ? turns[0] : turns.map((t, i) => 'Turn ' + (i + 1) + ': ' + t).join('\n');
  const config = useSearch ? { tools: [{ googleSearch: {} }] } : {};
  const chain = Array.isArray(modelIds) ? modelIds : [modelIds];
  let lastErr;
  for (const { slot, envName, key } of slots) {
    const ai = new GoogleGenAI({ apiKey: key });
    for (const modelId of chain) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) await sleep(3000 * attempt);
          const resp = await ai.models.generateContent({ model: modelId, contents: prompt, config });
          const text = resp?.text
            || resp?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('')
            || '';
          const chunks = resp?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const sources = chunks.map(c => c?.web?.uri).filter(Boolean);
          return {
            answer: String(text).trim(),
            sources,
            path: useSearch ? 'gemini+search' : 'gemini',
            modelId,
            keySlot: slot,
            keyEnv: envName,
          };
        } catch (e) {
          lastErr = e;
          const msg = String(e?.message || e);
          const rotate = /429|quota|rate|RESOURCE_EXHAUSTED|403|API_KEY/i.test(msg);
          if (rotate) break; // next model or next key
          if (!/503|UNAVAILABLE|timeout|fetch/i.test(msg)) {
            // non-retryable for this key/model
            break;
          }
        }
      }
    }
    // exhausted models for this key → try next key slot
  }
  throw lastErr || new Error('gemini pool exhausted');
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry-run') || (!args.includes('--smoke') && !args.includes('--live') && args.length === 0);
  const smoke = args.includes('--smoke') || args.includes('--live');
  if (args.includes('--score')) {
    console.log('Offline scoring: use pure exports; labels file path later.');
    process.exit(0);
  }

  const doc = loadQuestions();
  const hash = questionSetHash(doc);
  console.log(`Questions: ${doc.questions.length}, hash=${hash}`);

  const models = pickModels();
  const baseUrl = process.env.EVAL_BASE_URL || process.env.BASE_URL || '';
  const geminiSlots = resolveGeminiKeys();
  const hasKey = geminiSlots.length > 0;
  const hasPassword = Boolean(process.env.EVAL_APP_PASSWORD || process.env.APP_PASSWORD);
  const configs = (process.env.EVAL_CONFIGS || 'A,B,C,N').split(',').map(s => s.trim()).filter(Boolean);

  const notRun = [];
  if (!baseUrl) notRun.push('live_product_A/B (no EVAL_BASE_URL)');
  if (baseUrl && !hasPassword) notRun.push('live_product_A/B auth (no EVAL_APP_PASSWORD/APP_PASSWORD)');
  if (!hasKey) notRun.push('live_gemini_C/D (no GEMINI_API_KEY)');
  notRun.push('N isolation on shared deploy (search cannot be forced off remotely)');

  const report = buildReportSkeleton({
    commit: process.env.GITHUB_SHA || 'local',
    setHash: hash,
    modelIds: models,
    slotCount: geminiSlots.length,
    runtimeSnapshot: {
      harness: smoke ? 'smoke' : 'dry-run',
      EVAL_BASE_URL: baseUrl ? '[set]' : null,
      hasGeminiKey: hasKey,
      geminiKeySlots: geminiSlots.length,
      hasAppPassword: hasPassword,
    },
    configs,
    notRun,
  });
  report.patch = process.env.npm_package_patch || '127.3';

  const records = [];
  let cookie = null;

  if (dry && !smoke) {
    for (const q of doc.questions) {
      for (const cfg of configs) {
        const answer = q.reference && typeof q.reference.value === 'number'
          ? `According to the source, the figure is approximately ${q.reference.value}.`
          : (q.category === 'chat' ? 'You are welcome.' : 'I could not verify this from the available sources.');
        const sources = q.reference ? [q.reference.sourceUrl] : [];
        records.push({
          questionId: q.id, configId: cfg, answer, sources,
          provisional: provisionalLabel(answer, q, sources),
          path: 'fake', infra: false,
        });
      }
    }
  } else {
    if (baseUrl && hasPassword && configs.some(c => c === 'A' || c === 'B' || c === 'N')) {
      try {
        cookie = await loginSession(baseUrl);
        console.log('login: session cookie acquired');
      } catch (e) {
        console.error('login failed:', e.message);
        notRun.push(`login_failed: ${e.message}`);
      }
    }

    for (const q of doc.questions) {
      for (const cfg of configs) {
        let result = null;
        let infra = false;
        try {
          if (cfg === 'A' || cfg === 'B' || cfg === 'N') {
            if (!baseUrl || !cookie) {
              records.push({ questionId: q.id, configId: cfg, answer: '', sources: [], provisional: 'I', path: 'NOT_RUN', infra: true });
              continue;
            }
            const route = cfg === 'B' ? '/api/agent/expert' : '/api/agent/conversational';
            const mode = cfg === 'B' ? 'Expert' : 'Simple';
            result = await callProduct(baseUrl, route, q.turns, mode, cookie);
            if (cfg === 'N') {
              result.path = 'product(N-proxy-NOT_ISOLATED)';
              // Remote deploy cannot flip ENABLE_WEB_SEARCH; treat as diagnostic only
            }
          } else if (cfg === 'C' || cfg === 'D') {
            if (!hasKey) {
              records.push({ questionId: q.id, configId: cfg, answer: '', sources: [], provisional: 'I', path: 'NOT_RUN', infra: true });
              continue;
            }
            const chain = cfg === 'D'
              ? [models.strongest, models.light]
              : [models.primary, models.light];
            result = await callGeminiDirect(q.turns, chain, true);
            await sleep(Number(process.env.MODEL_MIN_INTERVAL_MS) || 5000);
          } else continue;
        } catch (e) {
          infra = true;
          result = { answer: `INFRA: ${e.message}`, sources: [], path: 'error', modelId: null };
        }
        const prov = infra ? 'I' : provisionalLabel(result.answer, q, result.sources);
        records.push({
          questionId: q.id, configId: cfg, answer: result.answer, sources: result.sources || [],
          provisional: prov, path: result.path, modelId: result.modelId, infra,
        });
        console.log(`${q.id}/${cfg}: ${prov} path=${result.path} len=${(result.answer || '').length}`);
      }
    }
  }

  report.records = records;
  const { blinded } = blindAnswers(records.filter(r => !r.infra).map(r => ({
    configId: r.configId, questionId: r.questionId, answer: r.answer, sources: r.sources,
  })), 42);

  const byCfg = {};
  for (const r of records) {
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
      I: rateWithInterval(c.I, c.total),
      n: c.total,
    };
  }

  const live = smoke && records.some(r => !r.infra && r.path !== 'fake');
  const infraRate = records.length ? records.filter(r => r.infra).length / records.length : 1;
  const summaryMd = [
    `# Eval summary (blinded) — P127.3 ${smoke ? 'smoke' : 'dry-run'}`,
    '',
    `Question-set hash: \`${hash}\``,
    `Commit: \`${report.commit}\``,
    `Models: primary=${models.primary}, light=${models.light}`,
    `Live calls executed: **${live ? 'YES/PARTIAL' : 'NO'}**`,
    `Infra failure rate: ${(infraRate * 100).toFixed(1)}% (smoke gate: <25%)`,
    '',
    '## Blinded sample',
    ...blinded.slice(0, 4).flatMap(b => [
      `### ${b.questionId}`,
      ...b.slots.map(s => `- **${s.label}**: ${String(s.answer).slice(0, 160).replace(/\\n/g, ' ')}`),
      '',
    ]),
    '## Provisional aggregates',
    '```',
    JSON.stringify(report.aggregates, null, 2),
    '```',
    '',
    '## NOT_RUN / gaps',
    ...[...new Set(notRun)].map(x => `- ${x}`),
    '',
    '## §7.6 instrument checks (smoke)',
    `- Infra failures <25%: ${infraRate < 0.25 ? 'PASS' : 'FAIL'} (${(infraRate * 100).toFixed(1)}%)`,
    '- Scorer unit tests: see CI test:core / eval-harness',
    '- N below A on lookup: needs live non-infra N (may be NOT_RUN on shared deploy)',
    '- Double labelling: Navigator',
  ].join('\n');

  writeReports(report, summaryMd);
  console.log(`${smoke ? 'Smoke' : 'Dry-run'} complete. infraRate=${(infraRate * 100).toFixed(1)}% notRun=${[...new Set(notRun)].length}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1); });
}
