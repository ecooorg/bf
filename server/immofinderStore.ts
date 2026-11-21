import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './database.ts';
import { sanitizeNewRecord, ctxFromConfig, REPAIR_RULES_VERSION, encodeSeenReason, decodeSeenReason } from './immofinderRepair.ts';
import { type ImmoConfig, nonListingReason, isSpecificLink, isSeekerPost, isListingUnavailable, clearOutOfCantonRegion, looksLikeAgencyListing, parsePrice, resolveListingPrice, credibilityRejectReason, buildEvidenceText, isPlatformOrJunkContact, formatHideLog } from './immofinderCore.ts';
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
      const r = await p.query(
        `SELECT id, last_seen_at, hidden,
                (raw->'repair'->>'source' = 'automatic_rules') AS auto_hidden
         FROM immofinder_listings
         WHERE listing_url = $1 OR source_urls @> jsonb_build_array($1::text)
         LIMIT 1`,
        [url],
      );
      return r.rows[0] ? {
        id: r.rows[0].id,
        last_seen_at: new Date(r.rows[0].last_seen_at).toISOString(),
        hidden: Boolean(r.rows[0].hidden),
        autoHidden: Boolean(r.rows[0].auto_hidden),
      } : null;
    },
    async touch(id) { const p = await getPool(); await p.query('UPDATE immofinder_listings SET last_seen_at = now() WHERE id = $1', [id]); },
    async getSeen(url) {
      const p = await getPool(); const r = await p.query('SELECT checked_at, decision, reason FROM immofinder_seen WHERE url = $1', [url]);
      if (!r.rows[0]) return null;
      // Entries written by older search rules are ignored once, then replaced with the current version if rejected again.
      const reason = decodeSeenReason(r.rows[0].reason);
      if (reason === null) return null;
      return { checked_at: new Date(r.rows[0].checked_at).toISOString(), decision: r.rows[0].decision, reason };
    },
    async markSeen(url, sourceId, decision, reason) {
      const p = await getPool();
      await p.query('INSERT INTO immofinder_seen (url, source_id, decision, reason) VALUES ($1,$2,$3,$4) ON CONFLICT (url) DO UPDATE SET decision = $3, reason = $4, checked_at = now()', [url, sourceId, decision, encodeSeenReason(reason)]);
    },
    async upsert(input: ListingRecord) {
      const p = await getPool();
      const sanitized = sanitizeNewRecord(input as unknown as Record<string, any>, ctxFromConfig(loadImmoConfig()));
      const rec = sanitized.rec as unknown as ListingRecord & { hidden?: boolean; hide_reason?: string };
      if (sanitized.notes.length || sanitized.hardReason) {
        rec.raw = { ...(rec.raw || {}), write_time_quality: { notes: sanitized.notes, hardReason: sanitized.hardReason, rules: REPAIR_RULES_VERSION } };
        if (sanitized.hardReason) { rec.hidden = true; rec.hide_reason = sanitized.hardReason; }
      }
      // Identity is the listing URL only. Never merge two different URLs into one card
      // (old canonical_key merge mixed description/price/contacts from unrelated ads).
      const ex = await p.query(
        `SELECT id, listing_url, source_urls, source_ids, photo_urls, direct_phone, direct_email, owner_name, raw, property_name, municipality, rooms_estimated, description_de
         FROM immofinder_listings
         WHERE listing_url = $1 OR source_urls @> jsonb_build_array($1::text)
         LIMIT 1`,
        [rec.listing_url],
      );
      if (ex.rows[0]) {
        const o = ex.rows[0]; const uniq = (a: unknown[]) => [...new Set(a)];
        const prevRaw = o.raw && typeof o.raw === 'object' && !Array.isArray(o.raw) ? o.raw : {};
        const nextRaw = { ...prevRaw, ...(rec.raw && typeof rec.raw === 'object' ? rec.raw : {}) };
        const recoverAutomaticHide = Boolean(o.hidden) && prevRaw.repair?.source === 'automatic_rules' && !sanitized.hardReason;
        if (recoverAutomaticHide) nextRaw.repair = { ...(prevRaw.repair || {}), source: 'automatic_recovery', recoveredAt: new Date().toISOString() };
        if (prevRaw.listed_at && !nextRaw.listed_at) nextRaw.listed_at = prevRaw.listed_at;
        // Prefer newly parsed price when present (same URL re-fetch); else keep previous.
        if (prevRaw.price && !nextRaw.price) nextRaw.price = prevRaw.price;
        await p.query(
          `UPDATE immofinder_listings SET
            listing_url = $2,
            canonical_key = $3,
            source_urls = $4::jsonb,
            source_ids = $5::jsonb,
            photo_urls = $6::jsonb,
            municipality = COALESCE(NULLIF($7,''), municipality),
            property_name = CASE WHEN length(coalesce($8,'')) >= length(coalesce(property_name,'')) THEN $8 ELSE property_name END,
            rooms_estimated = COALESCE($9, rooms_estimated),
            description_de = CASE WHEN length(coalesce($10,'')) > length(coalesce(description_de,'')) THEN $10 ELSE description_de END,
            direct_phone = COALESCE($11, direct_phone),
            direct_email = COALESCE($12, direct_email),
            owner_name = COALESCE($13, owner_name),
            raw = $14::jsonb,
            hidden = CASE WHEN $15::boolean THEN true WHEN $17::boolean THEN false ELSE hidden END,
            hide_reason = CASE WHEN $15::boolean THEN $16 WHEN $17::boolean THEN '' ELSE hide_reason END,
            street_address = COALESCE(NULLIF($18,''), street_address),
            last_seen_at = now(), updated_at = now()
           WHERE id = $1`,
          [
            o.id,
            rec.listing_url,
            rec.canonical_key,
            j(uniq([...(Array.isArray(o.source_urls) ? o.source_urls : []), ...rec.source_urls])),
            j(uniq([...(Array.isArray(o.source_ids) ? o.source_ids : []), ...rec.source_ids])),
            j(rec.photo_urls?.length ? rec.photo_urls : (o.photo_urls || [])),
            rec.municipality || '',
            rec.property_name || '',
            rec.rooms_estimated,
            rec.description_de || '',
            rec.direct_phone,
            rec.direct_email,
            rec.owner_name,
            j({ ...nextRaw, ...(sanitized.notes.length || sanitized.hardReason ? { write_time_quality: { notes: sanitized.notes, hardReason: sanitized.hardReason, rules: REPAIR_RULES_VERSION } } : {}) }),
            Boolean(sanitized.hardReason), sanitized.hardReason || '', recoverAutomaticHide, rec.street_address || '',
          ],
        );
        return 'updated';
      }
      await p.query(`INSERT INTO immofinder_listings (listing_type, canonical_key, source_urls, source_ids, listing_url, photo_urls, municipality, property_name, rooms_text, rooms_estimated, rooms_basis,
        description_de, description_ru, title_ru, owner_name, direct_phone, direct_email, contact_evidence, contact_status, contact_advice, private_signals, draft_message_de, raw, hidden, hide_reason, street_address)
        VALUES ($23,$1,$2::jsonb,$3::jsonb,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19,$20::jsonb,$21,$22::jsonb,$24,$25,$26)`,
        [rec.canonical_key, j(rec.source_urls), j(rec.source_ids), rec.listing_url, j(rec.photo_urls), rec.municipality, rec.property_name, rec.rooms_text, rec.rooms_estimated, rec.rooms_basis,
          rec.description_de, rec.description_ru, rec.title_ru, rec.owner_name, rec.direct_phone, rec.direct_email, j(rec.contact_evidence), rec.contact_status, rec.contact_advice, j(rec.private_signals), rec.draft_message_de, j(rec.raw), rec.listing_type, Boolean(sanitized.hardReason), sanitized.hardReason || '', rec.street_address || '']);
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
  const cfg = loadImmoConfig();
  for (const row of r.rows) {
    const title = String(row.property_name || '');
    const url = String(row.listing_url || '');
    const prevRaw = row.raw && typeof row.raw === 'object' && !Array.isArray(row.raw) ? row.raw as Record<string, unknown> : {};
    const text = String(prevRaw.evidence_text || row.description_de || '');
    const hay = `${title}\n${text}`;
    const evidenceText = buildEvidenceText(title, text, 4000);
    const evidenceKind = (prevRaw.evidence_kind as 'page_text' | 'snippet' | 'link_only') || (text.length >= 80 ? 'page_text' : 'snippet');

    let why: string | null = nonListingReason(title, url);
    if (!why && !isSpecificLink(url) && /facebook\.com|tutti\.ch|flatfox|icasa|homegate|booking\.com|ferienhausmiete|happyholiday|traum-ferienwohnungen|gruppenhaus|cozycozy|rentola/i.test(url)) {
      why = 'list_or_search_page';
    }
    if (!why && clearOutOfCantonRegion(hay)) why = 'foreign_region';
    const rooms = Number(row.rooms_estimated);
    if (!why && Number.isFinite(rooms) && rooms >= 12) why = 'rooms_too_many';
    if (!why) {
      why = credibilityRejectReason({
        title,
        evidenceText,
        url,
        municipality: row.municipality || null,
        roomsEstimated: Number.isFinite(rooms) ? rooms : null,
        price: resolveListingPrice(evidenceText, null) || parsePrice(evidenceText),
        phone: row.direct_phone || null,
        email: row.direct_email || null,
        evidenceKind,
        municipalities: cfg.municipalities || [],
        allowSnippet: true,
      });
    }

    if (why) {
      try { console.log(formatHideLog({ reason: why, host: '', title: title, url })); } catch { /* diag */ }
      await p.query('UPDATE immofinder_listings SET hidden = true, hide_reason = $2, updated_at = now() WHERE id = $1', [row.id, why]);
      hidden++;
      continue;
    }
    // Strip junk platform contacts in place
    if (isPlatformOrJunkContact(row.direct_email, row.direct_phone)) {
      await p.query(
        `UPDATE immofinder_listings SET direct_email = CASE WHEN $2 THEN NULL ELSE direct_email END,
          direct_phone = CASE WHEN $3 THEN NULL ELSE direct_phone END, updated_at = now() WHERE id = $1`,
        [row.id, isPlatformOrJunkContact(row.direct_email, null), isPlatformOrJunkContact(null, row.direct_phone)],
      );
    }

    const price = resolveListingPrice(hay, null) || parsePrice(hay);
    if (!price || !(price.amount >= 400)) continue;

    const prevRawPrice = prevRaw;
    const prevPrice = prevRawPrice.price && typeof prevRawPrice.price === 'object' ? prevRawPrice.price as any : {};
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
    const nextRaw = { ...prevRawPrice, price: nextPrice, evidence_text: prevRawPrice.evidence_text || evidenceText, evidence_kind: prevRawPrice.evidence_kind || evidenceKind };
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
/** Hard-delete one listing by id and clear its URL-level seen-cache entries so a later search can re-evaluate it. */
export async function deleteListing(id: string): Promise<boolean> {
  const p = await getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      'SELECT listing_url, source_urls FROM immofinder_listings WHERE id = $1 FOR UPDATE',
      [id],
    );
    const row = found.rows[0];
    if (!row) { await client.query('ROLLBACK'); return false; }
    const sources = Array.isArray(row.source_urls)
      ? row.source_urls
      : (() => { try { const v = JSON.parse(String(row.source_urls || '[]')); return Array.isArray(v) ? v : []; } catch { return []; } })();
    const urls = [...new Set([row.listing_url, ...sources].map((u) => String(u || '').trim()).filter(Boolean))];
    const deleted = await client.query('DELETE FROM immofinder_listings WHERE id = $1 RETURNING id', [id]);
    if (urls.length) await client.query('DELETE FROM immofinder_seen WHERE url = ANY($1::text[])', [urls]);
    await client.query('COMMIT');
    return (deleted.rowCount ?? 0) > 0;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* preserve original failure */ }
    throw error;
  } finally {
    client.release();
  }
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
