/**
 * P125.1 (WP1): query fidelity for the search path. Pure and testable: model calls are injected as `generate`.
 *
 * Owner rule (C125 programme, section 2): at most `verbatimMaxWords` words are translated verbatim, without
 * compression. Longer texts become k = min(maxQueries, ceil(n / wordsPerQuery)) short queries of at most
 * `maxWordsPerQuery` words. Instead of a compression ratio the criterion is: every name, number, date, place,
 * negation and explicit condition of the source appears in at least one query. On a miss the first
 * `maxWordsPerQuery` words are translated verbatim and the missing entities are added as a second query.
 */

/** All limits in one place (owner: configurable constants). The query count is also capped by WEB_SEARCH_MAX_QUERIES. */
export const QUERY_LIMITS = {
  verbatimMaxWords: 20,
  maxWordsPerQuery: 25,
  maxQueries: 3,
  /** Google truncates a query near this length, so a provider query is cut here. */
  providerMaxWords: 32,
  wordsPerQuery: 30,
  /** Documented upper bounds that replace the old 500/300-character cuts. */
  searchInputMaxChars: 1500,
  plannerTurnMaxChars: 600,
} as const;

export type QueryFidelityLog = { sourceWords: number; queryWords: number[]; queryCount: number; check: 'ok' | 'missing' | 'not_needed'; fallback: boolean };
export type Generate = (prompt: string) => Promise<string>;
export type Missing = { kind: 'number' | 'name' | 'date' | 'negation' | 'condition'; value: string };

export const countWords = (t: string): number => (String(t || '').trim().match(/\S+/g) || []).length;
const words = (t: string): string[] => String(t || '').trim().match(/\S+/g) || [];
export const cutWords = (t: string, n: number): string => words(t).slice(0, n).join(' ');

/** True when the text is dominated by non-Latin scripts (same rule as before P125.1). */
export function isNonLatinDominant(text: string): boolean {
  const t = String(text || '');
  if (!t.trim()) return false;
  const letters = t.match(/\p{L}/gu) || [];
  if (letters.length < 3) return false;
  const nonLatin = letters.filter((ch) => !/[A-Za-z\u00C0-\u024F]/.test(ch));
  return nonLatin.length / letters.length >= 0.25;
}

/** k = 1 up to the verbatim threshold, else min(cap, ceil(n / wordsPerQuery)). */
export function plannedQueryCount(n: number, cap: number = QUERY_LIMITS.maxQueries): number {
  if (n <= QUERY_LIMITS.verbatimMaxWords) return 1;
  return Math.max(1, Math.min(cap, QUERY_LIMITS.maxQueries, Math.ceil(n / QUERY_LIMITS.wordsPerQuery)));
}

// ---- deterministic entity extraction and check ------------------------------------------------------------------

const CYR: Record<string, string> = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'i',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'sh',ъ:'',ы:'i',ь:'',э:'e',ю:'u',я:'a',і:'i',ї:'i',є:'e',ґ:'g' };

/** Plain letter-by-letter transliteration (lower-case Latin). */
export function translit(word: string): string {
  return [...String(word || '').toLowerCase().replace(/[^\p{L}]/gu, '')].map((c) => (c in CYR ? CYR[c] : c)).join('');
}

/** Consonant skeleton used to match a Cyrillic name with its English spelling (Вашингтон ~ Washington). Heuristic. */
export function nameSkeleton(word: string): string {
  let s = String(word || '').toLowerCase().replace(/[^\p{L}]/gu, '');
  s = [...s].map((c) => (c in CYR ? CYR[c] : c)).join('');
  s = s.replace(/sch/g, 'sh').replace(/kh|ch|sh|zh|ts/g, (m) => ({ kh: 'h', ch: 'c', sh: 's', zh: 'j', ts: 'z' } as Record<string, string>)[m])
    .replace(/w/g, 'v').replace(/[ckq]/g, 'k').replace(/x/g, 'ks').replace(/ph/g, 'f');
  return s.replace(/[aeiouyh]/g, '').replace(/(.)\1+/g, '$1');
}

const MONTH_RE: [string, string][] = [
  ['янва(?:рь|ря|ре)', 'jan(?:uary)?'], ['февра(?:ль|ля|ле)', 'feb(?:ruary)?'], ['март(?:а|е|ом)?', 'mar(?:ch)?'], ['апре(?:ль|ля|ле)', 'apr(?:il)?'],
  ['ма[йя]|мае', 'may'], ['июн(?:ь|я|е)', 'june?'], ['июл(?:ь|я|е)', 'july?'], ['август(?:а|е)?', 'aug(?:ust)?'],
  ['сентябр(?:ь|я|е)', 'sep(?:t(?:ember)?)?'], ['октябр(?:ь|я|е)', 'oct(?:ober)?'], ['ноябр(?:ь|я|е)', 'nov(?:ember)?'], ['декабр(?:ь|я|е)', 'dec(?:ember)?'],
];
const MONTHS: [RegExp, RegExp][] = MONTH_RE.map(([ru, en]) => [
  new RegExp(`(?<![\\p{L}])((?:${ru}|${en.replace(/\?/g, '?')})(?![\\p{L}]))`, 'iu'),
  new RegExp(`(?<![\\p{L}])(?:${en})(?![\\p{L}])`, 'iu'),
]);
const NEG_SRC = /(?<![\p{L}\p{N}_])(?:не|нет|ни|без|кроме|никогда|not|no|never|without|except|excluding|isn't|don't|doesn't)(?![\p{L}\p{N}_])/iu;
const NEG_EN = /(?<![\p{L}\p{N}_])(?:not|no|never|without|except|excluding|excluded|non|isn't|don't|doesn't|neither|nor)(?![\p{L}\p{N}_])|(?:^|\s)-\w/iu;
const CONDITIONS: [RegExp, RegExp, string][] = [
  [/(?<![\p{L}\p{N}_])(?:только|only)(?![\p{L}\p{N}_])/iu, /(?<![\p{L}\p{N}_])(?:only|just|exclusively)(?![\p{L}\p{N}_])/iu, 'only'],
  [/(?<![\p{L}\p{N}_])(?:если|if|unless)(?![\p{L}\p{N}_])/iu, /(?<![\p{L}\p{N}_])(?:if|unless|when|where|whether)(?![\p{L}\p{N}_])/iu, 'if'],
  [/(?<![\p{L}\p{N}_])(?:после|after)(?![\p{L}\p{N}_])/iu, /(?<![\p{L}\p{N}_])(?:after|since|following|post)(?![\p{L}\p{N}_])/iu, 'after'],
  [/(?<![\p{L}\p{N}_])(?:до|перед|before|until)(?![\p{L}\p{N}_])/iu, /(?<![\p{L}\p{N}_])(?:before|until|prior|by|pre)(?![\p{L}\p{N}_])/iu, 'before'],
];

/** Missing entities of `source` in the joined `queries`. Numbers, capitalised names, negation, conditions, months. */
export function checkFidelity(source: string, queries: string[]): { ok: boolean; missing: Missing[]; hadEntities: boolean } {
  const src = String(source || '').replace(/\s+/g, ' ').trim();
  const q = queries.join(' \n ');
  const qLow = q.toLowerCase();
  const qTokens = (q.match(/[\p{L}\p{N}'’-]+/gu) || []).map((t) => t.toLowerCase());
  const qSkeletons = qTokens.map(nameSkeleton).filter(Boolean);
  const missing: Missing[] = [];
  let had = false;
  for (const m of src.match(/\d+(?:[.,:]\d+)*/g) || []) {
    had = true;
    if (!(qLow.includes(m) || qLow.includes(m.replace(/,/g, '.')) || qLow.includes(m.replace(/\./g, ',')))) missing.push({ kind: 'number', value: m });
  }
  const ws = words(src);
  ws.forEach((raw, i) => {
    const w = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (w.length < 2 || !/^\p{Lu}/u.test(w) || w === w.toUpperCase() && w.length < 2) return;
    if (i === 0 || /[.!?]$/.test(ws[i - 1])) return; // sentence start: capital letter carries no information
    had = true;
    if (qTokens.includes(w.toLowerCase())) return;
    const sk = nameSkeleton(w);
    const head = sk.slice(0, 4);
    if (head.length >= 2 && qSkeletons.some((s) => s.startsWith(head) || (s.length >= 2 && head.startsWith(s) && s.length >= Math.min(head.length, 3)))) return;
    // A name with (almost) no consonants cannot be matched by skeleton: accept a token that starts with its first letter.
    if (head.length < 2 && qTokens.some((t) => t.startsWith(translit(w).slice(0, 1)))) return;
    missing.push({ kind: 'name', value: w });
  });
  for (const [srcRe, enRe] of MONTHS) { const m = src.match(srcRe); if (m) { had = true; if (!enRe.test(q)) missing.push({ kind: 'date', value: m[1] }); } }
  if (NEG_SRC.test(src)) { had = true; if (!NEG_EN.test(q)) missing.push({ kind: 'negation', value: 'negation' }); }
  for (const [srcRe, enRe, label] of CONDITIONS) if (srcRe.test(src)) { had = true; if (!enRe.test(q)) missing.push({ kind: 'condition', value: label }); }
  return { ok: missing.length === 0, missing, hadEntities: had };
}

// ---- generation -------------------------------------------------------------------------------------------------

const clean = (t: string): string => String(t || '').replace(/^["'\s]+|["'\s]+$/g, '').replace(/\s+/g, ' ').trim();

function parseQueryList(raw: string, k: number): string[] | null {
  const m = String(raw || '').match(/\[[\s\S]*\]/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[0]);
    if (!Array.isArray(arr)) return null;
    const out = arr.map((x) => cutWords(clean(String(x)), QUERY_LIMITS.maxWordsPerQuery)).filter((x) => x.length >= 3).slice(0, k);
    return out.length ? out : null;
  } catch { return null; }
}

const REQUIRE = 'Keep every name, number, date, place, negation (not, no, without) and explicit condition. Do not summarise, do not add facts, no instructions to an assistant. No quotes, no explanation, no other language.';

/**
 * Build the English provider queries for `text` (already instruction-filtered by the caller).
 * - n <= 20 words: one verbatim translation (one model call; none when the text is already Latin).
 * - n > 20: k short queries (one model call, or none for Latin text), checked deterministically;
 *   on a miss: first 25 words verbatim plus the missing entities as a second query.
 * Never throws; without a model a non-Latin text stays as it is and the log says so.
 */
export async function buildEnglishQueries(opts: { text: string; generate?: Generate; queryCap?: number }): Promise<{ queries: string[]; fidelity: QueryFidelityLog }> {
  const src = String(opts.text || '').replace(/\s+/g, ' ').trim().slice(0, QUERY_LIMITS.searchInputMaxChars);
  const n = countWords(src);
  const nonLatin = isNonLatinDominant(src);
  const k = plannedQueryCount(n, opts.queryCap);
  const log = (queries: string[], fallback: boolean): { queries: string[]; fidelity: QueryFidelityLog } => {
    const c = checkFidelity(src, queries);
    return { queries, fidelity: { sourceWords: n, queryWords: queries.map(countWords), queryCount: queries.length, check: !c.hadEntities ? 'not_needed' : c.ok ? 'ok' : 'missing', fallback } };
  };
  const translate = async (prompt: string): Promise<string> => { try { return opts.generate ? await opts.generate(prompt) : ''; } catch { return ''; } };

  if (n <= QUERY_LIMITS.verbatimMaxWords) {
    if (!nonLatin || !opts.generate) return log([src], false);
    const out = clean(await translate(`Translate the user message into English as a web search query, faithfully and word for word. ${REQUIRE}\n\nUSER:\n${src}`));
    return out.length >= 3 && !isNonLatinDominant(out) ? log([out], false) : log([src], true);
  }

  const modelText = await translate(`Turn the user message into ${k} English web search queries, each at most ${QUERY_LIMITS.maxWordsPerQuery} words; together they must cover the whole message. ${REQUIRE} Reply with ONLY a JSON array of ${k} strings.\n\nUSER:\n${src}`);
  let queries = parseQueryList(modelText, k);
  if (queries && queries.some(isNonLatinDominant)) queries = null;
  if (!queries && !nonLatin) queries = [cutWords(src, QUERY_LIMITS.maxWordsPerQuery)]; // Latin text, no model: first words verbatim
  if (queries) {
    const c = checkFidelity(src, queries);
    if (c.ok) return log(queries, false);
  }
  // Fallback: first 25 words verbatim, missing entities as a second query.
  const head = cutWords(src, QUERY_LIMITS.maxWordsPerQuery);
  let first = head;
  if (nonLatin) {
    const t = clean(await translate(`Translate the user message into English as a web search query, faithfully and word for word. ${REQUIRE}\n\nUSER:\n${head}`));
    first = t.length >= 3 && !isNonLatinDominant(t) ? t : head;
  }
  const miss = checkFidelity(src, [first]).missing;
  const out = [first];
  if (miss.length && QUERY_LIMITS.maxQueries > 1 && (opts.queryCap ?? 5) > 1) {
    const nums = [...new Set(miss.filter((m) => m.kind === 'number').map((m) => m.value))];
    const names = [...new Set(miss.filter((m) => m.kind === 'name' || m.kind === 'date').map((m) => m.value))];
    const negs = miss.some((m) => m.kind === 'negation') ? ['not'] : [];
    let named = names.join(' ');
    if (named && names.some(isNonLatinDominant)) {
      const t = clean(await translate(`Translate these names and dates into English spelling. Output ONLY the translated list separated by spaces.\n\n${names.join(' ')}`));
      named = t && !isNonLatinDominant(t) ? t : names.filter((x) => !isNonLatinDominant(x)).join(' ');
    }
    const extra = [named, ...nums, ...negs].filter(Boolean).join(' ');
    if (extra) out.push(cutWords(extra, QUERY_LIMITS.maxWordsPerQuery));
  }
  return log(out, true);
}
