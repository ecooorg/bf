/**
 * P126.15 / P126.19 — unified All Logs archive (72h) for Simple / Expert / Project plus shared + assistant brief.
 * Only API keys (and closely related bearer tokens) are redacted; conversation content stays full.
 * P126.19: per-mode filtering by productMode/agent, REQUEST_INDEX from simple_direct_exchange + pipeline, no triplicate identical conversations.md.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { redactSecrets } from './redact.ts';
import {
  buildCommit,
  capturedApplicationLogs,
  capturedConsole,
  recentApplicationLogs,
  releaseLabel,
  systemDiagnostics,
} from './projectDiagnostics.ts';
import { conversationSessionLog } from './conversationDiagnostics.ts';

const HOURS_72_MS = 72 * 60 * 60 * 1000;

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function softRedact(text: string): string {
  let s = redactSecrets(String(text ?? ''));
  s = s.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]');
  s = s.replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [REDACTED]');
  s = s.replace(/(api[_-]?key|x-api-key)\s*[:=]\s*["']?[^\s,"']+/gi, '$1=[REDACTED_API_KEY]');
  return s;
}

async function recentDbLogs(limit = 2000): Promise<Record<string, unknown>[]> {
  try {
    const { logs } = await recentApplicationLogs(limit);
    const cutoff = Date.now() - HOURS_72_MS;
    return logs.filter((row) => {
      const t = Date.parse(String((row as any).timestamp || ''));
      return !Number.isFinite(t) || t >= cutoff;
    });
  } catch {
    return capturedApplicationLogs(limit);
  }
}

function jsonLines(rows: unknown[]): string {
  return rows.map((r) => softRedact(JSON.stringify(r))).join('\n') + (rows.length ? '\n' : '');
}

function modeOf(row: Record<string, unknown>): 'simple' | 'expert' | 'project' | 'shared' {
  const d = (row.details && typeof row.details === 'object') ? row.details as Record<string, unknown> : {};
  const pm = String(d.productMode || d.product_mode || '').toLowerCase();
  const agent = String(d.agent || '').toLowerCase();
  const component = String(row.component || '').toLowerCase();
  if (pm === 'expert' || agent === 'expert') return 'expert';
  if (pm === 'project' || component.includes('project') || component.includes('app-builder')) return 'project';
  if (pm === 'simple' || agent === 'conversational' || String(row.event || '').startsWith('simple_')) return 'simple';
  if (component === 'conversation') return 'simple'; // default conversation path historically Simple/shared
  return 'shared';
}

function buildRequestIndex(logs: Record<string, unknown>[]): string {
  const lines: string[] = [
    '# Request index (recent conversation exchanges)',
    '',
    'Built from `simple_direct_exchange` and `conversation_response_pipeline` events.',
    'Each block links requestId → user text → search → model → reply preview.',
    '',
  ];
  const exchanges = logs.filter((r) => {
    const e = String(r.event || '');
    return e === 'simple_direct_exchange' || e === 'conversation_response_pipeline' || e === 'conversation_client_render';
  });
  // newest last in DB reverse order often — sort by timestamp
  exchanges.sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')));
  let n = 0;
  for (const row of exchanges) {
    const d = (row.details && typeof row.details === 'object') ? row.details as Record<string, unknown> : {};
    const event = String(row.event || '');
    if (event === 'conversation_client_render') {
      lines.push(`- client-render ack requestId=${row.requestId || '-'} mode=${d.productMode || '-'} at ${row.timestamp}`);
      continue;
    }
    n += 1;
    const user = String(d.userText || d.userRequest || d.userPreview || '').slice(0, 500);
    const reply = String(d.replyText || d.finalVisibleReply || '').slice(0, 800);
    lines.push(`## ${n}. ${row.timestamp} · ${d.productMode || modeOf(row)} · requestId=${row.requestId || '-'}`);
    lines.push(`- event: ${event}`);
    lines.push(`- model: ${d.model || '-'} · search: ${d.searchStatus || d.searchResult || '-'} · sources: ${d.searchSourceCount ?? d.searchSourceCount ?? '-'}`);
    if (d.searchHosts) lines.push(`- hosts: ${JSON.stringify(d.searchHosts)}`);
    if (d.searchQueries) lines.push(`- queries: ${JSON.stringify(d.searchQueries)}`);
    if (d.searchTopic || d.searchPlace) lines.push(`- topic/place: ${d.searchTopic || '-'} / ${d.searchPlace || '-'}`);
    lines.push(`- user: ${user || '(not captured)'}`);
    lines.push(`- reply preview: ${reply || '(not captured)'}`);
    lines.push('');
  }
  if (n === 0) lines.push('_No exchange events in window. Deploy P126.19+ and run a Simple/Expert turn to populate._');
  return lines.join('\n') + '\n';
}

export async function buildAllLogsZip(): Promise<{ buffer: Buffer; filename: string; manifest: Record<string, string> }> {
  const zip = new JSZip();
  const manifest: Record<string, string> = {};
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const commit = buildCommit();
  const release = releaseLabel() || 'unknown';
  const logs = await recentDbLogs(3000);
  const consoleText = softRedact(capturedConsole().join('\n') + '\n');
  let system: unknown = {};
  try { system = await systemDiagnostics(); } catch { system = { error: 'systemDiagnostics unavailable' }; }

  const add = (name: string, content: string) => {
    const body = softRedact(content);
    zip.file(name, body);
    manifest[name] = sha256(body);
  };

  add('shared/console.log', consoleText);
  add('shared/application-logs.jsonl', jsonLines(logs));
  add('shared/system-diagnostics.json', JSON.stringify(system, null, 2) + '\n');
  add('shared/build.json', JSON.stringify({
    commit, release, generatedAt: new Date().toISOString(), windowHours: 72,
    appVersion: (() => { try { return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')).version; } catch { return 'unknown'; } })(),
  }, null, 2) + '\n');
  try {
    const stampPath = path.resolve(process.cwd(), 'build-stamp.json');
    if (fs.existsSync(stampPath)) add('shared/build-stamp.json', fs.readFileSync(stampPath, 'utf8'));
  } catch { /* optional */ }

  // Full conversation diagnostic once under shared (not triplicated)
  try {
    add('shared/conversations-full.md', await conversationSessionLog());
  } catch (e) {
    add('shared/conversations-full.md', `unavailable: ${String((e as Error).message || e)}\n`);
  }

  add('shared/REQUEST_INDEX.md', buildRequestIndex(logs));

  const byMode = {
    simple: logs.filter((r) => modeOf(r) === 'simple'),
    expert: logs.filter((r) => modeOf(r) === 'expert'),
    project: logs.filter((r) => modeOf(r) === 'project'),
  };

  for (const [folder, modeLogs] of Object.entries(byMode) as [string, Record<string, unknown>[]][]) {
    add(`${folder}/application-logs.jsonl`, jsonLines(modeLogs));
    add(`${folder}/SUMMARY.md`, [
      `# ${folder} mode — summary (72h)`,
      ``,
      `- Generated: ${new Date().toISOString()}`,
      `- Commit: ${commit}`,
      `- Release: ${release}`,
      `- Log rows (mode-filtered): ${modeLogs.length}`,
      `- Total application log rows in window: ${logs.length}`,
      ``,
      `See shared/REQUEST_INDEX.md for user↔reply index and shared/conversations-full.md for the full diagnostic narrative.`,
      ``,
    ].join('\n'));
    // Mode-specific exchange extract only (not the full shared dump)
    const modeExchanges = modeLogs.filter((r) => ['simple_direct_exchange', 'conversation_response_pipeline'].includes(String(r.event || '')));
    add(`${folder}/exchanges.jsonl`, jsonLines(modeExchanges));
  }

  add('project/build-operations.jsonl', jsonLines(logs.filter((r) =>
    /build|operation|artifact|scaffold|app-builder/i.test(String(r.component || '') + String(r.event || '')))));

  const brief = {
    generatedAt: new Date().toISOString(),
    windowHours: 72,
    commit,
    release,
    totals: {
      applicationLogRows: logs.length,
      consoleLines: capturedConsole().length,
      simpleRows: byMode.simple.length,
      expertRows: byMode.expert.length,
      projectRows: byMode.project.length,
      exchangeEvents: logs.filter((r) => String(r.event || '') === 'simple_direct_exchange' || String(r.event || '') === 'conversation_response_pipeline').length,
      clientRenderAcks: logs.filter((r) => String(r.event || '') === 'conversation_client_render').length,
    },
    qualitySignals: {
      errorRows: logs.filter((r) => String((r as any).level) === 'error').length,
      warnRows: logs.filter((r) => String((r as any).level) === 'warn').length,
      httpFailures: logs.filter((r) => String((r as any).component) === 'http' && Number((r as any).details?.statusCode) >= 500).length,
    },
    notes: [
      'Only API keys and bearer tokens are redacted.',
      'P126.19: REQUEST_INDEX links requestId to user text and reply; client-render acks mark painted replies.',
      'Mode folders use productMode/agent tags; shared/conversations-full.md is the single full narrative.',
    ],
  };
  add('assistant/ASSISTANT-BRIEF.md', [
    '# Assistant brief — BiForge All Logs',
    '',
    '## Snapshot',
    '```json',
    JSON.stringify(brief, null, 2),
    '```',
    '',
    '## How to read',
    '- `shared/REQUEST_INDEX.md` — start here for user-visible turns',
    '- `simple|expert|project/exchanges.jsonl` — mode-scoped exchange events',
    '- `shared/conversations-full.md` — full diagnostic narrative (once)',
    '',
  ].join('\n'));
  add('assistant/context.json', JSON.stringify(brief, null, 2) + '\n');
  add('MANIFEST.sha256', Object.entries(manifest).map(([k, h]) => `${h}  ${k}`).join('\n') + '\n');

  const buffer = Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } }));
  const check = await JSZip.loadAsync(buffer);
  if (!check.files['MANIFEST.sha256']) throw new Error('all-logs archive integrity check failed');
  const filename = `biforge-all-logs-${stamp.slice(0, 19)}.zip`;
  return { buffer, filename, manifest };
}
