import { getPool } from './database.ts';

/** Shared model start-rate gate. PostgreSQL coordinates Render instances; a process-local
 * fallback keeps development/test environments usable if the table is not migrated yet. */
const localNext = new Map<string, number>();
const localDaily = new Map<string, { day: string; count: number }>();

export class ModelDailyLimitError extends Error {
  readonly retryAfterMs: number;
  constructor(modelId: string, retryAfterMs: number) {
    super(`Daily request limit reached for ${modelId}; retry after UTC midnight.`);
    this.name = 'ModelDailyLimitError';
    this.retryAfterMs = Math.max(1_000, retryAfterMs);
  }
}

export function minModelIntervalMs(modelId: string): number {
  const configured = Number(process.env.MODEL_MIN_INTERVAL_MS);
  if (Number.isFinite(configured) && configured >= 0 && process.env.MODEL_MIN_INTERVAL_MS !== undefined) return Math.min(60_000, Math.floor(configured));
  return /flash-lite/i.test(modelId) ? 4_700 : 6_100;
}

function utcDay(now = new Date()): string { return now.toISOString().slice(0, 10); }
function msUntilUtcMidnight(now = new Date()): number {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.max(1_000, next.getTime() - now.getTime());
}

async function reserveDatabaseSlot(modelId: string, intervalMs: number, dailyLimit: number): Promise<number> {
  const pool = await getPool();
  const result = await pool.query(
    `INSERT INTO model_request_slots (model_id, next_allowed_at, quota_date, requests_today)
     VALUES ($1, now() + ($2::int * interval '1 millisecond'), (now() AT TIME ZONE 'UTC')::date, 1)
     ON CONFLICT (model_id) DO UPDATE SET
       requests_today = CASE WHEN model_request_slots.quota_date < (now() AT TIME ZONE 'UTC')::date THEN 1 ELSE model_request_slots.requests_today + 1 END,
       quota_date = (now() AT TIME ZONE 'UTC')::date,
       next_allowed_at = GREATEST(model_request_slots.next_allowed_at, now()) + ($2::int * interval '1 millisecond'),
       updated_at = now()
     WHERE model_request_slots.quota_date < (now() AT TIME ZONE 'UTC')::date OR model_request_slots.requests_today < $3
     RETURNING GREATEST(0, EXTRACT(EPOCH FROM (next_allowed_at - ($2::int * interval '1 millisecond') - now())) * 1000)::int AS wait_ms`,
    [modelId, intervalMs, dailyLimit],
  );
  if (!result.rows.length) throw new ModelDailyLimitError(modelId, msUntilUtcMidnight());
  return Math.max(0, Number(result.rows[0]?.wait_ms) || 0);
}

/** Reserves a start slot before a provider call. Waits do not consume model-call budgets. */
export async function waitForModelStart(modelId: string, opts: { signal?: AbortSignal; intervalMs?: number; dailyLimit?: number; onWait?: (waitMs: number) => void | Promise<void> } = {}): Promise<number> {
  const intervalMs = Math.max(0, Math.min(60_000, opts.intervalMs ?? minModelIntervalMs(modelId)));
  const dailyLimit = Math.max(1, Math.floor(opts.dailyLimit ?? 1500));
  let waitMs = 0;
  try {
    waitMs = await reserveDatabaseSlot(modelId, intervalMs, dailyLimit);
  } catch (error) {
    if (error instanceof ModelDailyLimitError) throw error;
    const now = Date.now();
    const day = utcDay();
    const usage = localDaily.get(modelId);
    if (!usage || usage.day !== day) localDaily.set(modelId, { day, count: 1 });
    else if (usage.count >= dailyLimit) throw new ModelDailyLimitError(modelId, msUntilUtcMidnight());
    else usage.count++;
    const slot = Math.max(now, localNext.get(modelId) ?? now);
    waitMs = Math.max(0, slot - now);
    localNext.set(modelId, slot + intervalMs);
  }
  if (waitMs <= 0) return 0;
  try { await opts.onWait?.(waitMs); } catch { /* UI/diagnostics must not block the request */ }
  if (opts.signal?.aborted) throw new Error('Model wait cancelled');
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { opts.signal?.removeEventListener('abort', onAbort); resolve(); }, waitMs);
    const onAbort = () => { clearTimeout(timer); reject(new Error('Model wait cancelled')); };
    opts.signal?.addEventListener('abort', onAbort, { once: true });
  });
  return waitMs;
}
