/** P92: bounded, sanitized Project Mode operation evidence. Never store user content. */
import crypto from 'node:crypto';
import JSZip from 'jszip';
import fs from 'node:fs';
import path from 'node:path';
import { getPool } from './database.ts';
import { redactSecrets } from './redact.ts';
import { verifyArtifact } from './artifactRepository.ts';
import { APP_VERSION } from '../src/config.ts';

// Real server console output, redacted, bounded. Without this the export has nothing but operation events.
const consoleLines: string[] = [];
const MAX_LINES = 500;
let captureInstalled = false;
export function installLogCapture(): void {
  if (captureInstalled) return; captureInstalled = true;
  for (const level of ['log', 'info', 'warn', 'error'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      try {
        const text = args.map((a) => typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()).join(' ');
        consoleLines.push(`${new Date().toISOString()} [${level}] ${redactSecrets(text).slice(0, 500)}`);
        if (consoleLines.length > MAX_LINES) consoleLines.splice(0, consoleLines.length - MAX_LINES);
      } catch { /* capture must never break logging */ }
      original(...args);
    };
  }
}
export const capturedConsole = () => consoleLines.slice();
/** Commit of the running build. Render sets RENDER_GIT_COMMIT, Railway RAILWAY_GIT_COMMIT_SHA; 'unknown' if none is provided. */
/** Exact release label = first "## P…" heading of CHANGELOG.md (newest first); null if the file is not deployed. */
export function releaseLabel(file = path.resolve(process.cwd(), 'CHANGELOG.md')): string | null {
  try { const m = fs.readFileSync(file, 'utf8').match(/^## (P\d+(?:\.\d+)*)\b/m); return m ? m[1] : null; } catch { return null; }
}
export const buildCommit = (env: NodeJS.ProcessEnv = process.env): string => (env.RENDER_GIT_COMMIT || env.RAILWAY_GIT_COMMIT_SHA || env.GIT_COMMIT || 'unknown').slice(0, 7);


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
  catch (error) { dbWriteFailures++; if (dbWriteFailures === 1 || dbWriteFailures % 100 === 0) console.error(JSON.stringify({ type: 'project_diagnostic_db_write_failed', failures: dbWriteFailures, message: String((error as Error)?.message || error).slice(0, 160) })); /* in-memory fallback survives a temporarily unavailable DB within this process */ }
}
let dbWriteFailures = 0;
export const diagnosticDbWriteFailures = () => dbWriteFailures;
/** Correlate a stored artifact with the operation that produced it (project_diagnostic_artifacts, migration 016). Returns false on failure; never throws. */
export async function linkDiagnosticArtifact(operationId: string, artifactId: string): Promise<boolean> {
  try { const pool = await getPool(); await pool.query('INSERT INTO project_diagnostic_artifacts (artifact_id, operation_id) VALUES ($1,$2) ON CONFLICT (artifact_id) DO UPDATE SET operation_id = EXCLUDED.operation_id', [artifactId, operationId]); return true; }
  catch { return false; }
}
export async function artifactOperation(artifactId: string): Promise<string | null> {
  try { const pool = await getPool(); const r = await pool.query('SELECT operation_id FROM project_diagnostic_artifacts WHERE artifact_id=$1', [artifactId]); return r.rows[0]?.operation_id ?? null; } catch { return null; }
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
    try {
      const applied = (await pool.query('SELECT version FROM schema_migrations ORDER BY version')).rows.map((r: any) => r.version as string);
      const dir = path.resolve(process.cwd(), 'migrations');
      const onDisk = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.sql')) : [];
      const pending = onDisk.filter((f) => !applied.includes(f) && !applied.includes(f.replace(/\.sql$/, '')));
      checks.push({ name: 'migrations', status: onDisk.length === 0 ? 'WARN' : pending.length ? 'FAIL' : 'PASS', evidence: `${applied.length} applied, ${onDisk.length} on disk${pending.length ? `; pending: ${pending.join(', ')}` : ''}` });
    } catch (e) { checks.push({ name: 'migrations', status: 'FAIL', evidence: `schema_migrations query failed: ${String((e as Error).message).slice(0, 120)}` }); }
    try {
      const last = await pool.query('SELECT artifact_id, version FROM artifacts ORDER BY created_at DESC LIMIT 1');
      const row = last.rows[0];
      const ix = checks.findIndex((c) => c.name === 'artifact-storage');
      const entry = !row ? { name: 'artifact-storage', status: 'NOT RUN', evidence: 'No stored artifacts yet to verify (read-only check; nothing is written).' }
        : await (async () => { const v = await verifyArtifact(row.artifact_id, row.version); return v?.ok ? { name: 'artifact-storage', status: 'PASS', evidence: `Latest artifact ${row.artifact_id} v${row.version} re-read and hash-verified` } : { name: 'artifact-storage', status: 'FAIL', evidence: `Latest artifact ${row.artifact_id} failed verification: ${JSON.stringify(v?.problems ?? 'not found').slice(0, 160)}` }; })();
      checks[ix] = entry;
    } catch (e) { /* keep NOT RUN with explicit reason below */ const ix = checks.findIndex((c) => c.name === 'artifact-storage'); checks[ix] = { name: 'artifact-storage', status: 'FAIL', evidence: `artifact check errored: ${String((e as Error).message).slice(0, 120)}` }; }
    checks.push({ name: 'diagnostic-event-schema', status: result.rows[0]?.table_name ? 'PASS' : 'FAIL', evidence: 'project_diagnostic_events table lookup' });
  } catch { checks.push({ name: 'database-connectivity', status: 'FAIL', evidence: 'Database query failed; operations use process-local fallback.' }); }
  return { timestamp: new Date().toISOString(), runtime: { appVersion: APP_VERSION, release: releaseLabel(), commit: buildCommit(), node: process.version, uptimeSec: Math.round(process.uptime()), rssMb: Math.round(process.memoryUsage().rss / 1048576), capturedConsoleLines: consoleLines.length }, checks, overall: checks.some(c => c.status === 'FAIL') ? 'FAIL' : checks.some(c => c.status !== 'PASS') ? 'WARN' : 'PASS' };
}
export const REQUIRED_DIAGNOSTIC_ENTRIES = ['logs/server-console.log', 'README.txt', 'manifest.json', 'operations/recent-operations.json', 'diagnostics/diagnostic-summary.json', 'logs/application.jsonl'];
/** Reads the ZIP back independently (CRC on) and compares every entry with the hash recorded in its manifest. Returns problems; empty = intact. */
export async function verifyDiagnosticArchive(buf: Buffer): Promise<string[]> {
  const problems: string[] = [];
  if (!buf.length) return ['archive is empty'];
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(buf, { checkCRC32: true }); } catch (e) { return [`archive unreadable: ${(e as Error).message}`]; }
  for (const name of REQUIRED_DIAGNOSTIC_ENTRIES) if (!zip.file(name)) problems.push(`missing entry ${name}`);
  const mf = zip.file('manifest.json');
  if (!mf) return problems;
  try {
    const manifest = JSON.parse(await mf.async('string'));
    for (const e of manifest.entries ?? []) {
      const f = zip.file(e.path);
      if (!f) { problems.push(`manifest lists missing file ${e.path}`); continue; }
      const bytes = await f.async('nodebuffer');
      if (bytes.length !== e.bytes || crypto.createHash('sha256').update(bytes).digest('hex') !== e.sha256) problems.push(`hash mismatch ${e.path}`);
    }
  } catch { problems.push('manifest.json unreadable'); }
  return problems;
}
export async function diagnosticArchive(operationId?: string): Promise<Buffer> {
  const [operations, summary] = await Promise.all([recentDiagnostics(200), systemDiagnostics()]);
  const zip = new JSZip(); const entries: { path: string; bytes: number; sha256: string }[] = [];
  function add(path: string, text: string) { const bytes = Buffer.from(text); zip.file(path, bytes); entries.push({ path, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') }); }
  add('README.txt', 'BiForge Project Mode diagnostics. No prompts, source code, credentials or cookies are exported. Operation history is bounded to 200 events; logs/server-console.log holds the last 500 redacted console lines since the last server start. DB events persist until retention cleanup; memory fallback is process-local. HTTP response completion does not prove browser download.\n');
  add('operations/recent-operations.json', JSON.stringify(operations, null, 2));
  add('diagnostics/diagnostic-summary.json', JSON.stringify(summary, null, 2));
  add('logs/server-console.log', (consoleLines.length ? consoleLines.join('\n') : '(no console output captured since the last server start)') + '\n');
  add('logs/application.jsonl', operations.events.map(e => JSON.stringify(e)).join('\n') + '\n');
  const skipped = [
    ...(operations.source !== 'database' ? [{ item: 'persistent operation history', reason: 'database unavailable; only process-local events since last restart are included' }] : []),
    ...summary.checks.filter((c) => c.status !== 'PASS').map((c) => ({ item: `check:${c.name}`, reason: `${c.status}: ${c.evidence}` })),
    { item: 'Render platform logs / CI logs', reason: 'outside the application; CI logs are in the ci-execution-logs workflow artifact' },
    ...(consoleLines.length === 0 ? [{ item: 'logs/server-console.log', reason: 'server produced no console output since the last start (or capture was not installed)' }] : []),
    ...(operations.events.length === 0 ? [{ item: 'operation events', reason: 'no builds, downloads or exports recorded in the retention window' }] : []),
  ];
  add('manifest.json', JSON.stringify({ exportedAt: new Date().toISOString(), operationId: operationId ?? null, entries, source: operations.source, skipped }, null, 2));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/** RFC 6266/5987 safe Content-Disposition: ASCII fallback + UTF-8 filename*. Never throws on non-ASCII names. */
export function contentDisposition(name: string, disposition: 'attachment' | 'inline' = 'attachment'): string {
  const clean = String(name || 'download.bin').replace(/[\u0000-\u001f\u007f"\\\/]/g, '_').trim() || 'download.bin';
  const ascii = clean.replace(/[^\x20-\x7e]/g, '_').replace(/%/g, '_') || 'download.bin';
  const encoded = encodeURIComponent(clean).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
