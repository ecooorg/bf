/** P92: bounded, sanitized Project Mode operation evidence. Never store user content. */
import crypto from 'node:crypto';
import JSZip from 'jszip';
import { getPool } from './database.ts';

export type DiagnosticEvent = { timestamp: string; operationId: string; event: string; stage: string; status: string; durationMs?: number; bytes?: number; fileCount?: number; errorCode?: string };
const memory: DiagnosticEvent[] = [];
const MAX_MEMORY = 1000;
const token = /^[a-zA-Z0-9_.:-]{1,90}$/;
const safe = (value: string) => token.test(value) ? value : 'REDACTED';
export const newOperationId = () => crypto.randomUUID();
export async function recordDiagnostic(value: Omit<DiagnosticEvent, 'timestamp'>): Promise<void> {
  const event: DiagnosticEvent = { timestamp: new Date().toISOString(), operationId: safe(value.operationId), event: safe(value.event), stage: safe(value.stage), status: safe(value.status) };
  for (const key of ['durationMs', 'bytes', 'fileCount'] as const) if (Number.isSafeInteger(value[key]) && (value[key] as number) >= 0) event[key] = value[key];
  if (value.errorCode) event.errorCode = safe(value.errorCode);
  memory.push(event); if (memory.length > MAX_MEMORY) memory.splice(0, memory.length - MAX_MEMORY);
  try { const pool = await getPool(); await pool.query('INSERT INTO project_diagnostic_events (operation_id,event,stage,status,duration_ms,bytes,file_count,error_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [event.operationId,event.event,event.stage,event.status,event.durationMs ?? null,event.bytes ?? null,event.fileCount ?? null,event.errorCode ?? null]); }
  catch { /* in-memory fallback survives a temporarily unavailable DB within this process */ }
}
export async function recentDiagnostics(limit = 100): Promise<{ events: DiagnosticEvent[]; source: string }> {
  const n = Math.min(200, Math.max(1, Math.trunc(limit)));
  try {
    const pool = await getPool();
    const result = await pool.query('SELECT occurred_at AS timestamp,operation_id AS "operationId",event,stage,status,duration_ms AS "durationMs",bytes,file_count AS "fileCount",error_code AS "errorCode" FROM project_diagnostic_events ORDER BY id DESC LIMIT $1', [n]);
    return { events: result.rows.map((r: any) => ({ ...r, timestamp: new Date(r.timestamp).toISOString() })), source: 'database' };
  } catch { return { events: memory.slice(-n).reverse(), source: 'memory-fallback' }; }
}
export async function systemDiagnostics() {
  const checks: { name: string; status: string; evidence: string }[] = [];
  checks.push({ name: 'project-mode', status: process.env.ENABLE_PROJECT_MODE === 'true' ? 'PASS' : 'WARN', evidence: 'ENABLE_PROJECT_MODE configuration' });
  checks.push({ name: 'artifact-storage', status: 'NOT RUN', evidence: 'Read/write integrity is checked during individual builds; no synthetic artifact is written.' });
  try {
    const pool = await getPool(); await pool.query('SELECT 1');
    checks.push({ name: 'database-connectivity', status: 'PASS', evidence: 'SELECT 1 completed' });
    const result = await pool.query("SELECT to_regclass('public.project_diagnostic_events') AS table_name");
    checks.push({ name: 'diagnostic-event-schema', status: result.rows[0]?.table_name ? 'PASS' : 'FAIL', evidence: 'project_diagnostic_events table lookup' });
  } catch { checks.push({ name: 'database-connectivity', status: 'FAIL', evidence: 'Database query failed; operations use process-local fallback.' }); }
  return { timestamp: new Date().toISOString(), checks, overall: checks.some(c => c.status === 'FAIL') ? 'FAIL' : checks.some(c => c.status !== 'PASS') ? 'WARN' : 'PASS' };
}
export async function diagnosticArchive(): Promise<Buffer> {
  const [operations, summary] = await Promise.all([recentDiagnostics(200), systemDiagnostics()]);
  const zip = new JSZip(); const entries: { path: string; bytes: number; sha256: string }[] = [];
  function add(path: string, text: string) { const bytes = Buffer.from(text); zip.file(path, bytes); entries.push({ path, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') }); }
  add('README.txt', 'BiForge Project Mode diagnostics. No prompts, source code, credentials or cookies are exported. Operation history is bounded to 200 events. DB events persist until retention cleanup; memory fallback is process-local. HTTP response completion does not prove browser download.\n');
  add('operations/recent-operations.json', JSON.stringify(operations, null, 2));
  add('diagnostics/diagnostic-summary.json', JSON.stringify(summary, null, 2));
  add('logs/application.jsonl', operations.events.map(e => JSON.stringify(e)).join('\n') + '\n');
  add('manifest.json', JSON.stringify({ exportedAt: new Date().toISOString(), entries, source: operations.source }, null, 2));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
