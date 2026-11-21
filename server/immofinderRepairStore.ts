import fs from 'node:fs';
import path from 'node:path';
import { getPool } from './database.ts';
import { loadImmoConfig } from './immofinderStore.ts';
import {
  ctxFromConfig, parseRepairFile, planAutoOps, previewOps, repairQueue, snapshotJsonl, snapshotMeta,
  evaluateOp, validateOps, type RepairBatch, type RepairOp, type RowPatch,
} from './immofinderRepair.ts';

const HISTORY_LIMIT = 100;

export async function exportRepairSnapshot() {
  const p = await getPool();
  const q = await p.query('SELECT * FROM immofinder_listings ORDER BY first_seen_at, id');
  const rows = q.rows;
  const ctx = ctxFromConfig(loadImmoConfig());
  const h = await p.query(`SELECT batch_id, kind, applied_at, summary FROM immofinder_repair_batches ORDER BY applied_at DESC LIMIT ${HISTORY_LIMIT}`);
  const history = h.rows.map((r: any) => ({ batchId: r.batch_id, kind: r.kind, appliedAt: new Date(r.applied_at).toISOString(), summary: r.summary }));
  const jsonl = snapshotJsonl(rows, ctx, { redact: false });
  const meta = snapshotMeta(rows, ctx, history, { redact: false });
  const snapshotId = `${meta.generatedAt}:${rows.length}`;
  return { jsonl, queue: repairQueue(rows, ctx), meta: { ...meta, snapshotId }, rows: rows.length };
}

export async function previewRepairOps(input: unknown, source = 'assistant') {
  const parsed = Array.isArray(input) ? validateOps(input) : (() => {
    const p = parseRepairFile(JSON.stringify(input));
    return { ops: p.batches.flatMap((b) => b.ops), issues: p.issues.map((error) => ({ index: -1, error })) };
  })();
  const p = await getPool();
  const rows = (await p.query('SELECT * FROM immofinder_listings ORDER BY id')).rows;
  const ctx = ctxFromConfig(loadImmoConfig());
  const batchId = `preview-${Date.now()}`;
  const preview = previewOps(parsed.ops, rows, ctx, { source, batchId });
  return { valid: parsed.issues.length === 0, issues: parsed.issues, ...preview };
}

export async function applyRepairBatch(batch: RepairBatch, source = 'assistant') {
  const p = await getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const lock = await client.query(
      `INSERT INTO immofinder_repair_batches (batch_id, kind, summary) VALUES ($1,$2,'{}'::jsonb)
       ON CONFLICT (batch_id) DO NOTHING RETURNING batch_id`, [batch.batchId, source],
    );
    if (!lock.rowCount) {
      const old = await client.query('SELECT summary FROM immofinder_repair_batches WHERE batch_id=$1', [batch.batchId]);
      await client.query('COMMIT');
      return { applied: false, duplicate: true, summary: old.rows[0]?.summary || {} };
    }
    const ctx = ctxFromConfig(loadImmoConfig());
    const summary: Record<string, number> = { applied: 0, unchanged: 0, rejected: 0, not_found: 0 };
    const results = [];
    for (const op of batch.ops) {
      const found = await client.query('SELECT * FROM immofinder_listings WHERE id=$1 FOR UPDATE', [op.id]);
      const result = evaluateOp(op, found.rows[0], ctx, { source, batchId: batch.batchId });
      results.push(result); summary[result.status]++;
      if (result.status !== 'applied' || !result.patch) continue;
      const patch = result.patch as RowPatch;
      if (patch.delete) {
        await client.query('DELETE FROM immofinder_listings WHERE id=$1', [op.id]);
      } else {
        const sets: string[] = []; const vals: unknown[] = [op.id];
        const put = (column: string, value: unknown) => { vals.push(value); sets.push(`${column}=$${vals.length}`); };
        if (patch.hidden !== undefined) put('hidden', patch.hidden);
        if (patch.hide_reason !== undefined) put('hide_reason', patch.hide_reason || '');
        if (patch.direct_phone !== undefined) put('direct_phone', patch.direct_phone);
        if (patch.direct_email !== undefined) put('direct_email', patch.direct_email);
        if (patch.contact_status !== undefined) put('contact_status', patch.contact_status);
        if (patch.raw !== undefined) put('raw', JSON.stringify(patch.raw));
        if (sets.length) await client.query(`UPDATE immofinder_listings SET ${sets.join(', ')}, updated_at=now() WHERE id=$1`, vals);
      }
      await client.query(
        `INSERT INTO immofinder_repair_events (batch_id, listing_id, op, reason, status, detail, before_state, after_state)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)`,
        [batch.batchId, op.id, op.op, op.reason, result.status, result.detail || null, JSON.stringify(result.before || {}), JSON.stringify(result.after || {})],
      );
    }
    await client.query('UPDATE immofinder_repair_batches SET summary=$2::jsonb, applied_at=now() WHERE batch_id=$1', [batch.batchId, JSON.stringify(summary)]);
    await client.query('COMMIT');
    return { applied: true, duplicate: false, summary, results };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
}

/** Deterministic automatic audit over every visible and hidden row; hidden rows remain recoverable. */
export async function runAutomaticRepairAudit() {
  const p = await getPool();
  const rows = (await p.query('SELECT * FROM immofinder_listings ORDER BY id')).rows;
  const ctx = ctxFromConfig(loadImmoConfig());
  const { ops } = planAutoOps(rows, ctx);
  const batchId = `auto-${(await p.query("SELECT md5(current_database() || ':' || COALESCE(max(updated_at)::text,'')) AS h FROM immofinder_listings")).rows[0].h}`;
  return applyRepairBatch({ batchId, generatedAt: new Date().toISOString(), ops }, 'automatic_rules');
}


/**
 * A repair patch may ship data/immofinder/repair-ops.json beside code.
 * Applying that repository patch is the user's approval to apply its whitelisted batches;
 * each batch remains transactionally idempotent in the database.
 */
export async function applyBundledRepairBatches() {
  const file = path.resolve(process.cwd(), 'data/immofinder/repair-ops.json');
  if (!fs.existsSync(file)) return { bundled: false, reason: 'no_repair_file' };
  const parsed = parseRepairFile(fs.readFileSync(file, 'utf8'));
  if (parsed.issues.length) throw new Error(`Bundled repair file rejected: ${parsed.issues.slice(0, 8).join('; ')}`);
  if (!parsed.batches.length) throw new Error('Bundled repair file contains no batches');
  const results = [];
  for (const batch of parsed.batches) results.push(await applyRepairBatch(batch, 'assistant_patch_bundle'));
  return { bundled: true, batches: results.length, results };
}
