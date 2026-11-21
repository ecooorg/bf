/**
 * ImmoFinder diagnostics: one structured event helper (console + application log, i.e. "All logs" ZIP) and pure
 * metrics that say how complete the saved cards are (date, price, rooms, contact, photos) overall and per source/host.
 * Events never carry page text beyond short snippets and never throw.
 */
import { recordApplicationLog } from './projectDiagnostics.ts';
import { getPool } from './database.ts';
import { isSpecificLink } from './immofinderCore.ts';

export type ImmoLogLevel = 'info' | 'warn' | 'error';

/** `immofinder_<event>` to the console and component `immofinder` to the application log. */
export function immoLog(level: ImmoLogLevel, event: string, details: Record<string, unknown> = {}, message = ''): void {
  try {
    const line = JSON.stringify({ type: `immofinder_${event}`, ...details });
    if (level === 'error') console.error(line); else if (level === 'warn') console.warn(line); else console.info(line);
    void recordApplicationLog({ level, component: 'immofinder', event, message: message || event, details }).catch(() => {});
  } catch { /* diagnostics must never break a run */ }
}


/** Secret-free database snapshot for ImmoFinder run diagnostics. */
export async function immoDatabaseDiagnostics(): Promise<Record<string, unknown>> {
  const started = Date.now();
  try {
    const pool = await getPool();
    const [meta, listings, seen] = await Promise.all([
      pool.query('SELECT current_database() AS database, now() AS database_time'),
      pool.query('SELECT count(*)::int AS total, count(*) FILTER (WHERE hidden = false)::int AS visible, count(*) FILTER (WHERE hidden = true)::int AS hidden FROM immofinder_listings'),
      pool.query('SELECT count(*)::int AS total, count(*) FILTER (WHERE checked_at > now() - interval \'24 hours\')::int AS checked_24h FROM immofinder_seen'),
    ]);
    return {
      status: 'ok', database: meta.rows[0]?.database || null,
      databaseTime: meta.rows[0]?.database_time || null,
      listings: listings.rows[0] || {}, seen: seen.rows[0] || {},
      pool: { total: pool.totalCount ?? null, idle: pool.idleCount ?? null, waiting: pool.waitingCount ?? null },
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return { status: 'error', latencyMs: Date.now() - started, error: String((error as Error)?.message || error).slice(0, 180) };
  }
}

const hostOfUrl = (u: unknown): string => { try { return new URL(String(u)).hostname.replace(/^www\./, '').slice(0, 60); } catch { return 'unknown'; } };
const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {});

export interface CardFields {
  published: boolean; price: boolean; priceMonthly: boolean; rooms: boolean; phone: boolean; email: boolean; contact: boolean;
  photos: boolean; owner: boolean; specificLink: boolean; hidden: boolean; source: string; host: string;
}

/** Which fields one saved row (DB row or pipeline record) actually has. */
export function cardFields(r: any): CardFields {
  const raw = obj(r?.raw);
  const price = obj(raw.price);
  const amount = price.amount != null ? Number(price.amount) : (r?.rent_monthly_chf != null ? Number(r.rent_monthly_chf) : NaN);
  const unit = String(price.unit || r?.pricing_unit || '').toLowerCase();
  const url = String(r?.listing_url || '');
  const phone = Boolean(String(r?.direct_phone || '').trim());
  const email = Boolean(String(r?.direct_email || '').trim());
  const sources: unknown[] = Array.isArray(r?.source_ids) ? r.source_ids : [];
  return {
    published: Boolean(r?.listed_at || raw.listed_at),
    price: Number.isFinite(amount) && amount > 0,
    priceMonthly: Number.isFinite(amount) && amount > 0 && unit === 'month',
    rooms: r?.rooms_estimated != null && String(r.rooms_estimated) !== '' && Number(r.rooms_estimated) > 0,
    phone, email, contact: phone || email,
    photos: Array.isArray(r?.photo_urls) && r.photo_urls.length > 0,
    owner: Boolean(String(r?.owner_name || '').trim()),
    specificLink: url ? isSpecificLink(url) : false,
    hidden: Boolean(r?.hidden),
    source: String(sources[0] || raw.via || 'unknown').slice(0, 40),
    host: hostOfUrl(url),
  };
}

export interface CompletenessGroup { id: string; total: number; published: number; price: number; rooms: number; contact: number; photos: number }
export interface Completeness {
  total: number; hidden: number;
  with: { published: number; price: number; priceMonthly: number; rooms: number; phone: number; email: number; contact: number; photos: number; owner: number; specificLink: number };
  pct: { published: number; price: number; rooms: number; contact: number; photos: number };
  /** Share of visible (not hidden) rows that have every key field: date, price, rooms and a contact. */
  fullCards: number; fullCardsPct: number;
  dateSource: Record<string, number>;
  bySource: CompletenessGroup[]; weakHosts: { host: string; total: number; noDate: number; noContact: number }[];
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

/** Aggregate completeness over rows; `bySource` / `weakHosts` show where gaps come from (top 12 / top 10). */
export function completenessSummary(rows: any[]): Completeness {
  const w = { published: 0, price: 0, priceMonthly: 0, rooms: 0, phone: 0, email: 0, contact: 0, photos: 0, owner: 0, specificLink: 0 };
  const src = new Map<string, CompletenessGroup>(); const hosts = new Map<string, { host: string; total: number; noDate: number; noContact: number }>();
  const dateSource: Record<string, number> = {}; let hidden = 0; let full = 0; let visible = 0;
  for (const r of rows) {
    const f = cardFields(r);
    (Object.keys(w) as (keyof typeof w)[]).forEach((k) => { if (f[k]) w[k]++; });
    if (f.hidden) hidden++; else { visible++; if (f.published && f.price && f.rooms && f.contact) full++; }
    const ds = String(obj(r?.raw).listed_at_source || (f.published ? 'unknown' : 'none')); dateSource[ds] = (dateSource[ds] || 0) + 1;
    const g = src.get(f.source) || { id: f.source, total: 0, published: 0, price: 0, rooms: 0, contact: 0, photos: 0 };
    g.total++; if (f.published) g.published++; if (f.price) g.price++; if (f.rooms) g.rooms++; if (f.contact) g.contact++; if (f.photos) g.photos++; src.set(f.source, g);
    const h = hosts.get(f.host) || { host: f.host, total: 0, noDate: 0, noContact: 0 };
    h.total++; if (!f.published) h.noDate++; if (!f.contact) h.noContact++; hosts.set(f.host, h);
  }
  const total = rows.length;
  return {
    total, hidden, with: w,
    pct: { published: pct(w.published, total), price: pct(w.price, total), rooms: pct(w.rooms, total), contact: pct(w.contact, total), photos: pct(w.photos, total) },
    fullCards: full, fullCardsPct: pct(full, visible), dateSource,
    bySource: [...src.values()].sort((a, b) => b.total - a.total).slice(0, 12),
    weakHosts: [...hosts.values()].filter((h) => h.noDate + h.noContact > 0).sort((a, b) => (b.noDate + b.noContact) - (a.noDate + a.noContact)).slice(0, 10),
  };
}

/** Path without query string, for samples that must be recognisable but not leak tokens. */
export function safeUrlSample(u: unknown): string {
  try { const x = new URL(String(u)); return `${x.hostname}${x.pathname}`.slice(0, 140); } catch { return String(u || '').slice(0, 140); }
}

/** Detect text that is mostly a repeated snippet (title pasted twice, ellipsis loops). */
function looksDuplicatedText(s: string): boolean {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length < 40) return false;
  const mid = Math.floor(t.length / 2);
  const a = t.slice(0, mid).toLowerCase().replace(/[^a-z0-9äöü ]+/gi, ' ').replace(/\s+/g, ' ').trim();
  const b = t.slice(mid).toLowerCase().replace(/[^a-z0-9äöü ]+/gi, ' ').replace(/\s+/g, ' ').trim();
  if (a && b && (a === b || a.startsWith(b.slice(0, 24)) || b.startsWith(a.slice(0, 24)))) return true;
  const parts = t.split(/\s*(?:\.{3}|…)\s*/).map((p) => p.trim().toLowerCase()).filter((p) => p.length >= 12);
  if (parts.length >= 2 && parts[0] === parts[1]) return true;
  return false;
}

export interface CardQualitySample {
  id: string;
  host: string;
  municipality: string;
  url: string;
  issues: string[];
  rooms: string | number | null;
  price: string;
  contact: string;
  aboutPreview: string;
}

/**
 * Deep card-quality report for All Logs: which saved rows are weak, duplicated, generic-link,
 * or missing key facts. Samples are short and secret-free so they can ship in the ZIP.
 */
export function cardQualityReport(rows: any[]): Record<string, unknown> {
  const samples: CardQualitySample[] = [];
  const issueCounts: Record<string, number> = {};
  let visible = 0;
  let withAbout = 0;
  let aboutDup = 0;
  let genericLink = 0;
  let evidenceOnly = 0;
  let titleEcho = 0;

  for (const r of rows) {
    if (r?.hidden) continue;
    visible++;
    const f = cardFields(r);
    const issues: string[] = [];
    const name = String(r?.property_name || '').replace(/\s+/g, ' ').trim();
    const desc = String(r?.description_de || '').replace(/\s+/g, ' ').trim();
    const evidence = String(obj(r?.raw).evidence_text || '').replace(/\s+/g, ' ').trim();
    const about = desc || name;
    if (about) withAbout++;
    if (looksDuplicatedText(desc) || looksDuplicatedText(name)) {
      aboutDup++;
      issues.push('duplicated_about');
    }
    if (name && desc) {
      const n = name.toLowerCase().slice(0, 40);
      if (desc.toLowerCase().startsWith(n) && desc.length < name.length + 30) {
        titleEcho++;
        issues.push('title_echo_in_description');
      }
    }
    if (!f.specificLink) {
      genericLink++;
      issues.push('generic_link');
    }
    if (!f.price) issues.push('no_price');
    if (!f.rooms) issues.push('no_rooms');
    if (!f.contact) issues.push('no_contact');
    if (!f.published) issues.push('no_published_date');
    if (!about && evidence) {
      evidenceOnly++;
      issues.push('evidence_only_no_about');
    }
    if (!name && !desc) issues.push('empty_title_and_description');
    for (const i of issues) issueCounts[i] = (issueCounts[i] || 0) + 1;
    if (issues.length && samples.length < 12) {
      const priceAmt = obj(obj(r?.raw).price).amount ?? r?.rent_monthly_chf;
      const priceUnit = obj(obj(r?.raw).price).unit || r?.pricing_unit || '';
      samples.push({
        id: String(r?.id || '').slice(0, 12),
        host: f.host,
        municipality: String(r?.municipality || '').slice(0, 40),
        url: safeUrlSample(r?.listing_url),
        issues,
        rooms: r?.rooms_estimated ?? null,
        price: priceAmt != null ? `${priceAmt} ${priceUnit}`.trim() : 'n/a',
        contact: [r?.owner_name, r?.direct_phone, r?.direct_email].filter(Boolean).join(' · ').slice(0, 80) || 'none',
        aboutPreview: (about || evidence).slice(0, 120),
      });
    }
  }

  return {
    visible,
    withAbout,
    aboutDup,
    titleEcho,
    genericLink,
    evidenceOnly,
    issueCounts,
    /** Weak-card samples for improvement work (host, issues, short about). */
    weakSamples: samples,
    pct: {
      aboutDup: visible ? Math.round((aboutDup / visible) * 1000) / 10 : 0,
      genericLink: visible ? Math.round((genericLink / visible) * 1000) / 10 : 0,
      noContact: visible ? Math.round(((issueCounts.no_contact || 0) / visible) * 1000) / 10 : 0,
      noPublished: visible ? Math.round(((issueCounts.no_published_date || 0) / visible) * 1000) / 10 : 0,
    },
  };
}

/**
 * Full diagnostic payload for a finished run — completeness + card quality + funnel.
 * Written once under event `search_quality_summary` so All Logs has one dense block to improve search.
 */
export function searchQualityPayload(args: {
  runId?: string | null;
  wave?: string | null;
  counts?: Record<string, number>;
  filtered?: Record<string, number>;
  errors?: number;
  sourceStats?: unknown[];
  wavesRun?: string[];
  savedRows: any[];
  preview?: { url: string; title?: string; source?: string; municipality?: string | null; rooms?: number | null; kept?: boolean; reason?: string; detail?: string }[];
}): Record<string, unknown> {
  const completeness = completenessSummary(args.savedRows);
  const quality = cardQualityReport(args.savedRows);
  const previewSamples = (args.preview || []).slice(0, 12).map((x) => ({
    host: hostOfUrl(x.url),
    kept: x.kept,
    reason: x.reason || null,
    detail: String(x.detail || '').slice(0, 120),
    municipality: x.municipality || null,
    rooms: x.rooms ?? null,
    title: String(x.title || '').slice(0, 80),
  }));
  return {
    runId: args.runId || null,
    wave: args.wave || null,
    counts: args.counts || {},
    filtered: args.filtered || {},
    errors: args.errors ?? 0,
    sourceStats: args.sourceStats || [],
    wavesRun: args.wavesRun || [],
    completeness,
    cardQuality: quality,
    previewSamples,
  };
}
