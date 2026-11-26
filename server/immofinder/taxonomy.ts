/**
 * C131 R7 closed reject taxonomy and R9 source-yield report.
 * Pure functions: every legacy reason string maps to exactly one closed code, so a run
 * report can always be summarised and a reject sample audited for false rejects.
 */

export const R7_REJECT_CODES = [
  'not_detail_page',
  'agency',
  'outside_target',
  'rooms_below_min',
  'rooms_unknown',
  'not_residential',
  'seeker',
  'expired',
  'fetch_blocked',
  'duplicate',
  'snippet_only',
  'for_sale',
  'retired_gate',
] as const;

export type R7RejectCode = (typeof R7_REJECT_CODES)[number];

const EXACT: Record<string, R7RejectCode> = {
  trust_snippet_only: 'snippet_only',
  not_single_listing: 'not_detail_page',
  list_or_search_page: 'not_detail_page',
  development_project: 'not_detail_page',
  trust_fetch_url_unverified: 'not_detail_page',
  trust_page_too_short: 'not_detail_page',
  municipality_not_whitelisted: 'outside_target',
  municipality_mismatch: 'outside_target',
  municipality_collage: 'outside_target',
  trust_locality_missing: 'outside_target',
  trust_locality_conflict: 'outside_target',
  rooms_below_min: 'rooms_below_min',
  rooms_unknown: 'rooms_unknown',
  rooms_conflict: 'rooms_unknown',
  trust_rooms_missing: 'rooms_unknown',
  trust_rooms_conflict: 'rooms_unknown',
  agency: 'agency',
  trust_contact_not_advertiser: 'agency',
  trust_not_rental: 'not_residential',
  trust_not_residential: 'not_residential',
  shared_room: 'not_residential',
  seeker_post: 'seeker',
  trust_seeker_post: 'seeker',
  listing_unavailable: 'expired',
  trust_listing_unavailable: 'expired',
  trust_listing_stale: 'expired',
  for_sale: 'for_sale',
  trust_for_sale: 'for_sale',
  // Gates that R1/R2 retire: they reject records for price, contact, date, room maximum or
  // the tourist/furnished type that C131 targets. They are counted so they stay visible.
  rooms_too_many: 'retired_gate',
  contact_required: 'retired_gate',
  temporary_furnished: 'retired_gate',
  holiday_tourism: 'retired_gate',
  trust_monthly_price_missing: 'retired_gate',
  trust_price_quote_missing: 'retired_gate',
  trust_price_not_monthly_chf: 'retired_gate',
  trust_publication_date_missing: 'retired_gate',
  trust_publication_date_future: 'retired_gate',
  trust_contact_missing: 'retired_gate',
  trust_contact_not_page_attributed: 'retired_gate',
};

const PREFIX: Array<[RegExp, R7RejectCode]> = [
  [/^detail_page_/, 'not_detail_page'],
  [/^(fetch_|http_)/, 'fetch_blocked'],
  [/^duplicate/, 'duplicate'],
  [/^(price_|short_stay_)/, 'retired_gate'],
];

/** Returns the closed code for a legacy reason, or null when the reason is not covered. */
export function classifyReject(reason: string): R7RejectCode | null {
  const key = String(reason || '').trim().toLowerCase();
  if (!key) return null;
  if (EXACT[key]) return EXACT[key];
  for (const [re, code] of PREFIX) if (re.test(key)) return code;
  return null;
}

export interface RejectSummary {
  total: number;
  byCode: Record<string, number>;
  /** Reasons outside the closed list; must stay empty, otherwise the taxonomy needs an owner decision. */
  unmapped: Record<string, number>;
  /** Rejects made by gates that R1/R2 retire (price, contact, date, room maximum, tourist type). */
  retiredGateRejects: number;
}

export function summarizeRejects(filtered: Record<string, number> | null | undefined): RejectSummary {
  const out: RejectSummary = { total: 0, byCode: {}, unmapped: {}, retiredGateRejects: 0 };
  for (const [reason, raw] of Object.entries(filtered || {})) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    out.total += n;
    const code = classifyReject(reason);
    if (!code) { out.unmapped[reason] = (out.unmapped[reason] || 0) + n; continue; }
    out.byCode[code] = (out.byCode[code] || 0) + n;
    if (code === 'retired_gate') out.retiredGateRejects += n;
  }
  return out;
}

function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

export interface RejectSampleItem { url: string; source: string; reason: string; code: R7RejectCode | null }

/** Fixed-size, run-seeded sample of rejected previews for false-reject audit (R7). Deterministic per run. */
export function sampleRejects(
  runId: string,
  preview: Array<{ url?: string; source?: string; kept?: boolean; reason?: string | null }> | null | undefined,
  size = 10,
): RejectSampleItem[] {
  const rejected = (preview || []).filter((p) => p && p.kept === false && p.url && p.reason);
  return rejected
    .map((p) => ({ p, k: fnv1a(`${runId}|${p.url}`) }))
    .sort((a, b) => a.k - b.k || String(a.p.url).localeCompare(String(b.p.url)))
    .slice(0, Math.max(0, size))
    .map(({ p }) => ({ url: String(p.url), source: String(p.source || ''), reason: String(p.reason), code: classifyReject(String(p.reason)) }));
}

export interface SourceRunStat { id: string; fetched?: number; kept?: number; candidates?: number }

export interface SourceDemotion { id: string; runs: number; fetched: number; kept: number }

/**
 * R9 evidence: a source is a demotion candidate when, over its last `afterRuns` runs that
 * fetched at least one page, it produced zero verified (kept) records. Runs where the source
 * fetched nothing (blocked, no candidates) are infrastructure/yield data, not quality data,
 * and are not counted. Advisory only; nothing is switched off automatically.
 */
export function sourceDemotionCandidates(runs: Array<SourceRunStat[] | null | undefined>, afterRuns = 5): SourceDemotion[] {
  const per = new Map<string, { runs: number; fetched: number; kept: number }>();
  for (const stats of runs) {
    for (const s of stats || []) {
      if (!s || !s.id) continue;
      const fetched = Number(s.fetched) || 0;
      if (fetched <= 0) continue;
      const cur = per.get(s.id) || { runs: 0, fetched: 0, kept: 0 };
      cur.runs += 1; cur.fetched += fetched; cur.kept += Number(s.kept) || 0;
      per.set(s.id, cur);
    }
  }
  return [...per.entries()]
    .filter(([, v]) => v.runs >= afterRuns && v.kept === 0)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Report block attached to every persisted run diagnostics report. */
export function buildRunQualityAudit(runId: string, result: Record<string, any> | null | undefined, priorRuns: Array<SourceRunStat[] | null | undefined> = [], afterRuns = 5) {
  const r = result || {};
  const current = Array.isArray(r.sourceStats) ? r.sourceStats : [];
  return {
    schema: 1,
    policy: 'C131-R7-R9',
    rejects: summarizeRejects(r.filtered),
    rejectSample: sampleRejects(runId, r.preview, 10),
    sourceDemotion: { afterRuns, candidates: sourceDemotionCandidates([current, ...priorRuns], afterRuns) },
  };
}
