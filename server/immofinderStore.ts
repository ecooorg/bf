import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './database.ts';
import { type ImmoConfig, nonListingReason, isSpecificLink, isSeekerPost, isListingUnavailable, clearOutOfCantonRegion, looksLikeAgencyListing, parsePrice, resolveListingPrice } from './immofinderCore.ts';
import { type ImmoSettings, defaultSettings, sanitizeSettings } from './immofinderSettings.ts';
import type { ImmoStore, ListingRecord, RunResult } from './immofinderPipeline.ts';

export function loadImmoConfig(): ImmoConfig {
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const c of [path.join(process.cwd(), 'config', 'immofinder.json'), path.join(here, '..', 'config', 'immofinder.json'), path.join(here, '..', '..', 'config', 'immofinder.json')]) {
    if (fs.existsSync(c)) return JSON.parse(fs.readFileSync(c, 'utf8')) as ImmoConfig;
  }
  throw new Error('config/immofinder.json is missing');
}

export const STATUSES = ['NEW', 'CONTACTED', 'REPLIED', 'REJECTED'] as const;
const j = (v: unknown) => JSON.stringify(v ?? null);

export function createPgStore(): ImmoStore {
  return {
    async findByUrl(url) {
      const p = await getPool();
      const r = await p.query('SELECT id, last_seen_at FROM immofinder_listings WHERE listing_url = $1 OR source_urls @> jsonb_build_array($1::text) LIMIT 1', [url]);
      return r.rows[0] ? { id: r.rows[0].id, last_seen_at: new Date(r.rows[0].last_seen_at).toISOString() } : null;
    },
    async touch(id) { const p = await getPool(); await p.query('UPDATE immofinder_listings SET last_seen_at = now() WHERE id = $1', [id]); },
    async getSeen(url) {
      const p = await getPool(); const r = await p.query('SELECT checked_at, decision, reason FROM immofinder_seen WHERE url = $1', [url]);
      return r.rows[0] ? { checked_at: new Date(r.rows[0].checked_at).toISOString(), decision: r.rows[0].decision, reason: r.rows[0].reason } : null;
    },
    async markSeen(url, sourceId, decision, reason) {
      const p = await getPool();
      await p.query('INSERT INTO immofinder_seen (url, source_id, decision, reason) VALUES ($1,$2,$3,$4) ON CONFLICT (url) DO UPDATE SET decision = $3, reason = $4, checked_at = now()', [url, sourceId, decision, reason]);
    },
    async upsert(rec: ListingRecord) {
      const p = await getPool();
      const ex = await p.query('SELECT id, source_urls, source_ids, photo_urls, direct_phone, direct_email, owner_name, raw FROM immofinder_listings WHERE canonical_key = $1', [rec.canonical_key]);
      if (ex.rows[0]) {
        const o = ex.rows[0]; const uniq = (a: unknown[]) => [...new Set(a)];
        // Merge raw so a later pass can fill listed_at / price without wiping earlier enrichment.
        const prevRaw = o.raw && typeof o.raw === 'object' && !Array.isArray(o.raw) ? o.raw : {};
        const nextRaw = { ...prevRaw, ...(rec.raw && typeof rec.raw === 'object' ? rec.raw : {}) };
        if (prevRaw.listed_at && !nextRaw.listed_at) nextRaw.listed_at = prevRaw.listed_at;
        if (prevRaw.price && !nextRaw.price) nextRaw.price = prevRaw.price;
        await p.query(`UPDATE immofinder_listings SET source_urls = $2::jsonb, source_ids = $3::jsonb, photo_urls = $4::jsonb, last_seen_at = now(), updated_at = now(),
          direct_phone = COALESCE(direct_phone, $5), direct_email = COALESCE(direct_email, $6), owner_name = COALESCE(owner_name, $7),
          raw = $8::jsonb,
          description_de = CASE WHEN length(coalesce($9,'')) > length(coalesce(description_de,'')) THEN $9 ELSE description_de END
          WHERE id = $1`,
          [o.id, j(uniq([...o.source_urls, ...rec.source_urls])), j(uniq([...o.source_ids, ...rec.source_ids])), j(o.photo_urls?.length ? o.photo_urls : rec.photo_urls), rec.direct_phone, rec.direct_email, rec.owner_name, j(nextRaw), rec.description_de || '']);
        return 'updated';
      }
      await p.query(`INSERT INTO immofinder_listings (listing_type, canonical_key, source_urls, source_ids, listing_url, photo_urls, municipality, property_name, rooms_text, rooms_estimated, rooms_basis,
        description_de, description_ru, title_ru, owner_name, direct_phone, direct_email, contact_evidence, contact_status, contact_advice, private_signals, draft_message_de, raw)
        VALUES ($23,$1,$2::jsonb,$3::jsonb,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19,$20::jsonb,$21,$22::jsonb)`,
        [rec.canonical_key, j(rec.source_urls), j(rec.source_ids), rec.listing_url, j(rec.photo_urls), rec.municipality, rec.property_name, rec.rooms_text, rec.rooms_estimated, rec.rooms_basis,
          rec.description_de, rec.description_ru, rec.title_ru, rec.owner_name, rec.direct_phone, rec.direct_email, j(rec.contact_evidence), rec.contact_status, rec.contact_advice, j(rec.private_signals), rec.draft_message_de, j(rec.raw), rec.listing_type]);
      return 'new';
    },
  };
}

export async function listListings(status: string | null, opts?: { includeHidden?: boolean; onlyHidden?: boolean }) {
  const p = await getPool();
  const onlyHidden = Boolean(opts?.onlyHidden);
  const includeHidden = Boolean(opts?.includeHidden);
  const hideClause = onlyHidden ? 'hidden = true' : includeHidden ? 'true' : 'hidden = false';
  const r = await p.query(
    `SELECT * FROM immofinder_listings WHERE (${hideClause}) AND ($1::text IS NULL OR status = $1) ORDER BY (status = 'NEW') DESC, last_seen_at DESC LIMIT 200`,
    [status],
  );
  return r.rows;
}
/** All saved rows for background refresh; deliberately unbounded (UI list is capped separately). */
export async function listListingsForRefresh() {
  const p = await getPool();
  const r = await p.query('SELECT * FROM immofinder_listings ORDER BY last_seen_at DESC');
  return r.rows;
}
export async function hiddenCount(): Promise<number> {
  const p = await getPool(); return Number((await p.query('SELECT count(*)::int AS n FROM immofinder_listings WHERE hidden = true')).rows[0]?.n ?? 0);
}
/** Hides saved rows that the current filters would reject (search pages, hotels, wanted ads ...). Rows stay in the database. */

/**
 * Re-apply current quality rules to every visible saved listing:
 * hide list/seeker/foreign/agency junk; re-parse price from stored text when possible.
 * Does not delete rows and does not call external search/LLM.
 */
/**
 * Re-apply current quality rules to every visible saved listing:
 * hide list/seeker/foreign/agency junk; re-parse price into raw.price when possible.
 * Prices live in raw JSONB (no rent_monthly_chf column). No external search/LLM.
 */
export async function recheckStored(): Promise<{ checked: number; hidden: number; priceFixed: number }> {
  const p = await getPool();
  const r = await p.query(
    `SELECT id, property_name, listing_url, description_de, rooms_estimated, owner_name, direct_phone, direct_email, raw, municipality
     FROM immofinder_listings WHERE hidden = false`,
  );
  let hidden = 0;
  let priceFixed = 0;
  for (const row of r.rows) {
    const title = String(row.property_name || '');
    const url = String(row.listing_url || '');
    const text = String(row.description_de || '');
    const hay = `${title}\n${text}`;

    let why: string | null = nonListingReason(title, url);
    if (!why && !isSpecificLink(url) && /facebook\.com|tutti\.ch|flatfox|icasa|homegate|booking\.com|ferienhausmiete|happyholiday|traum-ferienwohnungen|gruppenhaus|cozycozy|rentola/i.test(url)) {
      why = 'list_or_search_page';
    }
    if (!why && isListingUnavailable(title, text)) why = 'listing_unavailable';
    if (!why && isSeekerPost(title, text)) why = 'seeker_post';
    if (!why && clearOutOfCantonRegion(hay)) why = 'foreign_region';
    if (!why && looksLikeAgencyListing(title, text)) why = 'agency';
    const rooms = Number(row.rooms_estimated);
    if (!why && Number.isFinite(rooms) && rooms >= 12) why = 'rooms_too_many';

    if (why) {
      await p.query('UPDATE immofinder_listings SET hidden = true, hide_reason = $2, updated_at = now() WHERE id = $1', [row.id, why]);
      hidden++;
      continue;
    }

    const price = resolveListingPrice(hay, null) || parsePrice(hay);
    if (!price || !(price.amount >= 400)) continue;

    const prevRaw = row.raw && typeof row.raw === 'object' ? row.raw : {};
    const prevPrice = prevRaw.price && typeof prevRaw.price === 'object' ? prevRaw.price : {};
    const prevAmt = prevPrice.amount != null ? Number(prevPrice.amount) : null;
    const unit = price.unit === 'unknown' ? (price.monthlyChf != null ? 'month' : String(prevPrice.unit || 'unknown')) : price.unit;
    const nextAmt = price.amount;

    const prevBad =
      prevAmt == null ||
      !Number.isFinite(prevAmt) ||
      (prevAmt >= 2020 && prevAmt <= 2035) ||
      (nextAmt >= 800 && prevAmt < 400) ||
      (nextAmt >= 1000 && prevAmt > 0 && prevAmt < 500 && nextAmt >= prevAmt * 2);

    if (!prevBad) continue;

    const nextPrice = {
      amount: nextAmt,
      unit,
      monthlyChf: price.monthlyChf ?? (unit === 'month' ? nextAmt : null),
      quote: price.quote || prevPrice.quote || '',
    };
    const nextRaw = { ...prevRaw, price: nextPrice };
    await p.query(
      `UPDATE immofinder_listings SET raw = $2::jsonb, updated_at = now() WHERE id = $1`,
      [row.id, JSON.stringify(nextRaw)],
    );
    priceFixed++;
  }
  return { checked: r.rows.length, hidden, priceFixed };
}

export async function cleanupStored(): Promise<number> {
  const p = await getPool(); const r = await p.query('SELECT id, property_name, listing_url FROM immofinder_listings WHERE hidden = false'); let n = 0;
  for (const row of r.rows) {
    const why = nonListingReason(row.property_name, row.listing_url); if (!why) continue;
    await p.query('UPDATE immofinder_listings SET hidden = true, hide_reason = $2, updated_at = now() WHERE id = $1', [row.id, why]); n++;
  }
  return n;
}

/** Hard reset: delete every listing, seen-cache and progress so the next run starts empty. */
export async function wipeAllListings(): Promise<{ listings: number; seen: number; progress: number }> {
  const p = await getPool();
  const listings = Number((await p.query('SELECT count(*)::int AS n FROM immofinder_listings')).rows[0]?.n ?? 0);
  const seen = Number((await p.query('SELECT count(*)::int AS n FROM immofinder_seen')).rows[0]?.n ?? 0);
  let progress = 0;
  try { progress = Number((await p.query('SELECT count(*)::int AS n FROM immofinder_progress')).rows[0]?.n ?? 0); } catch { /* table may be absent on old deploys */ }
  await p.query('DELETE FROM immofinder_listings');
  await p.query('DELETE FROM immofinder_seen');
  try { await p.query('DELETE FROM immofinder_progress'); } catch { /* optional */ }
  return { listings, seen, progress };
}
export async function setStatus(id: string, status: string): Promise<boolean> {
  const p = await getPool();
  const r = await p.query('UPDATE immofinder_listings SET status = $2, updated_at = now() WHERE id = $1', [id, status]);
  return r.rowCount > 0;
}

/** Saved rows still without a direct phone or email (and not hidden). */
export async function listListingsNeedingContact(limit = 200): Promise<any[]> {
  const p = await getPool();
  // Any visible card without a usable phone AND without a usable email must be enriched.
  // contact_status is ignored: a wrong "found" without phone/email still gets a retry.
  const r = await p.query(
    `SELECT * FROM immofinder_listings
     WHERE hidden = false
       AND (direct_phone IS NULL OR btrim(direct_phone) = '')
       AND (direct_email IS NULL OR btrim(direct_email) = '')
     ORDER BY last_seen_at DESC
     LIMIT $1`,
    [Math.min(Math.max(limit, 1), 500)],
  );
  return r.rows;
}

/** Patch contact fields on an existing listing (enrichment pass). */
export async function updateListingContacts(
  id: string,
  fields: {
    direct_phone: string | null;
    direct_email: string | null;
    contact_evidence: unknown;
    contact_status: string;
    contact_advice: string;
    raw?: unknown;
    hidden?: boolean;
    hide_reason?: string | null;
  },
): Promise<void> {
  const p = await getPool();
  await p.query(
    `UPDATE immofinder_listings SET
       direct_phone = COALESCE($2, direct_phone),
       direct_email = COALESCE($3, direct_email),
       contact_evidence = $4::jsonb,
       contact_status = $5,
       contact_advice = $6,
       raw = CASE WHEN $7::jsonb IS NULL THEN raw ELSE $7::jsonb END,
       hidden = CASE WHEN $8::boolean IS NULL THEN hidden ELSE $8::boolean END,
       hide_reason = CASE WHEN $8::boolean IS TRUE THEN COALESCE($9, hide_reason) WHEN $8::boolean IS FALSE THEN NULL ELSE hide_reason END,
       updated_at = now()
     WHERE id = $1`,
    [
      id,
      fields.direct_phone,
      fields.direct_email,
      JSON.stringify(fields.contact_evidence ?? []),
      fields.contact_status,
      fields.contact_advice ?? '',
      fields.raw != null ? JSON.stringify(fields.raw) : null,
      fields.hidden == null ? null : Boolean(fields.hidden),
      fields.hide_reason ?? null,
    ],
  );
}

export async function startRun(trigger: string, dryRun: boolean): Promise<string | null> {
  const p = await getPool();
  const busy = await p.query(`SELECT 1 FROM immofinder_runs WHERE finished_at IS NULL AND started_at > now() - interval '30 minutes' LIMIT 1`);
  if (busy.rows[0]) return null;
  const r = await p.query('INSERT INTO immofinder_runs (trigger, dry_run) VALUES ($1, $2) RETURNING id', [trigger, dryRun]);
  return r.rows[0].id;
}
export async function finishRun(id: string, res: RunResult | null, errors: unknown[], delivery: unknown) {
  const p = await getPool();
  await p.query('UPDATE immofinder_runs SET finished_at = now(), counts = $2::jsonb, errors = $3::jsonb, est_cost_usd = $4, delivery = $5::jsonb, sources = $6::jsonb WHERE id = $1',
    [id, j({ ...(res?.counts ?? {}), filtered: res?.filtered ?? {} }), j(errors), res?.estCostUsd ?? 0, j(delivery), j(res?.preview.slice(0, 200) ?? [])]);
}
export async function latestRun() {
  const p = await getPool();
  return (await p.query('SELECT * FROM immofinder_runs ORDER BY started_at DESC LIMIT 1')).rows[0] ?? null;
}

export async function realRunCount(): Promise<number> {
  const p = await getPool();
  return Number((await p.query('SELECT count(*)::int AS n FROM immofinder_runs WHERE dry_run = false')).rows[0]?.n ?? 0);
}

export async function saveProgress(id: string, progress: unknown) {
  const p = await getPool();
  await p.query('UPDATE immofinder_runs SET progress = $2::jsonb WHERE id = $1', [id, JSON.stringify(progress ?? {})]);
}

export async function getSettings(cfg: ImmoConfig): Promise<ImmoSettings> {
  const p = await getPool(); const r = await p.query("SELECT data FROM immofinder_settings WHERE id = 'main'");
  return r.rows[0] ? sanitizeSettings(r.rows[0].data, cfg) : defaultSettings(cfg);
}
export async function saveSettings(cfg: ImmoConfig, input: unknown): Promise<ImmoSettings> {
  const s = sanitizeSettings(input, cfg); const p = await getPool();
  await p.query("INSERT INTO immofinder_settings (id, data) VALUES ('main', $1::jsonb) ON CONFLICT (id) DO UPDATE SET data = $1::jsonb, updated_at = now()", [JSON.stringify(s)]);
  return s;
}
export async function lastRealRunAt(): Promise<Date | null> {
  const p = await getPool(); const r = await p.query('SELECT max(started_at) AS t FROM immofinder_runs WHERE dry_run = false');
  return r.rows[0]?.t ? new Date(r.rows[0].t) : null;
}

/** In-process cancel flags for active Immofinder runs (lost on process restart — acceptable). */
const cancelFlags = new Set<string>();
export function requestRunCancel(runId: string): void { if (runId) cancelFlags.add(runId); }
export function isRunCancelled(runId: string): boolean { return cancelFlags.has(runId); }
export function clearRunCancel(runId: string): void { cancelFlags.delete(runId); }

/** Mark the open run finished as cancelled (no delivery). */
export async function finishRunCancelled(id: string, counts: Record<string, number> = {}) {
  const p = await getPool();
  clearRunCancel(id);
  await p.query(
    `UPDATE immofinder_runs SET finished_at = now(), counts = $2::jsonb, errors = $3::jsonb, progress = $4::jsonb WHERE id = $1 AND finished_at IS NULL`,
    [id, JSON.stringify(counts), JSON.stringify([{ code: 'cancelled', detail: 'Stopped by user' }]), JSON.stringify({ stage: 'done', text: 'Stopped by user', counts })],
  );
}
