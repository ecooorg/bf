/** P92: bounded, sanitized Project Mode operation evidence. Never store user content. */
import crypto from 'node:crypto';
import JSZip from 'jszip';
import fs from 'node:fs';
import path from 'node:path';
import { getPool } from './database.ts';
import { redactDeep, redactSecrets } from './redact.ts';
import { verifyArtifact } from './artifactRepository.ts';

// Real server console output, redacted, bounded. Without this the export has nothing but operation events.
const consoleLines: string[] = [];
const MAX_LINES = Math.max(500, Math.min(5000, Number(process.env.DIAGNOSTIC_CONSOLE_LINES) || 2000));
const applicationLines: Record<string, unknown>[] = [];
const MAX_APPLICATION_LINES = Math.max(500, Math.min(10000, Number(process.env.DIAGNOSTIC_APPLICATION_LINES) || 3000));
let dbLogUnavailableUntil = 0;
let dbLogWriteFailures = 0;
const REDACTED_DETAIL_KEYS = /prompt|source.?code|authorization|cookie|password|secret|api.?key|token|request.?body|response.?body|content/i;
function sanitizeLogText(value: unknown, max = 1200): string {
  return redactSecrets(String(value ?? '')).replace(/(prompt|systemPrompt|sourceCode|requestBody|responseBody|authorization|cookie|api[_-]?key|token|password|privateKey)\s*[:=]\s*(\"[^\"]*\"|'[^']*'|[^,\s}]+)/gi, '$1=[OMITTED]').replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_KEY]').replace(/Bearer\s+[^\s,]+/gi, 'Bearer [REDACTED]').slice(0, max);
}
function safeDetails(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[DEPTH_LIMIT]';
  if (typeof value === 'string') return sanitizeLogText(value, 1200);
  if (Array.isArray(value)) return value.slice(0, 50).map((x) => safeDetails(x, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 80)) out[key] = REDACTED_DETAIL_KEYS.test(key) ? '[OMITTED]' : safeDetails(item, depth + 1);
    return redactDeep(out);
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  return String(value).slice(0, 200);
}
export type ApplicationLogInput = { level?: 'debug' | 'info' | 'warn' | 'error'; component: string; event: string; message?: string; requestId?: string; operationId?: string; details?: unknown; error?: unknown };
/** Structured privacy-preserving application log. In-memory capture is immediate; DB persistence is best-effort and throttled during DB outages. */
export async function recordApplicationLog(input: ApplicationLogInput): Promise<void> {
  const err = input.error as any;
  const entry: Record<string, unknown> = { timestamp: new Date().toISOString(), level: input.level ?? 'info', component: String(input.component || 'app').slice(0, 80), event: String(input.event || 'event').slice(0, 100), message: sanitizeLogText(input.message ?? err?.message ?? '', 1200), requestId: input.requestId ? String(input.requestId).slice(0, 100) : undefined, operationId: input.operationId ? safe(input.operationId) : undefined, details: safeDetails(input.details ?? {}), ...(err ? { errorName: String(err.name || 'Error').slice(0, 100), errorCode: String(err.code || err.status || '').slice(0, 100), stack: sanitizeLogText(err.stack || '', 5000) } : {}) };
  applicationLines.push(entry); if (applicationLines.length > MAX_APPLICATION_LINES) applicationLines.splice(0, applicationLines.length - MAX_APPLICATION_LINES);
  if (Date.now() < dbLogUnavailableUntil) return;
  try {
    const pool = await getPool();
    await pool.query('INSERT INTO application_diagnostic_logs (occurred_at,level,component,event,message,request_id,operation_id,details,error_name,error_code,stack) VALUES (now(),$1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)', [entry.level, entry.component, entry.event, entry.message, entry.requestId ?? null, entry.operationId ?? null, JSON.stringify(entry.details ?? {}), (entry.errorName as string) ?? null, (entry.errorCode as string) ?? null, (entry.stack as string) ?? null]);
    dbLogUnavailableUntil = 0;
  } catch { dbLogWriteFailures++; dbLogUnavailableUntil = Date.now() + Math.min(60_000, 5_000 * Math.max(1, Math.min(12, dbLogWriteFailures))); }
}
export function capturedApplicationLogs(limit = 1000): Record<string, unknown>[] { return applicationLines.slice(-Math.max(1, Math.min(3000, Math.trunc(limit)))); }
export async function recentApplicationLogs(limit = 1000): Promise<{ logs: Record<string, unknown>[]; source: string; dbWriteFailures: number }> {
  const n = Math.max(1, Math.min(1000, Math.trunc(limit)));
  try {
    const pool = await getPool(); const r = await pool.query('SELECT occurred_at AS timestamp, level, component, event, message, request_id AS "requestId", operation_id AS "operationId", details, error_name AS "errorName", error_code AS "errorCode", stack FROM application_diagnostic_logs ORDER BY id DESC LIMIT $1', [n]);
    const merged = [...r.rows.reverse(), ...capturedApplicationLogs(n)]; const seen = new Set<string>();
    const logs = merged.filter((row: any) => { const key = `${row.timestamp}|${row.component}|${row.event}|${row.requestId ?? ''}|${row.message ?? ''}`; if (seen.has(key)) return false; seen.add(key); return true; }).slice(-n);
    return { logs, source: 'database+memory', dbWriteFailures: dbLogWriteFailures };
  } catch { return { logs: capturedApplicationLogs(n), source: 'memory-fallback', dbWriteFailures: dbLogWriteFailures }; }
}
/** Express request tracing: never logs query strings, headers, cookies or request/response bodies. */
export function requestDiagnosticsMiddleware(req: any, res: any, next: () => void): void {
  const supplied = String(req.headers?.['x-request-id'] ?? '');
  const requestId = /^[a-zA-Z0-9_.:-]{1,80}$/.test(supplied) ? supplied : crypto.randomUUID();
  const started = Date.now(); res.setHeader('x-request-id', requestId);
  res.on('finish', () => {
    const details = { method: String(req.method || '').slice(0, 12), path: String(req.path || '/').split('?')[0].slice(0, 180), statusCode: Number(res.statusCode) || 0, durationMs: Math.max(0, Date.now() - started), responseBytes: Number(res.getHeader('content-length')) || undefined };
    const level = details.statusCode >= 500 ? 'error' : details.statusCode >= 400 ? 'warn' : 'info';
    const entry = { timestamp: new Date().toISOString(), level, component: 'http', event: 'request_complete', requestId, details };
    applicationLines.push(entry); if (applicationLines.length > MAX_APPLICATION_LINES) applicationLines.splice(0, applicationLines.length - MAX_APPLICATION_LINES);
    if (details.statusCode >= 500) void recordApplicationLog({ level: 'error', component: 'http', event: 'request_failed', requestId, message: `HTTP ${details.statusCode} ${details.method} ${details.path}`, details });
  });
  next();
}
let captureInstalled = false;
export function installLogCapture(): void {
  if (captureInstalled) return; captureInstalled = true;
  for (const level of ['log', 'info', 'warn', 'error'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      try {
        const text = args.map((a) => typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()).join(' ');
        const safeText = sanitizeLogText(text, 1200);
        consoleLines.push(`${new Date().toISOString()} [${level}] ${safeText}`);
        if (consoleLines.length > MAX_LINES) consoleLines.splice(0, consoleLines.length - MAX_LINES);
        const structured = { timestamp: new Date().toISOString(), level: level === 'error' || level === 'warn' ? level : 'info', component: 'console', event: 'console_output', message: safeText };
        applicationLines.push(structured); if (applicationLines.length > MAX_APPLICATION_LINES) applicationLines.splice(0, applicationLines.length - MAX_APPLICATION_LINES);
        if (level === 'error' || level === 'warn') void recordApplicationLog({ level, component: 'console', event: 'console_output', message: safeText });
      } catch { /* capture must never break logging */ }
      original(...args);
    };
  }
}
export const capturedConsole = () => consoleLines.slice();
/** Commit of the running build. Render sets RENDER_GIT_COMMIT, Railway RAILWAY_GIT_COMMIT_SHA; 'unknown' if none is provided. */
/** Last applied patch = package.json "patch" (the only version source); null if package.json is unreadable or has no patch. */
export function releaseLabel(file = path.resolve(process.cwd(), 'package.json')): string | null {
  try { const p = JSON.parse(fs.readFileSync(file, 'utf8')).patch; return typeof p === 'string' && p ? p : null; } catch { return null; }
}
export const buildCommit = (env: NodeJS.ProcessEnv = process.env): string => (env.RENDER_GIT_COMMIT || env.RAILWAY_GIT_COMMIT_SHA || env.GIT_COMMIT || 'unknown').slice(0, 7);
function runtimeAppVersion(): string { try { return String(JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')).version || 'unknown'); } catch { return process.env.APP_VERSION || 'unknown'; } }


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
/** Compact, paste-ready report for the latest build session. User prompts and generated source are never included. */
export async function compactSessionLog(): Promise<string> {
  const operations = await recentDiagnostics(200);
  const latest = operations.events.find((e) => !/DIAGNOSTIC_EXPORT|SYSTEM_DIAGNOSTICS/.test(e.event));
  const operationId = latest?.operationId;
  const detailed = await recentApplicationLogs(500);
  const matching = detailed.logs.filter((row: any) => operationId && row.operationId === operationId);
  const events = operationId ? operations.events.filter((e) => e.operationId === operationId).reverse() : [];
  const runtime = await systemDiagnostics();
  const lines = [
    'BIFORGE COMPACT SESSION LOG',
    `exportedAt=${new Date().toISOString()}`,
    `appVersion=${runtime.runtime.appVersion} release=${runtime.runtime.release ?? 'unknown'} commit=${runtime.runtime.commit}`,
    `focusOperationId=${operationId ?? 'NOT_FOUND'}`,
    `operationSource=${operations.source} applicationLogSource=${detailed.source}`,
    `databaseLogWriteFailures=${detailed.dbWriteFailures}`,
    `overallSystemStatus=${runtime.overall}`,
    'SYSTEM_CHECKS:',
    ...runtime.checks.map((c) => `${c.status} ${c.name}: ${sanitizeLogText(c.evidence, 240)}`),
    'OPERATION_TIMELINE:',
    ...(events.length ? events.map((e) => `${e.timestamp} ${e.status} ${e.event} stage=${e.stage} durationMs=${e.durationMs ?? '-'} bytes=${e.bytes ?? '-'} files=${e.fileCount ?? '-'} error=${e.errorCode ?? '-'}`) : ['NO_MATCHING_OPERATION_EVENTS']),
    'APPLICATION_LOGS:',
    ...(matching.length ? matching.slice(-100).map((row: any) => `${row.timestamp} ${String(row.level).toUpperCase()} ${row.component}/${row.event} request=${row.requestId ?? '-'} message=${sanitizeLogText(row.message, 300)} code=${row.errorCode ?? '-'}${row.stack ? ` stack=${sanitizeLogText(row.stack, 700)}` : ''}`) : ['NO_APPLICATION_LOGS_MATCHED_OPERATION']),
    'LIMITS: request/response bodies, prompts, generated source, credentials and cookies are intentionally excluded; browser-side download completion is not observable from server logs.',
  ];
  return lines.join('\n').slice(0, 28000) + '\n';
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
    try { const logs = await pool.query("SELECT to_regclass('public.application_diagnostic_logs') AS table_name"); checks.push({ name: 'application-log-storage', status: logs.rows[0]?.table_name ? 'PASS' : 'FAIL', evidence: `application_diagnostic_logs table ${logs.rows[0]?.table_name ? 'available' : 'missing; apply migration 019_application_diagnostic_logs.sql'}` }); } catch (e) { checks.push({ name: 'application-log-storage', status: 'FAIL', evidence: `application log table check failed: ${String((e as Error).message).slice(0, 120)}` }); }
  } catch { checks.push({ name: 'database-connectivity', status: 'FAIL', evidence: 'Database query failed; operations use process-local fallback.' }); }
  return { timestamp: new Date().toISOString(), runtime: { appVersion: runtimeAppVersion(), release: releaseLabel(), commit: buildCommit(), node: process.version, uptimeSec: Math.round(process.uptime()), rssMb: Math.round(process.memoryUsage().rss / 1048576), capturedConsoleLines: consoleLines.length, capturedApplicationLogs: applicationLines.length, diagnosticDbWriteFailures: dbWriteFailures, applicationLogDbWriteFailures: dbLogWriteFailures }, checks, overall: checks.some(c => c.status === 'FAIL') ? 'FAIL' : checks.some(c => c.status !== 'PASS') ? 'WARN' : 'PASS' };
}
export const REQUIRED_DIAGNOSTIC_ENTRIES = ['logs/server-console.log', 'README.txt', 'manifest.json', 'operations/recent-operations.json', 'diagnostics/diagnostic-summary.json', 'logs/application.jsonl', 'logs/application-detail.jsonl'];
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
export async function diagnosticArchive(operationId?: string, extraFiles: { path: string; text: string }[] = []): Promise<Buffer> {
  const [operations, summary, detailed] = await Promise.all([recentDiagnostics(200), systemDiagnostics(), recentApplicationLogs(1000)]);
  const zip = new JSZip(); const entries: { path: string; bytes: number; sha256: string }[] = [];
  // Always hash the exact UTF-8 bytes that are written into the ZIP so manifest bytes/sha256 match verifyDiagnosticArchive.
  function add(path: string, text: string) {
    const bytes = Buffer.from(text, 'utf8');
    zip.file(path, bytes);
    entries.push({ path, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  }
  add('README.txt', [
    'BiForge diagnostics archive (in-app export).',
    'Audience: AI assistants recovering context after a user-reported failure.',
    'No prompts, source code, credentials or cookies are exported.',
    'Read assistant/ASSISTANT-BRIEF.md and assistant/assistant-context.json first, then diagnostic-summary.json, then logs.',
    'Operation history is bounded; console and application logs are process-local ring buffers plus optional DB history.',
    'HTTP response completion does not prove the browser finished the download.',
    '',
  ].join('\n'));
  add('operations/recent-operations.json', JSON.stringify(operations, null, 2));
  add('diagnostics/diagnostic-summary.json', JSON.stringify(summary, null, 2));
  add('logs/server-console.log', (consoleLines.length ? consoleLines.join('\n') : '(no console output captured since the last server start)') + '\n');
  add('logs/application.jsonl', operations.events.map(e => JSON.stringify(e)).join('\n') + (operations.events.length ? '\n' : ''));
  add('logs/application-detail.jsonl', detailed.logs.map(e => JSON.stringify(e)).join('\n') + (detailed.logs.length ? '\n' : ''));
  for (const f of extraFiles) add(f.path, f.text);

  const failedOps = operations.events.filter((e) => /fail|error|timeout|cancel/i.test(String(e.status || e.event || '')));
  const lastFailed = failedOps[0] || null;
  const lastAny = operations.events[0] || null;
  const nonPassChecks = summary.checks.filter((c) => c.status !== 'PASS');
  const envFlags = {
    NODE_ENV: process.env.NODE_ENV || null,
    ENABLE_PROJECT_MODE: process.env.ENABLE_PROJECT_MODE === 'true',
    ENABLE_WEB_SEARCH: process.env.ENABLE_WEB_SEARCH !== 'false',
    WEB_SEARCH_PROVIDER: process.env.WEB_SEARCH_PROVIDER || null,
    WEB_SEARCH_MODE: process.env.WEB_SEARCH_MODE || null,
    hasGeminiKey: Boolean(String(process.env.GEMINI_API_KEY || '').trim()),
    hasSerperKey: Boolean(String(process.env.SERPER_API_KEY || '').trim()),
    hasDatabaseUrl: Boolean(String(process.env.DATABASE_URL || '').trim()),
    hasAppPassword: Boolean(String(process.env.APP_PASSWORD || '').trim()),
  };
  const provenance = {
    operations: operations.source,
    applicationLogs: detailed.source,
    console: consoleLines.length ? 'process-memory' : 'empty',
  };
  const assistantContext = {
    schemaVersion: 1,
    artifactType: 'in-app-diagnostics-assistant-context',
    exportedAt: new Date().toISOString(),
    focusOperationId: operationId ?? null,
    overall: summary.overall,
    runtime: summary.runtime,
    provenance,
    envFlags,
    lastOperation: lastAny,
    lastFailedOperation: lastFailed,
    recentFailures: failedOps.slice(0, 20),
    nonPassChecks,
    dbWriteFailures: {
      diagnosticEvents: dbWriteFailures,
      applicationLogs: detailed.dbWriteFailures,
    },
    nextActionHints: [
      lastFailed ? `Inspect last failed operation ${lastFailed.operationId} event=${lastFailed.event} stage=${lastFailed.stage} status=${lastFailed.status}` : 'No failed operations in the retention window',
      nonPassChecks.length ? `Non-PASS checks: ${nonPassChecks.map((c) => c.name + '=' + c.status).join(', ')}` : 'All system checks PASS or WARN only',
      provenance.operations !== 'database' ? 'Operation history is process-local only; restart lost older events' : 'Operation history loaded from database',
      provenance.applicationLogs !== 'database' ? 'Application detail logs are process-local only' : 'Application detail logs loaded from database',
    ],
  };
  const briefLines = [
    '# ASSISTANT BRIEF (in-app diagnostics)',
    '',
    `exportedAt: ${assistantContext.exportedAt}`,
    `overall: ${summary.overall}`,
    `appVersion: ${summary.runtime.appVersion} release=${summary.runtime.release || 'null'} commit=${summary.runtime.commit}`,
    `focusOperationId: ${operationId ?? 'null'}`,
    `provenance.operations: ${provenance.operations}`,
    `provenance.applicationLogs: ${provenance.applicationLogs}`,
    `lastOperation: ${lastAny ? `${lastAny.operationId} ${lastAny.event}/${lastAny.stage}=${lastAny.status}` : 'none'}`,
    `lastFailedOperation: ${lastFailed ? `${lastFailed.operationId} ${lastFailed.event}/${lastFailed.stage}=${lastFailed.status} err=${lastFailed.errorCode || ''}` : 'none'}`,
    `nonPassChecks: ${nonPassChecks.length ? nonPassChecks.map((c) => c.name + '=' + c.status).join('; ') : 'none'}`,
    `envFlags: webSearch=${envFlags.ENABLE_WEB_SEARCH} provider=${envFlags.WEB_SEARCH_PROVIDER || 'auto'} projectMode=${envFlags.ENABLE_PROJECT_MODE} db=${envFlags.hasDatabaseUrl} geminiKey=${envFlags.hasGeminiKey} serperKey=${envFlags.hasSerperKey}`,
    '',
    'Next action hints:',
    ...assistantContext.nextActionHints.map((h) => `- ${h}`),
    '',
    'Read order for assistants: this file → assistant/assistant-context.json → diagnostics/diagnostic-summary.json → logs/application-detail.jsonl → logs/server-console.log.',
    '',
  ];
  add('assistant/assistant-context.json', JSON.stringify(assistantContext, null, 2) + '\n');
  add('assistant/ASSISTANT-BRIEF.md', briefLines.join('\n'));

  const skipped = [
    ...(operations.source !== 'database' ? [{ item: 'persistent operation history', reason: 'operations.source is not database; only process-local events since last restart are included' }] : []),
    ...summary.checks.filter((c) => c.status !== 'PASS').map((c) => ({ item: `check:${c.name}`, reason: `${c.status}: ${c.evidence}` })),
    { item: 'Render platform logs / CI logs', reason: 'outside the application; this archive includes in-app logs and local test reports only' },
    ...(detailed.source !== 'database' ? [{ item: 'persistent application logs', reason: 'applicationLogs source is not database; detailed log export contains process-local records only' }] : []),
    ...(detailed.dbWriteFailures ? [{ item: 'application log persistence', reason: `${detailed.dbWriteFailures} database write failures; in-memory fallback remains bounded` }] : []),
    ...(consoleLines.length === 0 ? [{ item: 'logs/server-console.log', reason: 'server produced no console output since the last start (or capture was not installed)' }] : []),
    ...(operations.events.length === 0 ? [{ item: 'operation events', reason: 'no builds, downloads or exports recorded in the retention window' }] : []),
  ];
  // Provenance is explicit per stream so assistants never see source=database while skipped says database unavailable.
  add('manifest.json', JSON.stringify({
    exportedAt: new Date().toISOString(),
    operationId: operationId ?? null,
    entries,
    provenance,
    // Back-compat single field: prefer operations source (historical consumers).
    source: operations.source,
    skipped,
  }, null, 2));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/** RFC 6266/5987 safe Content-Disposition: ASCII fallback + UTF-8 filename*. Never throws on non-ASCII names. */
export function contentDisposition(name: string, disposition: 'attachment' | 'inline' = 'attachment'): string {
  const clean = String(name || 'download.bin').replace(/[\u0000-\u001f\u007f"\\\/]/g, '_').trim() || 'download.bin';
  const ascii = clean.replace(/[^\x20-\x7e]/g, '_').replace(/%/g, '_') || 'download.bin';
  const encoded = encodeURIComponent(clean).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
