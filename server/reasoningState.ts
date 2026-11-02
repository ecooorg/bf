/**
 * Conversation state and output-integrity utilities.
 * - Normalizes the conversation state object and keeps it bounded.
 * - Keeps model hypotheses out of user-supplied facts.
 * - Scrubs leaked service labels from the visible reply.
 * These helpers do not prescribe model reasoning or trigger model calls.
 */

export interface ReasoningState {
  coreProblem: string;
  userConcern: string;
  userReasoningState: string;
  facts: string[];
  assumptions: string[];
  unknowns: string[];
  options: string[];
  hypotheses: string[];
  expectations: string[];
}

export const STATE_LIMITS = {
  scalarChars: 300,
  itemChars: 200,
  itemsPerList: 12,
  totalItems: 60,
} as const;

const LISTS = ['facts', 'assumptions', 'unknowns', 'options', 'hypotheses', 'expectations'] as const;
const SCALARS = ['coreProblem', 'userConcern', 'userReasoningState'] as const;

export function emptyReasoningState(): ReasoningState {
  return {
    coreProblem: '', userConcern: '', userReasoningState: '',
    facts: [], assumptions: [], unknowns: [], options: [], hypotheses: [], expectations: [],
  };
}

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

function asText(x: unknown): string {
  if (typeof x === 'string') return x;
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    for (const k of ['text', 'title', 'value', 'statement']) if (typeof o[k] === 'string') return o[k] as string;
  }
  return '';
}

function normKey(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// Crude language-neutral stems (first 5 letters) so inflected forms still match.
function stems(s: string): Set<string> {
  return new Set(normKey(s).split(' ').filter((w) => w.length >= 3).map((w) => w.slice(0, 5)));
}

function overlap(a: string, b: string): number {
  const sa = stems(a), sb = stems(b);
  if (!sa.size || !sb.size) return 0;
  let n = 0;
  for (const w of sa) if (sb.has(w)) n++;
  return n / sa.size;
}

function sameStatement(a: string, b: string): boolean {
  const x = normKey(a), y = normKey(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x) || overlap(a, b) >= 0.8 && overlap(b, a) >= 0.8;
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    const t = clip(asText(raw), STATE_LIMITS.itemChars);
    const k = normKey(t);
    if (!t || !k || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= STATE_LIMITS.itemsPerList) break;
  }
  return out;
}

/** Reads any state object (old v16 shape, new shape, junk) into the v17 shape. Never throws. */
export function normalizeState(raw: unknown): ReasoningState {
  const s = emptyReasoningState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return s;
  const o = raw as Record<string, unknown>;
  for (const k of SCALARS) s[k] = typeof o[k] === 'string' ? clip(o[k] as string, STATE_LIMITS.scalarChars) : '';
  for (const k of LISTS) s[k] = cleanList(o[k]);
  // A model hypothesis is never a fact: if the same statement is in both, it stays a hypothesis.
  s.facts = s.facts.filter((f) => !s.hypotheses.some((h) => sameStatement(f, h)));
  // Total size cap (trim the tail of the longest lists first).
  let total = LISTS.reduce((n, k) => n + s[k].length, 0);
  while (total > STATE_LIMITS.totalItems) {
    const longest = [...LISTS].sort((a, b) => s[b].length - s[a].length)[0];
    s[longest].pop();
    total--;
  }
  return s;
}

export interface MergeContext {
  previous: ReasoningState;       // state the client sent (already normalized)
  userTexts: string[];            // brief + every user message
  lastAssistantText: string;      // the previous model reply
}

/**
 * Merges the state returned by the model with the previous one.
 * - Missing keys carry over from the previous state.
 * - A NEW fact that echoes the previous model reply but not anything the user wrote
 *   is moved to hypotheses (the model's own words are not information from the user).
 */
export function mergeModelState(modelRaw: unknown, ctx: MergeContext): ReasoningState {
  const prev = ctx.previous;
  const hasModelState = modelRaw && typeof modelRaw === 'object' && !Array.isArray(modelRaw);
  if (!hasModelState) return prev;
  const raw = modelRaw as Record<string, unknown>;
  const incoming = normalizeState(raw);
  const next = emptyReasoningState();
  for (const k of SCALARS) next[k] = typeof raw[k] === 'string' && incoming[k] ? incoming[k] : prev[k];
  for (const k of LISTS) next[k] = Array.isArray(raw[k]) ? incoming[k] : prev[k];

  const userText = ctx.userTexts.join('\n');
  const demoted: string[] = [];
  next.facts = next.facts.filter((f) => {
    if (prev.facts.some((p) => sameStatement(p, f))) return true;      // already known from before
    const fromAssistant = ctx.lastAssistantText ? overlap(f, ctx.lastAssistantText) : 0;
    const fromUser = userText ? overlap(f, userText) : 0;
    if (fromAssistant >= 0.6 && fromUser < 0.4) { demoted.push(f); return false; }
    return true;
  });
  next.hypotheses = cleanList([...next.hypotheses, ...demoted]);
  next.facts = next.facts.filter((f) => !next.hypotheses.some((h) => sameStatement(f, h)));
  return normalizeState(next);
}

/** Internal fields of one model answer. They are read once and never copied to the client. */
export function readInternalFlags(out: any): { problemClear: boolean; driftDetected: boolean; notUnderstood: boolean } {
  return {
    problemClear: out?.problemClear !== false,          // missing = clear (do not block the old behavior)
    driftDetected: out?.driftDetected === true,
    notUnderstood: out?.notUnderstoodSignal === true,
  };
}

/** Keeps the first question only. */
export function firstQuestionOnly(q: string): string {
  const t = String(q || '').trim();
  const i = t.search(/[?？]/);
  return i === -1 ? t : t.slice(0, i + 1).trim();
}

const LABELS = 'USER_DATA|GENERAL_PATTERN|GUESS|USER[ _]FACT|GENERAL[ _]KNOWLEDGE|DERIVED|HYPOTHESIS|UNKNOWN|CORE[ _]PROBLEM|USER[ _]CONCERN|USER[ _]REASONING[ _]STATE|MODEL[ _]HYPOTHESES|KNOWN[ _]FACTS';

/** Safety net: removes service labels and field names if the model leaks them into the reply. */
export function scrubInternalLabels(text: string): string {
  return String(text ?? '')
    .replace(new RegExp(`\\s*[\\(\\[](?:${LABELS})[\\)\\]]`, 'g'), '')
    .replace(new RegExp(`(^|\\n)[ \\t]*(?:-[ \\t]*)?(?:${LABELS})[ \\t]*:[ \\t]*`, 'g'), '$1')
    // Source provenance tags are internal metadata, not user-facing prose.
    .replace(/\s*\(?\s*source\s*:\s*(?:USER_DATA|GENERAL_PATTERN|GUESS)\s*\)?/gi, '')
    .replace(/\b(?:problemClear|driftDetected|notUnderstoodSignal|coreProblem|userConcern|userReasoningState)\b\s*[:=]\s*\w*/g, '')
    // S-3: punctuation orphaned by a removed label ("; ." / ".." / "?.") must not stay behind
    .replace(/\s*[;,]+(?:\s*[;,]+)*\s*(?=[.!?])/g, '')
    .replace(/\s+\.(?!\.)/g, '.')
    .replace(/(?<![.])\.\.(?![.])/g, '.')
    .replace(/([!?])\.(?![.])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Removes provider URLs from user-visible prose without removing the surrounding factual sentence. */
export function stripUserFacingUrls(text: string, preserveUrls = false): string {
  const value = String(text ?? '');
  // Keep the established no-automatic-source-URL behavior, but never suppress
  // a link when the user explicitly requested one.
  if (preserveUrls) return value;
  return value
    .replace(/\b(?:sources?|источник(?:и|ов)?)\s*:\s*https?:\/\/[^\s<>]+/giu, '')
    .replace(/\[([^\]\n]+)\]\(https?:\/\/[^)\s]+\)/gi, '$1')
    .replace(/https?:\/\/[^\s<>]+/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Visible reply composition preserves the model's complete answer. The optional
 * follow-up field is appended only when it is allowed and not already present.
 */
export function buildVisibleReply(reply: string, question: string, allowQuestions: boolean): string {
  const text = String(reply || '').trim();
  const q = allowQuestions ? firstQuestionOnly(question) : '';
  if (!q) return text;
  const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const body = normalize(text);
  const followUp = normalize(q);
  if (followUp && body.includes(followUp)) return text;
  return text ? `${text}\n\n${q}` : q;
}

