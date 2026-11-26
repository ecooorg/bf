import { getPool } from './database.ts';
import { buildRunQualityAudit } from './immofinder/taxonomy.ts';

/** Durable, per-run search diagnostics. GitHub Actions polls this store; Render needs no GitHub write token. */
export async function persistImmoFinderRunDiagnostics(runId: string, report: Record<string, unknown>): Promise<void> {
  const id = String(runId || '').slice(0, 100);
  if (!id) throw new Error('immofinder_diagnostics_run_id_required');
  const pool = await getPool();
  const completedAt = String(report.generatedAt || new Date().toISOString());
  // C131 R7/R9: closed reject codes, reject sample and source-yield evidence ride along with every report.
  // Advisory data only: a failure here must never prevent the diagnostics from being stored.
  try {
    const prior = await pool.query('SELECT report FROM immofinder_run_diagnostics WHERE run_id <> $1 ORDER BY completed_at DESC, run_id DESC LIMIT 4', [id]);
    const priorStats = (prior.rows || []).map((row: { report: unknown }) => {
      const rep = (typeof row.report === 'string' ? JSON.parse(row.report) : row.report) as { result?: { sourceStats?: unknown } } | null;
      return (rep?.result?.sourceStats as never) || null;
    });
    report = { ...report, qualityAudit: buildRunQualityAudit(id, report.result as Record<string, unknown> | null, priorStats) };
  } catch { /* audit block is optional */ }
  await pool.query(
    'INSERT INTO immofinder_run_diagnostics (run_id, completed_at, report) VALUES ($1, $2::timestamptz, $3::jsonb) ON CONFLICT (run_id) DO UPDATE SET completed_at = EXCLUDED.completed_at, report = EXCLUDED.report',
    [id, completedAt, JSON.stringify(report)],
  );
  // Keep a bounded history in the live database; GitHub keeps the long-term run archive.
  await pool.query('DELETE FROM immofinder_run_diagnostics WHERE run_id IN (SELECT run_id FROM immofinder_run_diagnostics ORDER BY completed_at DESC, run_id DESC OFFSET 100)');
}

export async function latestImmoFinderRunDiagnostics(): Promise<{ report: Record<string, unknown>; completedAt: string } | null> {
  const pool = await getPool();
  const result = await pool.query('SELECT report, completed_at FROM immofinder_run_diagnostics ORDER BY completed_at DESC, run_id DESC LIMIT 1');
  const row = result.rows[0];
  if (!row) return null;
  const report = typeof row.report === 'string' ? JSON.parse(row.report) : row.report;
  return { report, completedAt: new Date(row.completed_at).toISOString() };
}
