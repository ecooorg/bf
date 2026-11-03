import { getPool } from './database.ts';

/** Shared model start-rate gate. PostgreSQL coordinates Render instances; a process-local
 * fallback keeps development/test environments usable if the table is not migrated yet. */
const localNext = new Map<string, number>();
const localDaily = new Map<string, { day: string; count: number }>();

export class ModelQueueDeadlineError extends Error {
  readonly waitMs: number;
  constructor(waitMs: number) {
    super(`Model queue wait ${Math.max(0, waitMs)} ms exceeds the remaining request deadline.`);
    this.name = 'ModelQueueDeadlineError';
    this.waitMs = Math.max(0, waitMs);
  }
}

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

async function reserveDatabaseSlot(modelId: string, intervalMs: number, dailyLimit: number, maxWaitMs?: number): Promise<number> {
  const pool = await getPool();
  const result = await pool.query(
    `INSERT INTO model_request_slots (model_id, next_allowed_at, quota_date, requests_today)
     VALUES ($1, now() + ($2::int * interval '1 millisecond'), (now() AT TIME ZONE 'UTC')::date, 1)
     ON CONFLICT (model_id) DO UPDATE SET
       requests_today = CASE WHEN model_request_slots.quota_date < (now() AT TIME ZONE 'UTC')::date THEN 1 ELSE model_request_slots.requests_today + 1 END,
       quota_date = (now() AT TIME ZONE 'UTC')::date,
       next_allowed_at = GREATEST(model_request_slots.next_allowed_at, now()) + ($2::int * interval '1 millisecond'),
       updated_at = now()
     WHERE (model_request_slots.quota_date < (now() AT TIME ZONE 'UTC')::date OR model_request_slots.requests_today < $3)
       AND ($4::int IS NULL OR GREATEST(model_request_slots.next_allowed_at, now()) <= now() + ($4::int * interval '1 millisecond'))
     RETURNING GREATEST(0, EXTRACT(EPOCH FROM (next_allowed_at - ($2::int * interval '1 millisecond') - now())) * 1000)::int AS wait_ms`,
    [modelId, intervalMs, dailyLimit, maxWaitMs === undefined ? null : Math.max(0, Math.floor(maxWaitMs))],
  );
  if (!result.rows.length) {
    const state = await pool.query(
      `SELECT (quota_date < (now() AT TIME ZONE 'UTC')::date OR requests_today < $2) AS quota_available,
        GREATEST(0, EXTRACT(EPOCH FROM (next_allowed_at - now())) * 1000)::int AS wait_ms
       FROM model_request_slots WHERE model_id = $1`, [modelId, dailyLimit],
    );
    if (state.rows.length && !state.rows[0].quota_available) throw new ModelDailyLimitError(modelId, msUntilUtcMidnight());
    const waitMs = state.rows.length ? Math.max(0, Number(state.rows[0].wait_ms) || 0) : 0;
    if (maxWaitMs !== undefined && waitMs > maxWaitMs) throw new ModelQueueDeadlineError(waitMs);
    throw new ModelQueueDeadlineError(waitMs);
  }
  return Math.max(0, Number(result.rows[0]?.wait_ms) || 0);
}

/** Reserves a start slot before a provider call. Waits do not consume model-call budgets. */
export async function waitForModelStart(modelId: string, opts: { signal?: AbortSignal; intervalMs?: number; dailyLimit?: number; maxWaitMs?: number; onWait?: (waitMs: number) => void | Promise<void> } = {}): Promise<number> {
  const intervalMs = Math.max(0, Math.min(60_000, opts.intervalMs ?? minModelIntervalMs(modelId)));
  const dailyLimit = Math.max(1, Math.floor(opts.dailyLimit ?? 1500));
  let waitMs = 0;
  try {
    waitMs = await reserveDatabaseSlot(modelId, intervalMs, dailyLimit, opts.maxWaitMs);
  } catch (error) {
    if (error instanceof ModelDailyLimitError || error instanceof ModelQueueDeadlineError) throw error;
    const now = Date.now();
    const day = utcDay();
    const usage = localDaily.get(modelId);
    if (usage && usage.day === day && usage.count >= dailyLimit) throw new ModelDailyLimitError(modelId, msUntilUtcMidnight());
    const slot = Math.max(now, localNext.get(modelId) ?? now);
    waitMs = Math.max(0, slot - now);
    if (opts.maxWaitMs !== undefined && waitMs > opts.maxWaitMs) throw new ModelQueueDeadlineError(waitMs);
    if (!usage || usage.day !== day) localDaily.set(modelId, { day, count: 1 });
    else usage.count++;
    localNext.set(modelId, slot + intervalMs);
  }
  if (waitMs <= 0) return 0;
  try { await opts.onWait?.(waitMs); } catch { /* UI/diagnostics must not block the request */ }
  if (opts.signal?.aborted) throw new Error('Model wait cancelled');
  // P124.33: always remove the abort listener (timer path or abort path) so shared
  // request signals do not accumulate listeners across many model waits.
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onAbort);
      reject(new Error('Model wait cancelled'));
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      opts.signal?.removeEventListener('abort', onAbort);
      resolve();
    }, waitMs);
    opts.signal?.addEventListener('abort', onAbort, { once: true });
  });
  return waitMs;
}
