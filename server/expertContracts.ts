/**
 * P122.3 — Expert API contracts, request/response validation, idempotency, error taxonomy.
 * Pure helpers used by Expert endpoints in server.ts. No Express coupling beyond types.
 */

export const EXPERT_ENDPOINTS = [
  'neutralize',
  'radar',
  'understand',
  'knowledge-map',
  'expand',
  'redteam-pair',
  'redteam',
  'premortem',
  'experiment-draft',
  'forecast-wording',
  'synthesis',
  'review',
] as const;

export type ExpertEndpoint = (typeof EXPERT_ENDPOINTS)[number];

export type ExpertErrorCategory =
  | 'VALIDATION'
  | 'PRECONDITION'
  | 'INVALID_MODEL_JSON'
  | 'INVALID_MODEL_SHAPE'
  | 'MODEL_TIMEOUT'
  | 'PROVIDER_ERROR'
  | 'RATE_LIMIT'
  | 'QUOTA'
  | 'CANCELLED'
  | 'IDEMPOTENT_REPLAY'
  | 'INTERNAL';

export interface ExpertErrorBody {
  success: false;
  error: string;
  code: ExpertErrorCategory;
  operation?: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

export interface EndpointContract {
  name: ExpertEndpoint;
  purpose: string;
  requiredBodyFields: string[];
  /** Soft max body size in chars (serialized). */
  maxBodyChars: number;
}

export const ENDPOINT_CONTRACTS: Record<ExpertEndpoint, EndpointContract> = {
  neutralize: {
    name: 'neutralize',
    purpose: 'Neutralize loaded language in the decision brief',
    requiredBodyFields: ['brief'],
    maxBodyChars: 200_000,
  },
  radar: {
    name: 'radar',
    purpose: 'Classify facts, assumptions, interpretations, values, unknowns',
    requiredBodyFields: ['brief'],
    maxBodyChars: 200_000,
  },
  understand: {
    name: 'understand',
    purpose: 'Combined neutralize + radar for UNDERSTAND stage',
    requiredBodyFields: ['brief'],
    maxBodyChars: 250_000,
  },
  'knowledge-map': {
    name: 'knowledge-map',
    purpose: 'Summarize known / unknown / critical from radar',
    requiredBodyFields: ['radar'],
    maxBodyChars: 200_000,
  },
  expand: {
    name: 'expand',
    purpose: 'Generate knowledge map and distinct alternatives',
    requiredBodyFields: ['brief', 'radar'],
    maxBodyChars: 250_000,
  },
  'redteam-pair': {
    name: 'redteam-pair',
    purpose: 'Select preferred and opposite options for critique',
    requiredBodyFields: ['options'],
    maxBodyChars: 150_000,
  },
  redteam: {
    name: 'redteam',
    purpose: 'Red-team critique of a target option',
    requiredBodyFields: ['option'],
    maxBodyChars: 200_000,
  },
  premortem: {
    name: 'premortem',
    purpose: 'Pre-mortem failure analysis',
    requiredBodyFields: ['brief'],
    maxBodyChars: 200_000,
  },
  'experiment-draft': {
    name: 'experiment-draft',
    purpose: 'Draft experiment cards for selected hypotheses',
    requiredBodyFields: ['hypotheses'],
    maxBodyChars: 200_000,
  },
  'forecast-wording': {
    name: 'forecast-wording',
    purpose: 'Help word a forecast for an experiment',
    requiredBodyFields: ['card'],
    maxBodyChars: 100_000,
  },
  synthesis: {
    name: 'synthesis',
    purpose: 'Produce integrated final decision synthesis',
    requiredBodyFields: ['brief'],
    maxBodyChars: 300_000,
  },
  review: {
    name: 'review',
    purpose: 'Review / critique a completed analysis section',
    requiredBodyFields: [],
    maxBodyChars: 200_000,
  },
};

function hasPath(obj: unknown, path: string): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const parts = path.split('.');
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return false;
    cur = cur[p];
  }
  return cur !== undefined && cur !== null && cur !== '';
}

/** Validate request body against endpoint contract. */
export function validateExpertRequest(
  endpoint: ExpertEndpoint,
  body: unknown
): { ok: true } | { ok: false; code: ExpertErrorCategory; error: string; details?: Record<string, unknown> } {
  const contract = ENDPOINT_CONTRACTS[endpoint];
  if (!contract) {
    return { ok: false, code: 'VALIDATION', error: `Unknown Expert endpoint: ${endpoint}` };
  }
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, code: 'VALIDATION', error: 'Request body must be a JSON object' };
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(body);
  } catch {
    return { ok: false, code: 'VALIDATION', error: 'Request body is not serializable' };
  }
  if (serialized.length > contract.maxBodyChars) {
    return {
      ok: false,
      code: 'VALIDATION',
      error: `Request body exceeds maximum size (${contract.maxBodyChars} chars)`,
      details: { size: serialized.length },
    };
  }
  const missing: string[] = [];
  for (const field of contract.requiredBodyFields) {
    if (field === 'brief') {
      if (!hasPath(body, 'brief.decision') && !hasPath(body, 'brief')) missing.push('brief.decision');
      else if (!hasPath(body, 'brief.decision')) missing.push('brief.decision');
    } else if (!hasPath(body, field)) {
      missing.push(field);
    }
  }
  if (missing.length) {
    return {
      ok: false,
      code: 'PRECONDITION',
      error: `Missing required fields: ${missing.join(', ')}`,
      details: { missing },
    };
  }
  return { ok: true };
}

/** Validate that model output is a non-null object (not array/primitive). */
export function validateModelObject(data: unknown): { ok: true; data: Record<string, unknown> } | { ok: false; code: ExpertErrorCategory; error: string } {
  if (data == null) {
    return { ok: false, code: 'INVALID_MODEL_SHAPE', error: 'Model returned empty response' };
  }
  if (typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, code: 'INVALID_MODEL_SHAPE', error: 'Model response must be a JSON object' };
  }
  return { ok: true, data: data as Record<string, unknown> };
}

/** Stage-specific required top-level keys (soft contract). */
const SHAPE_REQUIREMENTS: Partial<Record<ExpertEndpoint, string[]>> = {
  neutralize: ['items'],
  radar: ['facts', 'assumptions', 'unknowns'],
  understand: [], // combined; flexible
  expand: ['options'],
  redteam: ['objections'],
  premortem: ['causes'],
  'experiment-draft': ['drafts'],
  synthesis: [],
};

export function validateModelShape(
  endpoint: ExpertEndpoint,
  data: unknown
): { ok: true } | { ok: false; code: ExpertErrorCategory; error: string; missing: string[] } {
  const objCheck = validateModelObject(data);
  // `=== false` (not `!objCheck.ok`): without strictNullChecks only an explicit comparison narrows the union.
  if (objCheck.ok === false) return { ok: false, code: objCheck.code, error: objCheck.error, missing: [] };
  const required = SHAPE_REQUIREMENTS[endpoint] || [];
  const missing = required.filter((k) => !(k in objCheck.data));
  if (missing.length) {
    return {
      ok: false,
      code: 'INVALID_MODEL_SHAPE',
      error: `Model response missing required fields: ${missing.join(', ')}`,
      missing,
    };
  }
  return { ok: true };
}

/** Map thrown errors to Expert error categories. */
export function classifyExpertError(err: unknown): {
  category: ExpertErrorCategory;
  status: number;
  retryable: boolean;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
} {
  const e = err as any;
  const msg = String(e?.message || err || 'Unknown error');
  const code = String(e?.code || '');

  if (code === 'GEMINI_QUOTA' || /quota/i.test(msg)) {
    return { category: 'QUOTA', status: 429, retryable: true, message: msg, code, details: e?.details };
  }
  if (code === 'GEMINI_RATE_LIMIT' || /rate limit/i.test(msg)) {
    return { category: 'RATE_LIMIT', status: 429, retryable: true, message: msg, code, details: e?.details };
  }
  if (code === 'GEMINI_UNAVAILABLE' || /unavailable|timeout|aborted|AbortError/i.test(msg)) {
    const isTimeout = /timeout|aborted|AbortError/i.test(msg);
    return {
      category: isTimeout ? 'MODEL_TIMEOUT' : 'PROVIDER_ERROR',
      status: isTimeout ? 504 : 503,
      retryable: true,
      message: msg,
      code,
      details: e?.details,
    };
  }
  if (/invalid JSON/i.test(msg)) {
    return { category: 'INVALID_MODEL_JSON', status: 502, retryable: true, message: msg, code };
  }
  if (code === 'PRECONDITION' || code === 'VALIDATION') {
    return { category: code as ExpertErrorCategory, status: 400, retryable: false, message: msg, code };
  }
  return { category: 'INTERNAL', status: 500, retryable: false, message: msg, code };
}

// --- Idempotency (in-process, bounded) ---

interface IdempotentEntry {
  status: number;
  body: unknown;
  at: number;
}

const IDEMPOTENCY_TTL_MS = 15 * 60 * 1000;
const IDEMPOTENCY_MAX = 200;
const idempotencyStore = new Map<string, IdempotentEntry>();

function pruneIdempotency(now = Date.now()) {
  for (const [k, v] of idempotencyStore) {
    if (now - v.at > IDEMPOTENCY_TTL_MS) idempotencyStore.delete(k);
  }
  if (idempotencyStore.size > IDEMPOTENCY_MAX) {
    const ordered = [...idempotencyStore.entries()].sort((a, b) => a[1].at - b[1].at);
    for (let i = 0; i < ordered.length - IDEMPOTENCY_MAX; i++) {
      idempotencyStore.delete(ordered[i][0]);
    }
  }
}

export function idempotencyKeyFromRequest(headers: Record<string, unknown> | undefined, body: unknown): string | null {
  const h = headers || {};
  const fromHeader =
    (h['x-idempotency-key'] as string) ||
    (h['X-Idempotency-Key'] as string) ||
    (h['idempotency-key'] as string);
  if (fromHeader && typeof fromHeader === 'string' && fromHeader.trim()) {
    return fromHeader.trim().slice(0, 128);
  }
  // Optional body field
  if (body && typeof body === 'object' && typeof (body as any).idempotencyKey === 'string') {
    return String((body as any).idempotencyKey).trim().slice(0, 128) || null;
  }
  return null;
}

export function getIdempotentResponse(key: string): IdempotentEntry | null {
  pruneIdempotency();
  return idempotencyStore.get(key) || null;
}

export function storeIdempotentResponse(key: string, status: number, body: unknown): void {
  pruneIdempotency();
  idempotencyStore.set(key, { status, body, at: Date.now() });
}

/** Test helper: clear idempotency store. */
export function _resetIdempotencyStoreForTests(): void {
  idempotencyStore.clear();
}
