import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './database.ts';
import type { ImmoConfig } from './immofinderCore.ts';
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
    async upsert(rec: ListingRecord) {
      const p = await getPool();
      const ex = await p.query('SELECT id, source_urls, source_ids, photo_urls, direct_phone, direct_email, owner_name FROM immofinder_listings WHERE canonical_key = $1', [rec.canonical_key]);
      if (ex.rows[0]) {
        const o = ex.rows[0]; const uniq = (a: unknown[]) => [...new Set(a)];
        await p.query(`UPDATE immofinder_listings SET source_urls = $2::jsonb, source_ids = $3::jsonb, photo_urls = $4::jsonb, last_seen_at = now(), updated_at = now(),
          direct_phone = COALESCE(direct_phone, $5), direct_email = COALESCE(direct_email, $6), owner_name = COALESCE(owner_name, $7) WHERE id = $1`,
          [o.id, j(uniq([...o.source_urls, ...rec.source_urls])), j(uniq([...o.source_ids, ...rec.source_ids])), j(o.photo_urls?.length ? o.photo_urls : rec.photo_urls), rec.direct_phone, rec.direct_email, rec.owner_name]);
        return 'updated';
      }
      await p.query(`INSERT INTO immofinder_listings (canonical_key, source_urls, source_ids, listing_url, photo_urls, municipality, property_name, rooms_text, rooms_estimated, rooms_basis,
        description_de, description_ru, title_ru, owner_name, direct_phone, direct_email, contact_evidence, contact_status, contact_advice, private_signals, draft_message_de, raw)
        VALUES ($1,$2::jsonb,$3::jsonb,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19,$20::jsonb,$21,$22::jsonb)`,
        [rec.canonical_key, j(rec.source_urls), j(rec.source_ids), rec.listing_url, j(rec.photo_urls), rec.municipality, rec.property_name, rec.rooms_text, rec.rooms_estimated, rec.rooms_basis,
          rec.description_de, rec.description_ru, rec.title_ru, rec.owner_name, rec.direct_phone, rec.direct_email, j(rec.contact_evidence), rec.contact_status, rec.contact_advice, j(rec.private_signals), rec.draft_message_de, j(rec.raw)]);
      return 'new';
    },
  };
}

export async function listListings(status: string | null) {
  const p = await getPool();
  const r = await p.query(`SELECT * FROM immofinder_listings WHERE ($1::text IS NULL OR status = $1) ORDER BY (status = 'NEW') DESC, last_seen_at DESC LIMIT 200`, [status]);
  return r.rows;
}
export async function setStatus(id: string, status: string): Promise<boolean> {
  const p = await getPool();
  const r = await p.query('UPDATE immofinder_listings SET status = $2, updated_at = now() WHERE id = $1', [id, status]);
  return r.rowCount > 0;
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
    [id, j({ ...(res?.counts ?? {}), filtered: res?.filtered ?? {} }), j(errors), res?.estCostUsd ?? 0, j(delivery), j(res?.preview.slice(0, 60) ?? [])]);
}
export async function latestRun() {
  const p = await getPool();
  return (await p.query('SELECT * FROM immofinder_runs ORDER BY started_at DESC LIMIT 1')).rows[0] ?? null;
}
