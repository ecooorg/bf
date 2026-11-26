/**
 * Post-run diagnostic bundle for assistants.
 * After every finished ImmoFinder search, collect a redacted but complete pack from:
 *   - pipeline result (counts, filters, sourceStats, preview, errors)
 *   - in-process application / console logs for this runId
 *   - database snapshot
 *   - settings + config summary (no secrets)
 *   - runtime (commit, KeepAlive, Render URL presence)
 * Then:
 *   1. persist to immofinder_run_diagnostics (Postgres)
 *   2. write data/immofinder/diagnostics/latest.json + runs/{runId}.json on local disk when possible
 *   3. publish the same JSON to GitHub when IMMOFINDER_GITHUB_* is configured
 */

import fs from 'node:fs';
import path from 'node:path';
import { persistImmoFinderRunDiagnostics } from './immofinderRunDiagnostics.ts';
import { publishGitHubRunDiagnostics } from './immofinderSnapshot.ts';
import { capturedApplicationLogs, capturedConsole, resolvedBuildCommit, diagnosticDbWriteFailures, capturedImmoFinderTrace } from './projectDiagnostics.ts';
import { immoDatabaseDiagnostics, searchQualityPayload } from './immofinderDiag.ts';
import { loadImmoConfig, getSettings } from './immofinderStore.ts';

const DIAG_DIR = path.join(process.cwd(), 'data', 'immofinder', 'diagnostics');

const cleanText = (v: unknown, max = 500) =>
  String(v ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(?:\+?\d[\d\s().-]{6,}\d)/g, '[phone]')
    .slice(0, max);

const cleanUrl = (v: unknown) => {
  try {
    const u = new URL(String(v));
    return `${u.hostname}${u.pathname}`;
  } catch {
    return '[invalid-url]';
  }
};

function assistantHints(result: any, filtered: Record<string, number>): string[] {
  const hints: string[] = [];
  const counts = result?.counts || {};
  const kept = Number(counts.kept || 0);
  const fetched = Number(counts.fetched || 0);
  const candidates = Number(counts.candidates || 0);
  const geo = Number(filtered.source_locality_mismatch || 0);
  const outside = Number(filtered.outside_target || 0);
  const skipped = Number(counts.skipped || 0);

  if (kept === 0 && fetched === 0 && candidates > 0) {
    hints.push('candidates_exist_but_none_fetched — check seen-cache TTL, 403 blocks, or detail-fetch failures');
  }
  if (kept === 0 && fetched > 0) {
    hints.push('fetched_but_zero_kept — quality gates rejected all detail pages (rooms/locality/agency/for_sale)');
  }
  if (geo > 50) {
    hints.push('high_source_locality_mismatch — HappyHoliday/index inventory is mostly outside selected communes');
  }
  if (outside > 0) {
    hints.push('outside_target present — municipality_not_whitelisted or similar on examined pages');
  }
  if (skipped > 10 && kept === 0) {
    hints.push('many_skipped_as_seen — clear seen or wait SEEN_TTL before expecting the same URLs again');
  }
  const stats = Array.isArray(result?.sourceStats) ? result.sourceStats : [];
  for (const s of stats) {
    if (!s || typeof s !== 'object') continue;
    const id = String((s as any).id || '');
    const bad = Number((s as any).consecutiveBad || 0);
    const hits = Number((s as any).hits || 0);
    if (bad > 0 && hits > 0) hints.push(`source_${id}_consecutiveBad=${bad}`);
  }
  if (Number(counts.infra_failures || 0) > 0) {
    hints.push('infra_failures>0 — detail fetch HTTP errors (403/410/429); check browserRenderHosts and robots');
  }
  if (!hints.length && kept === 0) hints.push('zero_kept_no_specific_signal — expand portal rotation or commune set');
  return hints;
}

export type PostRunBundleInput = {
  runId: string;
  result: any;
  errors?: any[];
  savedRows?: any[];
  wave?: string | null;
};

export async function buildPostRunBundle(input: PostRunBundleInput): Promise<Record<string, unknown>> {
  const runId = String(input.runId || '').slice(0, 100);
  const result = input.result || {};
  const errors = input.errors || result.errors || [];
  const filtered = (result.filtered && typeof result.filtered === 'object') ? result.filtered as Record<string, number> : {};

  const traceEvents = capturedImmoFinderTrace(20000).filter((event: any) => event?.type === 'immofinder_trace' && event.traceId);
  const traceIds = [...new Set(traceEvents.map((e: any) => e.traceId))];
  const traceId = traceIds[traceIds.length - 1] || null;
  const events = traceId ? traceEvents.filter((e: any) => e.traceId === traceId) : [];

  const appAll = capturedApplicationLogs(2000);
  const appForRun = appAll.filter((row: any) => JSON.stringify(row).includes(runId));
  const appSlice = (appForRun.length ? appForRun : appAll.slice(-400)).map((row: any) => {
    if (row && typeof row === 'object') {
      const copy = { ...row };
      if (typeof copy.message === 'string') copy.message = cleanText(copy.message, 800);
      return copy;
    }
    return row;
  });

  const consoleSlice = capturedConsole()
    .slice(-120)
    .map((line: any) => cleanText(typeof line === 'string' ? line : JSON.stringify(line), 400));

  let dbDiag: Record<string, unknown> = {};
  try {
    dbDiag = (await immoDatabaseDiagnostics()) as Record<string, unknown>;
  } catch (e) {
    dbDiag = { error: cleanText((e as Error)?.message || e, 200) };
  }

  let settingsSummary: Record<string, unknown> = {};
  let configSummary: Record<string, unknown> = {};
  try {
    const cfg = loadImmoConfig();
    const settings = await getSettings(cfg);
    settingsSummary = {
      scheduleMode: settings.schedule?.mode,
      everyHours: settings.schedule?.everyHours,
      profile: settings.search?.profile,
      minRooms: settings.search?.minRooms,
      communeCount: Array.isArray(settings.search?.communes) ? settings.search.communes.length : 0,
      communeSample: (settings.search?.communes || []).slice(0, 12),
      enabledSources: Object.entries(settings.search?.sources || {})
        .filter(([, on]) => on !== false)
        .map(([id]) => id)
        .slice(0, 40),
      municipalityGroups: settings.search?.municipalityGroups || null,
      maxAiPages: settings.search?.maxAiPages,
    };
    configSummary = {
      municipalityCount: (cfg.municipalities || []).length,
      sourceIds: (cfg.sources || []).map((s: any) => s.id),
      browserRenderHosts: cfg.fetch?.browserRenderHosts || [],
      discoveryEnabled: Boolean(cfg.discovery?.enabled),
      portalSourceIds: (cfg.discovery?.portalSources || []).map((p: any) => p.id),
      minRoomsFloor: cfg.minRooms,
    };
  } catch (e) {
    settingsSummary = { error: cleanText((e as Error)?.message || e, 200) };
  }

  const preview = (result.preview || []).slice(0, 200).map((p: any) => ({
    url: cleanUrl(p.url),
    title: cleanText(p.title, 160),
    source: cleanText(p.source, 80),
    municipality: p.municipality || null,
    rooms: p.rooms ?? null,
    kept: Boolean(p.kept),
    reason: p.reason || null,
    detail: cleanText(p.detail, 180),
  }));

  let quality: Record<string, unknown> | null = null;
  try {
    quality = searchQualityPayload({
      runId,
      wave: input.wave || result.wave || null,
      counts: result.counts || {},
      filtered,
      errors: Array.isArray(errors) ? errors.length : Number(errors) || 0,
      sourceStats: result.sourceStats || [],
      wavesRun: result.wavesRun || [],
      savedRows: input.savedRows || [],
      preview: result.preview || [],
    });
  } catch {
    quality = null;
  }

  const keepAliveEnv = process.env.KEEP_ALIVE;
  const runtime = {
    generatedAt: new Date().toISOString(),
    commit: resolvedBuildCommit(process.env),
    node: process.version,
    uptimeSec: Math.round(process.uptime()),
    keepAliveEnv: keepAliveEnv === undefined ? 'unset' : String(keepAliveEnv),
    keepAliveDisabled: keepAliveEnv === 'false' || keepAliveEnv === '0',
    renderExternalUrlSet: Boolean(String(process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL || '').trim()),
    serperConfigured: Boolean(process.env.SERPER_API_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    diagnosticDbWriteFailures: diagnosticDbWriteFailures(),
  };

  return {
    schemaVersion: 2,
    kind: 'immofinder_post_run_bundle',
    generatedAt: runtime.generatedAt,
    runId,
    traceId,
    runtime,
    settingsSummary,
    configSummary,
    database: dbDiag,
    result: {
      counts: result.counts || {},
      filtered,
      estCostUsd: result.estCostUsd ?? null,
      errors: (Array.isArray(errors) ? errors : []).map((e: any) => ({
        source: cleanText(e?.source, 80),
        code: cleanText(e?.code, 100),
        detail: cleanText(e?.detail, 300),
      })),
      sourceStats: result.sourceStats || [],
      wavesRun: result.wavesRun || [],
      preview,
    },
    quality,
    assistantHints: assistantHints(result, filtered),
    eventCount: events.length,
    logSource: 'process_trace_buffer+application_logs+console',
    events: events.slice(0, 5000),
    applicationLogCount: appSlice.length,
    applicationLogs: appSlice.slice(-500),
    consoleTail: consoleSlice,
  };
}

function writeLocalDiagnostics(runId: string, report: Record<string, unknown>): { ok: boolean; paths: string[]; error?: string } {
  try {
    fs.mkdirSync(path.join(DIAG_DIR, 'runs'), { recursive: true });
    const text = JSON.stringify(report, null, 2);
    const runPath = path.join(DIAG_DIR, 'runs', `${runId}.json`);
    const latestPath = path.join(DIAG_DIR, 'latest.json');
    const max = 2_000_000;
    const body = Buffer.byteLength(text, 'utf8') > max
      ? JSON.stringify({ ...report, events: undefined, applicationLogs: undefined, eventsOmitted: true, note: 'truncated_for_local_disk' }, null, 2)
      : text;
    fs.writeFileSync(runPath, body, 'utf8');
    fs.writeFileSync(latestPath, body, 'utf8');
    return { ok: true, paths: [runPath, latestPath] };
  } catch (e) {
    return { ok: false, paths: [], error: String((e as Error)?.message || e).slice(0, 200) };
  }
}

/** Full post-run publish path used by the durable worker after every finished search. */
export async function publishPostRunBundle(input: PostRunBundleInput): Promise<{
  database: string;
  local: string;
  github: string;
  paths: string[];
}> {
  const report = await buildPostRunBundle(input);
  const runId = String(input.runId);

  await persistImmoFinderRunDiagnostics(runId, report);
  const database = 'committed';

  const localWrite = writeLocalDiagnostics(runId, report);
  const local = localWrite.ok ? `written:${localWrite.paths.length}` : `skipped:${localWrite.error || 'fs'}`;

  let github = 'skipped:not_attempted';
  const paths: string[] = [...(localWrite.paths || [])];
  try {
    const gh = await publishGitHubRunDiagnostics(report, { runId });
    if (gh.status === 'committed') {
      github = `committed:${gh.commitSha || 'ok'}`;
      paths.push(...(gh.paths || []));
    } else {
      github = `skipped:${(gh as any).reason || gh.status}`;
    }
  } catch (e) {
    github = `failed:${String((e as Error)?.message || e).slice(0, 160)}`;
  }

  return { database, local, github, paths };
}
