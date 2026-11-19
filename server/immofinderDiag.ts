/**
 * ImmoFinder diagnostics: one structured event helper (console + application log, i.e. "All logs" ZIP) and pure
 * metrics that say how complete the saved cards are (date, price, rooms, contact, photos) overall and per source/host.
 * Events never carry page text beyond short snippets and never throw.
 */
import { recordApplicationLog } from './projectDiagnostics.ts';
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
