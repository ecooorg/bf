/**
 * P126.15 — unified All Logs archive (72h) for Simple / Expert / Project plus shared + assistant brief.
 * Only API keys (and closely related bearer tokens) are redacted; conversation content stays full.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { getPool } from './database.ts';
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

/** Redact API keys / bearer tokens only; leave prompts, messages, bodies intact otherwise. */
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

function filterByComponent(logs: Record<string, unknown>[], pred: (c: string, e: string) => boolean) {
  return logs.filter((row) => {
    const c = String((row as any).component || '');
    const e = String((row as any).event || '');
    return pred(c, e);
  });
}

function jsonLines(rows: unknown[]): string {
  return rows.map((r) => softRedact(JSON.stringify(r))).join('\n') + (rows.length ? '\n' : '');
}

async function conversationsMarkdown(): Promise<string> {
  try {
    const raw = await conversationSessionLog();
    return softRedact(raw);
  } catch (e) {
    return `Conversations unavailable: ${String((e as Error).message || e)}\n`;
  }
}

export async function buildAllLogsZip(): Promise<{ buffer: Buffer; filename: string; manifest: Record<string, string> }> {
  const zip = new JSZip();
  const manifest: Record<string, string> = {};
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const commit = buildCommit();
  const release = releaseLabel() || 'unknown';
  const logs = await recentDbLogs(3000);
  const consoleText = softRedact(capturedConsole().join('\n') + '\n');
  const conversations = await conversationsMarkdown();
  let system: unknown = {};
  try { system = await systemDiagnostics(); } catch { system = { error: 'systemDiagnostics unavailable' }; }

  const add = (name: string, content: string) => {
    const body = softRedact(content);
    zip.file(name, body);
    manifest[name] = sha256(body);
  };

  // --- shared ---
  add('shared/console.log', consoleText);
  add('shared/application-logs.jsonl', jsonLines(logs));
  add('shared/system-diagnostics.json', JSON.stringify(system, null, 2) + '\n');
  add('shared/build.json', JSON.stringify({
    commit, release, generatedAt: new Date().toISOString(), windowHours: 72,
    appVersion: (() => { try { return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')).version; } catch { return 'unknown'; } })(),
  }, null, 2) + '\n');

  // Try build-stamp
  try {
    const stampPath = path.resolve(process.cwd(), 'build-stamp.json');
    if (fs.existsSync(stampPath)) add('shared/build-stamp.json', fs.readFileSync(stampPath, 'utf8'));
  } catch { /* optional */ }

  // --- per mode folders (same structure; content filtered where possible) ---
  const simpleLogs = filterByComponent(logs, (c, e) =>
    /simple|conversational|direct/i.test(c) || /simple|conversational/i.test(e));
  const expertLogs = filterByComponent(logs, (c, e) =>
    /expert|step|decision/i.test(c) || /expert/i.test(e));
  const projectLogs = filterByComponent(logs, (c, e) =>
    /project|architect|build|app.?builder|code.?task/i.test(c) || /project|architect|build/i.test(e));

  for (const [folder, modeLogs] of [
    ['simple', simpleLogs],
    ['expert', expertLogs],
    ['project', projectLogs],
  ] as const) {
    add(`${folder}/application-logs.jsonl`, jsonLines(modeLogs));
    add(`${folder}/SUMMARY.md`, [
      `# ${folder} mode — summary (72h)`,
      ``,
      `- Generated: ${new Date().toISOString()}`,
      `- Commit: ${commit}`,
      `- Release: ${release}`,
      `- Log rows in window (filtered): ${modeLogs.length}`,
      `- Total application log rows in window: ${logs.length}`,
      ``,
      `See conversations.md (shared narrative) and application-logs.jsonl for detail.`,
      ``,
    ].join('\n'));
    add(`${folder}/conversations.md`, conversations);
  }

  // Project extras
  add('project/build-operations.jsonl', jsonLines(filterByComponent(logs, (c, e) =>
    /build|operation|artifact|scaffold/i.test(c) || /build|operation/i.test(e))));

  // --- assistant brief ---
  const brief = {
    generatedAt: new Date().toISOString(),
    windowHours: 72,
    commit,
    release,
    totals: {
      applicationLogRows: logs.length,
      consoleLines: capturedConsole().length,
      simpleRows: simpleLogs.length,
      expertRows: expertLogs.length,
      projectRows: projectLogs.length,
    },
    qualitySignals: {
      errorRows: logs.filter((r) => String((r as any).level) === 'error').length,
      warnRows: logs.filter((r) => String((r as any).level) === 'warn').length,
      httpFailures: logs.filter((r) => String((r as any).component) === 'http' && Number((r as any).details?.statusCode) >= 500).length,
    },
    notes: [
      'Only API keys and bearer tokens are redacted in this archive.',
      'Conversation content, prompts, and model replies are retained for assistant evaluation.',
      'Per-mode folders share conversations.md when mode-specific separation is unavailable in storage.',
    ],
  };
  add('assistant/ASSISTANT-BRIEF.md', [
    '# Assistant brief — BiForge All Logs',
    '',
    '## Purpose',
    'Help the assistant evaluate product behaviour and information quality from the user point of view.',
    '',
    '## Snapshot',
    '```json',
    JSON.stringify(brief, null, 2),
    '```',
    '',
    '## How to read the archive',
    '- `simple/`, `expert/`, `project/` — mode-scoped logs + SUMMARY.md + conversations.md',
    '- `shared/` — console, full application log stream, system diagnostics, build identity',
    '- `assistant/` — this brief and machine-readable context',
    '',
  ].join('\n'));
  add('assistant/context.json', JSON.stringify(brief, null, 2) + '\n');

  add('MANIFEST.sha256', Object.entries(manifest).map(([k, h]) => `${h}  ${k}`).join('\n') + '\n');

  const buffer = Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } }));
  // Integrity: re-parse
  const check = await JSZip.loadAsync(buffer);
  if (!check.files['MANIFEST.sha256']) throw new Error('all-logs archive integrity check failed');
  const filename = `biforge-all-logs-${stamp.slice(0, 19)}.zip`;
  return { buffer, filename, manifest };
}
