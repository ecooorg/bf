import crypto from 'node:crypto';
import express, { type Express, type Request } from 'express';
import { isSameOrigin } from './security.ts';
import { createPoliteFetch } from './immofinderFetcher.ts';
import { runPipeline } from './immofinder/live.ts';
import { applyImmoFinderTestBudget } from './immofinderTestMode.ts';
import { channelStatus, checkDrive, exportDrive, clearDriveExport, formatListingsText, sendEmail, sendTelegram } from './immofinderDelivery.ts';

let stopImmoFinderWorkerImpl: (() => Promise<void>) | null = null;
export async function stopImmoFinderWorker(): Promise<void> { await stopImmoFinderWorkerImpl?.(); }

/** User-facing run name: only Carousel vs Full (settings). Internal priority/extended map to these. */
function immofinderWaveLabel(wave: string): string {
  const w = String(wave || '').toLowerCase();
  if (w === 'carousel') return 'Carousel';
  if (w === 'full' || w === 'extended') return 'Full search';
  if (w === 'priority') return 'Full search'; // legacy internal phase name — not a separate product mode
  return 'Search';
}
import { TIMEZONE, applySettings, churTestSettings, defaultSettings, isDue, parseDriveFolderId } from './immofinderSettings.ts';
import { createSerperSearch } from './immofinderDiscovery.ts';
import { STATUSES, createPgStore, cleanupStored, recheckStored, wipeAllListings, finishRun, finishRunCancelled, getSettings, getSettingsUpdatedAt, clearC131PilotSeen, hiddenCount, isRunCancelled, lastRealRunAt, latestRun, listListings, listListingsForRefresh, listListingsNeedingContact, loadImmoConfig, realRunCount, requestRunCancel, saveWorkerProgress, claimNextRun, renewRunLease, releaseRunForRetry, markRunCancelLocal, saveSettings, setStatus, deleteListing, startRun, clearRunCancel, updateListingContacts } from './immofinderStore.ts';
import { resolveEnrichmentConfig, enrichContacts, applyEnrichmentToRecord, type EnrichmentInput } from './immofinderContactEnrichment.ts';
import { runRefreshJob, newRefreshStatus, type RefreshStatus } from './immofinderRefresh.ts';
import { immoLog, immoDatabaseDiagnostics, searchQualityPayload } from './immofinderDiag.ts';
import { exportRepairSnapshot, previewRepairOps, applyRepairBatch, runAutomaticRepairAudit, applyBundledRepairBatches } from './immofinderRepairStore.ts';
import { parseRepairFile } from './immofinderRepair.ts';

import { capturedImmoFinderTrace } from './projectDiagnostics.ts';
import { persistImmoFinderRunDiagnostics, latestImmoFinderRunDiagnostics } from './immofinderRunDiagnostics.ts';
import { githubAppConfigFromEnv, probeGitHubAppSetup } from './githubIntegration.ts';

/** In-process status for the contact re-enrich job (shown in the UI). */
const enrichJobStatus: {
  running: boolean;
  startedAt: number | null;
  finishedAt: number | null;
  queued: number;
  checked: number;
  found: number;
  errors: number;
  current: string;
  message: string;
} = {
  running: false,
  startedAt: null,
  finishedAt: null,
  queued: 0,
  checked: 0,
  found: 0,
  errors: 0,
  current: '',
  message: '',
};

const refreshStatus: RefreshStatus = newRefreshStatus();
let repairBootstrap: Promise<unknown> | null = null;

export interface ImmoRouteDeps {
  authenticated: (req: Request) => boolean;
  appAuthEnabled: boolean;
  /** Returns one parsed JSON object from the model; null when no model key is configured. */
  llm: ((system: string, prompt: string) => Promise<unknown>) | null;
}

function secretOk(req: Request): boolean {
  const want = process.env.IMMOFINDER_RUN_SECRET || ''; const got = String(req.get('x-immofinder-secret') || '');
  if (!want || want.length < 16 || !got) return false;
  const a = Buffer.from(want); const b = Buffer.from(got);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Secret automation call shapes. This only bypasses the global session gate; every route verifies the timing-safe secret again. */
export function isImmoCronCall(req: Request): boolean {
  return req.method === 'POST' && ['/api/immofinder/run', '/api/immofinder/settings/prepare-chur-test'].includes(req.path) && Boolean(req.get('x-immofinder-secret'));
}

/** Read-only diagnostics polling endpoint for GitHub Actions; the same timing-safe run secret protects it. */
export function isImmoDiagnosticsCall(req: Request): boolean {
  const path = String(req.originalUrl || req.path).split('?')[0];
  return req.method === 'GET' && (path === '/api/immofinder/diagnostics/latest' || path === '/api/immofinder/github/probe') && secretOk(req);
}

/** Folder precedence: saved setting, then env, then the config default. */
function driveFolder(saved: string): string {
  return saved || parseDriveFolderId(process.env.IMMOFINDER_DRIVE_FOLDER_ID) || parseDriveFolderId(loadImmoConfig().driveFolderId);
}

async function publishGitHubSnapshotAfterRun(runId: string): Promise<string> {
  immoLog('info', 'immofinder_snapshot_github_disabled', { runId, reason: 'database_is_primary_store' });
  return 'skipped:database_is_primary_store';
}

async function publishGitHubDiagnosticsAfterRun(runId: string, result: any, errors: any[] = []): Promise<string> {
  try {
    const traceEvents = capturedImmoFinderTrace(20000).filter((event: any) => event?.type === 'immofinder_trace' && event.traceId);
    const traceIds = [...new Set(traceEvents.map((e: any) => e.traceId))];
    const traceId = traceIds[traceIds.length - 1] || null;
    const events = traceId ? traceEvents.filter((e: any) => e.traceId === traceId) : [];
    const cleanText = (v: unknown, max = 500) => String(v ?? '').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]').replace(/(?:\+?\d[\d\s().-]{6,}\d)/g, '[phone]').slice(0, max);
    const cleanUrl = (v: unknown) => { try { const u = new URL(String(v)); return `${u.hostname}${u.pathname}`; } catch { return '[invalid-url]'; } };
    const report = {
      schemaVersion: 1, generatedAt: new Date().toISOString(), runId, traceId,
      eventCount: events.length, logSource: 'process_trace_buffer', databaseLogWriteFailures: null,
      events,
      result: {
        counts: result?.counts || {}, filtered: result?.filtered || {}, estCostUsd: result?.estCostUsd ?? null, errors: (result?.errors || errors).map((e: any) => ({ source: cleanText(e.source, 80), code: cleanText(e.code, 100), detail: cleanText(e.detail, 300) })),
        sourceStats: result?.sourceStats || [], wavesRun: result?.wavesRun || [],
        preview: (result?.preview || []).slice(0, 120).map((p: any) => ({ url: cleanUrl(p.url), title: cleanText(p.title, 160), source: cleanText(p.source, 80), municipality: p.municipality || null, rooms: p.rooms ?? null, kept: Boolean(p.kept), reason: p.reason || null, detail: cleanText(p.detail, 180) })),
      },
    };
    await persistImmoFinderRunDiagnostics(runId, report);
    immoLog('info', 'immofinder_diagnostics_database_committed', { runId, traceId, eventCount: events.length }, 'Completed search diagnostics persisted for GitHub polling');
    immoLog('info', 'immofinder_github_diagnostics_disabled', { runId, reason: 'database_and_render_logs_are_primary' });
    return 'database:committed;github:disabled_cost_policy';
  } catch (e) {
    const detail = String((e as Error)?.message || e).slice(0, 180);
    immoLog('error', 'immofinder_github_diagnostics_failed', { runId, error: detail });
    return `failed:${detail}`;
  }
}

async function publishQualityCheckedListings(reason: string): Promise<Record<string, string>> {
  const publication: Record<string, string> = {};
  const settings = await getSettings(loadImmoConfig());
  const all = (await listListingsForRefresh()).filter((r: any) => !r.hidden);
  let driveUrl: string | undefined;
  const errorText = (e: unknown) => String((e as Error)?.message || e).slice(0, 160);
  if (settings.delivery.drive) {
    try {
      const drive = await exportDrive(all, driveFolder(settings.delivery.driveFolderId));
      publication.drive = drive.status;
      driveUrl = drive.url;
    } catch (e) { publication.drive = `error: ${errorText(e)}`; }
  }
  const heading = `ImmoFinder: ${all.length} quality-checked listings after ${reason}`;
  if (settings.delivery.email && settings.delivery.emailTo) {
    try {
      publication.email = await sendEmail(settings.delivery.emailTo, 'ImmoFinder: verified listings updated', formatListingsText(all, { heading, limit: 60, driveUrl }));
    } catch (e) { publication.email = `error: ${errorText(e)}`; }
  }
  if (settings.delivery.telegram) {
    try {
      publication.telegram = await sendTelegram(formatListingsText(all, { heading, limit: 6, driveUrl }));
    } catch (e) { publication.telegram = `error: ${errorText(e)}`; }
  }
  return publication;
}

export function registerImmoFinderRoutes(app: Express, deps: ImmoRouteDeps): void {
  let workerStopping = false;
  const json = express.json({ limit: '10kb' });
  app.use('/api/immofinder', (req, res, next) => {
    const isRunPost = req.method === 'POST' && req.path === '/run';
    const isTestProfilePost = req.method === 'POST' && req.path === '/settings/prepare-chur-test';
    const hasSecretHeader = Boolean(String(req.get('x-immofinder-secret') || ''));
    const secretConfigured = Boolean(process.env.IMMOFINDER_RUN_SECRET && process.env.IMMOFINDER_RUN_SECRET.length >= 16);
    const cron = (isRunPost || isTestProfilePost) && secretOk(req);
    const diagnosticsPoll = isImmoDiagnosticsCall(req);
    if (isRunPost) {
      console.info(JSON.stringify({
        type: 'immofinder_run_request',
        via: cron ? 'schedule_secret' : (hasSecretHeader ? 'bad_or_short_secret' : 'session'),
        secretHeaderPresent: hasSecretHeader,
        secretConfigured,
        cronAuth: cron,
      }));
    }
    if (!cron && !diagnosticsPoll) {
      if (!deps.appAuthEnabled || !deps.authenticated(req)) {
        if (isRunPost) console.warn(JSON.stringify({ type: 'immofinder_run_rejected', code: 'UNAUTHORIZED', secretHeaderPresent: hasSecretHeader, secretConfigured }));
        return res.status(401).json({ success: false, error: 'Authentication required', code: 'UNAUTHORIZED' });
      }
      if (req.method !== 'GET') { const o = req.get('origin'); if (!o || !isSameOrigin(o, req.get('host'), req.protocol)) {
        if (isRunPost) console.warn(JSON.stringify({ type: 'immofinder_run_rejected', code: 'CSRF_ORIGIN' }));
        return res.status(403).json({ success: false, error: 'Same-origin request required', code: 'CSRF_ORIGIN' });
      } }
    }
    if (!process.env.DATABASE_URL) return res.status(503).json({ success: false, error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' });
    (req as any).immoCron = cron || diagnosticsPoll;
    // Polling is read-only and must not trigger the first-user-request repair bootstrap.
    if (diagnosticsPoll) return next();
    // First authenticated ImmoFinder request after deploy audits every currently visible saved row.
    // The write-time gate in the store handles all subsequently discovered/re-fetched cards.
    if (!repairBootstrap) repairBootstrap = (async () => {
      const audit = await runAutomaticRepairAudit();
      const bundled = await applyBundledRepairBatches();
      const bundledChanges = 'results' in bundled && bundled.results.some((r: any) => Number(r.summary?.applied || 0) > 0);
      const publication = Number(audit.summary?.applied || 0) > 0 || bundledChanges
        ? await publishQualityCheckedListings('automatic repair audit')
        : {};
      immoLog('info', 'immofinder_repair_bootstrap', { audit, bundled, publication });
      return { audit, bundled, publication };
    })().catch((e) => {
      immoLog('error', 'immofinder_repair_bootstrap_failed', { error: String((e as Error)?.message || e).slice(0, 240) });
      return null;
    });
    void repairBootstrap.finally(() => next());
  });


  /** GitHub Actions polls this endpoint every ten minutes and archives each newly completed run. */
  app.get('/api/immofinder/diagnostics/latest', async (_req, res) => {
    try {
      const latest = await latestImmoFinderRunDiagnostics();
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      if (!latest) return res.status(404).json({ success: false, error: 'No completed ImmoFinder diagnostics yet', code: 'DIAGNOSTICS_NOT_FOUND' });
      return res.json({ success: true, report: latest.report, completedAt: latest.completedAt });
    } catch (e) {
      return res.status(503).json({ success: false, error: String((e as Error)?.message || e).slice(0, 180), code: 'DIAGNOSTICS_UNAVAILABLE' });
    }
  });

  /** Live GitHub App diagnosis for the health workflow: what the App and installation hold and why a write token is refused. No secrets are returned. */
  app.get('/api/immofinder/github/probe', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    if (!secretOk(req)) return res.status(401).json({ success: false, code: 'UNAUTHORIZED' });
    const { config, missing } = githubAppConfigFromEnv(process.env);
    if (!config) {
      const legacy = Boolean(String(process.env.IMMOFINDER_GITHUB_TOKEN || '').trim());
      return res.json({ success: true, probe: { verdict: legacy ? 'OK' : 'FAIL', cause: legacy ? 'legacy_token_in_use' : 'github_app_env_missing', fix: legacy ? 'A legacy personal token is used instead of the GitHub App.' : 'Set the missing GitHub App variables on the server.', checkedAt: new Date().toISOString(), steps: [], missingEnv: missing } });
    }
    return res.json({ success: true, probe: await probeGitHubAppSetup(config) });
  });

  // Assistant repair protocol: snapshot is intentionally complete (including saved contacts/evidence).
  app.get('/api/immofinder/export-snapshot', async (_req, res) => {
    try {
      const snapshot = await exportRepairSnapshot();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({ success: true, meta: snapshot.meta, rows: snapshot.rows, listingsJsonl: snapshot.jsonl, repairQueue: snapshot.queue });
    } catch (e) { res.status(500).json({ success: false, error: 'Snapshot export failed', code: 'SNAPSHOT_FAILED' }); }
  });

  app.post('/api/immofinder/repair/preview', express.json({ limit: '5mb' }), async (req, res) => {
    try {
      const result = await previewRepairOps(req.body, 'assistant_preview');
      res.status(result.valid ? 200 : 400).json({ success: result.valid, ...result });
    } catch { res.status(500).json({ success: false, error: 'Repair preview failed', code: 'REPAIR_PREVIEW_FAILED' }); }
  });

  app.post('/api/immofinder/repair/apply', express.json({ limit: '5mb' }), async (req, res) => {
    try {
      const parsed = parseRepairFile(JSON.stringify(req.body));
      if (parsed.issues.length || parsed.batches.length !== 1) {
        return res.status(400).json({ success: false, error: 'Expected one valid repair batch', issues: parsed.issues });
      }
      const batch = parsed.batches[0];
      if (!batch.ops.length) return res.status(400).json({ success: false, error: 'Repair batch contains no operations' });
      const result = await applyRepairBatch(batch, 'assistant_patch');
      let publication: Record<string, string> = {};
      if (result.applied && !result.duplicate && Number(result.summary?.applied || 0) > 0) {
        try { publication = await publishQualityCheckedListings('Assistant repair'); }
        catch (e) { publication.error = String((e as Error)?.message || e).slice(0, 180); }
      }
      immoLog('info', 'immofinder_repair_applied', { batchId: batch.batchId, summary: result.summary, duplicate: result.duplicate, publication });
      return res.json({ success: true, ...result, publication });
    } catch (e) { res.status(500).json({ success: false, error: 'Repair apply failed', code: 'REPAIR_APPLY_FAILED' }); }
  });

  app.post('/api/immofinder/repair/audit', json, async (_req, res) => {
    try {
      const result = await runAutomaticRepairAudit();
      let publication: Record<string, string> = {};
      if (Number(result.summary?.applied || 0) > 0) {
        try { publication = await publishQualityCheckedListings('manual repair audit'); }
        catch (e) { publication.error = String((e as Error)?.message || e).slice(0, 180); }
      }
      immoLog('info', 'immofinder_repair_audit', { ...result, publication });
      return res.json({ success: true, ...result, publication });
    } catch { return res.status(500).json({ success: false, error: 'Automatic repair audit failed', code: 'REPAIR_AUDIT_FAILED' }); }
  });

  app.get('/api/immofinder/listings', async (req, res) => {
    try {
      const s = String(req.query.status || '').toUpperCase();
      const scope = String(req.query.scope || '');
      res.json({ success: true, listings: await listListings((STATUSES as readonly string[]).includes(s) ? s : null, { onlyHidden: scope === 'hidden', includeHidden: scope === 'all' }), hidden: await hiddenCount() });
    } catch (e) { res.status(500).json({ success: false, error: 'Listings unavailable', code: 'IMMOFINDER_FAILED' }); }
  });

  app.patch('/api/immofinder/listings/:id', json, async (req, res) => {
    const status = String(req.body?.status || '');
    if (!(STATUSES as readonly string[]).includes(status) || !/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid id or status', code: 'INVALID_REQUEST' });
    try { return (await setStatus(req.params.id, status)) ? res.json({ success: true }) : res.status(404).json({ success: false, error: 'Listing not found', code: 'NOT_FOUND' }); }
    catch { return res.status(500).json({ success: false, error: 'Update failed', code: 'IMMOFINDER_FAILED' }); }
  });


  app.delete('/api/immofinder/listings/:id', async (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid id', code: 'INVALID_REQUEST' });
    try {
      return (await deleteListing(req.params.id))
        ? res.json({ success: true })
        : res.status(404).json({ success: false, error: 'Not found', code: 'NOT_FOUND' });
    } catch (e) {
      res.status(500).json({ success: false, error: String((e as Error)?.message || e).slice(0, 160), code: 'IMMOFINDER_FAILED' });
    }
  });

  app.get('/api/immofinder/enrich-status', async (_req, res) => {
    res.json({ success: true, job: { ...enrichJobStatus } });
  });

  /** Re-run public contact enrichment on already saved listings that still lack phone/email. */
  app.post('/api/immofinder/enrich-existing', json, async (req, res) => {
    try {
      const cfg = loadImmoConfig();
      const enrichCfg = resolveEnrichmentConfig(cfg);
      if (!enrichCfg.enabled) {
        console.warn(JSON.stringify({ type: 'immofinder_enrich_existing_rejected', code: 'ENRICHMENT_OFF' }));
        return res.status(400).json({ success: false, error: 'Contact enrichment is disabled in config', code: 'ENRICHMENT_OFF' });
      }
      if (!process.env.SERPER_API_KEY) {
        console.warn(JSON.stringify({ type: 'immofinder_enrich_existing_rejected', code: 'NO_SERPER' }));
        return res.status(400).json({ success: false, error: 'SERPER_API_KEY is required for contact search', code: 'NO_SERPER' });
      }
      if (enrichJobStatus.running) {
        return res.status(409).json({ success: false, error: 'Contact search is already running', code: 'ENRICH_IN_PROGRESS', job: { ...enrichJobStatus } });
      }
      const limit = Math.min(Math.max(Number(req.body?.limit) || 200, 1), 500);
      const rows = await listListingsNeedingContact(limit);
      res.status(202).json({ success: true, queued: rows.length, limit, rule: 'missing_phone_and_email' });

      void (async () => {
        const started = Date.now();
        enrichJobStatus.running = true;
        enrichJobStatus.startedAt = started;
        enrichJobStatus.finishedAt = null;
        enrichJobStatus.queued = rows.length;
        enrichJobStatus.checked = 0;
        enrichJobStatus.found = 0;
        enrichJobStatus.errors = 0;
        enrichJobStatus.current = '';
        enrichJobStatus.message = rows.length
          ? `Contact search started for ${rows.length} listings…`
          : 'No listings without phone or email';
        const search = createSerperSearch(fetch, cfg.discovery?.resultsPerQuery ?? 10);
        const fetchPage = createPoliteFetch(cfg);
        const budget = {
          searchesLeft: Math.max(enrichCfg.maxExtraSearchesPerRun, rows.length * 3),
          reverseImageLeft: Math.max(enrichCfg.maxReverseImagePerRun, rows.length),
        };
        console.info(JSON.stringify({
          type: 'immofinder_enrich_existing_start',
          queued: rows.length,
          limit,
          budgetSearches: budget.searchesLeft,
          budgetReverseImage: budget.reverseImageLeft,
          hasSerper: Boolean(process.env.SERPER_API_KEY),
        }));
        let found = 0; let checked = 0; let errors = 0;
        for (const row of rows) {
          if (budget.searchesLeft <= 0 && budget.reverseImageLeft <= 0) {
            console.warn(JSON.stringify({ type: 'immofinder_enrich_existing_budget_exhausted', checked, found, remaining: rows.length - checked }));
            enrichJobStatus.message = `Budget exhausted after ${checked}/${rows.length}`;
            break;
          }
          checked++;
          enrichJobStatus.checked = checked;
          enrichJobStatus.current = `${String(row.property_name || '').slice(0, 40)} · ${String(row.municipality || '')}`;
          enrichJobStatus.message = `Searching contacts ${checked}/${rows.length}…`;
          const evidence = Array.isArray(row.contact_evidence) ? row.contact_evidence : [];
          const input: EnrichmentInput = {
            listingUrl: row.listing_url,
            propertyName: row.property_name || '',
            municipality: row.municipality || '',
            ownerName: row.owner_name || null,
            photoUrls: Array.isArray(row.photo_urls) ? row.photo_urls : [],
            existingPhones: row.direct_phone ? [row.direct_phone] : [],
            existingEmails: row.direct_email ? [row.direct_email] : [],
            platformDomains: cfg.platformDomains || [],
          };
          try {
            const enrichment = await enrichContacts(input, {
              config: enrichCfg,
              search,
              fetchPage,
              budget,
            });
            const base = {
              direct_phone: row.direct_phone || null,
              direct_email: row.direct_email || null,
              contact_evidence: evidence,
              contact_status: (row.contact_status || 'platform_only') as 'found' | 'not_found' | 'platform_only',
              contact_advice: row.contact_advice || '',
              raw: (row.raw && typeof row.raw === 'object') ? row.raw : {},
            };
            const merged = applyEnrichmentToRecord(base, enrichment, row.contact_advice || '');
            await updateListingContacts(String(row.id), {
              direct_phone: merged.direct_phone,
              direct_email: merged.direct_email,
              contact_evidence: merged.contact_evidence,
              contact_status: merged.contact_status,
              contact_advice: merged.contact_advice,
              raw: merged.raw,
            });
            const hit = enrichment.evidence.length > 0;
            if (hit) found++;
            enrichJobStatus.found = found;
            console.info(JSON.stringify({
              type: 'immofinder_enrich_existing_item',
              index: checked,
              total: rows.length,
              id: String(row.id).slice(0, 36),
              municipality: String(row.municipality || '').slice(0, 40),
              propertyName: String(row.property_name || '').slice(0, 60),
              hit,
              evidenceCount: enrichment.evidence.length,
              hasPhone: Boolean(merged.direct_phone),
              hasEmail: Boolean(merged.direct_email),
              notes: (enrichment.notes || []).slice(0, 6),
            }));
          } catch (e) {
            errors++;
            enrichJobStatus.errors = errors;
            console.warn(JSON.stringify({
              type: 'immofinder_enrich_existing_item_error',
              index: checked,
              id: String(row.id).slice(0, 36),
              error: String((e as Error)?.message || e).slice(0, 180),
            }));
          }
        }
        enrichJobStatus.running = false;
        enrichJobStatus.finishedAt = Date.now();
        enrichJobStatus.checked = checked;
        enrichJobStatus.found = found;
        enrichJobStatus.errors = errors;
        enrichJobStatus.current = '';
        enrichJobStatus.message = `Contact search finished: checked ${checked}, found ${found}` + (errors ? `, errors ${errors}` : '');
        console.info(JSON.stringify({
          type: 'immofinder_enrich_existing_done',
          queued: rows.length,
          checked,
          found,
          errors,
          durationMs: Date.now() - started,
        }));
      })().catch((e) => {
        enrichJobStatus.running = false;
        enrichJobStatus.finishedAt = Date.now();
        enrichJobStatus.message = `Contact search failed: ${String((e as Error)?.message || e).slice(0, 120)}`;
        console.error(JSON.stringify({
          type: 'immofinder_enrich_existing_fatal',
          error: String((e as Error)?.message || e).slice(0, 200),
        }));
      });
    } catch (e) {
      return res.status(500).json({ success: false, error: String((e as Error)?.message || e).slice(0, 160), code: 'IMMOFINDER_FAILED' });
    }
  });

  app.post('/api/immofinder/cleanup', json, async (_req, res) => {
    try { res.json({ success: true, hidden: await cleanupStored() }); } catch { res.status(500).json({ success: false, error: 'Cleanup failed', code: 'IMMOFINDER_FAILED' }); }
  });

  /** Re-check all visible listings with current parsers/filters; hide junk and fix prices when possible. */
  app.get('/api/immofinder/recheck-list-status', async (_req, res) => {
    res.json({ success: true, job: { ...refreshStatus } });
  });

  /** Recheck feed: re-fetch pages, hide delisted, refresh dates/contacts, then apply local quality filters. */
  app.post('/api/immofinder/recheck-list', json, async (_req, res) => {
    if (refreshStatus.running) return res.status(409).json({ success: false, error: 'Recheck list is already running', code: 'RECHECK_IN_PROGRESS' });
    try {
      const cfg = loadImmoConfig();
      const rows = await listListingsForRefresh();
      const fetchPage = createPoliteFetch(cfg);
      const enrichCfg = resolveEnrichmentConfig(cfg);
      // Contact searches during Recheck rarely add contacts (P129.44); they run only when the saved setting allows them.
      const allowRecheckSearch = (await getSettings(cfg)).search.recheckContactSearch === true;
      const search = process.env.SERPER_API_KEY ? createSerperSearch(fetch, cfg.discovery?.resultsPerQuery ?? 10) : null;
      // Enrichment limits are run-wide; sharing the budget prevents one search per saved row from multiplying costs.
      const refreshSearchBudget = { searchesLeft: Math.max(0, Number(enrichCfg.maxExtraSearchesPerRun) || 0), reverseImageLeft: 0 };
      res.status(202).json({ success: true, queued: rows.length });
      void runRefreshJob(rows, {
        fetchPage,
        platformDomains: cfg.platformDomains || [],
        enrich: allowRecheckSearch && enrichCfg.enabled && search ? (input) => enrichContacts(input, {
          config: enrichCfg, search, fetchPage, budget: refreshSearchBudget,
        }) : undefined,
        update: updateListingContacts,
        log: (level, event, details) => immoLog(level, event, details),
      }, refreshStatus).then(async () => {
        refreshStatus.running = true;
        refreshStatus.phase = 'searching';
        refreshStatus.message = `${String(refreshStatus.message || '').trim()} · applying quality filters…`;
        try {
          const fr = await recheckStored();
          const base = String(refreshStatus.message || '').replace(/\s· applying quality filters…$/, '').trim();
          refreshStatus.message = `${base}${base ? ' · ' : ''}filters: hid ${fr.hidden}, price fixed ${fr.priceFixed}`;
          immoLog('info', 'immofinder_recheck_filters_after_refresh', { checked: fr.checked, hidden: fr.hidden, priceFixed: fr.priceFixed });
        } catch (fe) {
          const detail = String((fe as Error)?.message || fe).slice(0, 120);
          refreshStatus.message = `${String(refreshStatus.message || '').trim()} · filters error: ${detail}`;
          immoLog('warn', 'immofinder_recheck_filters_after_refresh_failed', { error: detail });
        } finally {
          refreshStatus.running = false;
          refreshStatus.phase = 'done';
          refreshStatus.finishedAt = Date.now();
        }
      }).catch((e) => {
        refreshStatus.running = false; refreshStatus.phase = 'done'; refreshStatus.finishedAt = Date.now();
        refreshStatus.errors++; refreshStatus.message = `Recheck failed: ${String((e as Error)?.message || e).slice(0, 120)}`;
        console.error(JSON.stringify({ type: 'immofinder_recheck_list_fatal', error: refreshStatus.message }));
      });
    } catch (e) {
      return res.status(500).json({ success: false, error: String((e as Error)?.message || e).slice(0, 160), code: 'IMMOFINDER_FAILED' });
    }
  });

  app.post('/api/immofinder/recheck', json, async (_req, res) => {
    try {
      const result = await recheckStored();
      res.json({ success: true, ...result });
    } catch (e) {
      const detail = String((e as Error)?.message || e).replace(/\s+/g, ' ').slice(0, 160);
      console.error(JSON.stringify({ type: 'immofinder_recheck_failed', detail }));
      res.status(500).json({ success: false, error: detail || 'Recheck failed', code: 'IMMOFINDER_FAILED' });
    }
  });

  /** Delete all listings + seen cache (+ progress); optionally clear Drive Sheet/Doc. */
  app.post('/api/immofinder/reset', json, async (req, res) => {
    try {
      const wipe = await wipeAllListings();
      let drive: { status: string; url?: string } | undefined;
      const cfg = loadImmoConfig();
      const settings = await getSettings(cfg);
      const folder = driveFolder(settings.delivery?.driveFolderId || cfg.driveFolderId || '');
      if (req.body?.clearDrive !== false && folder) {
        drive = await clearDriveExport(folder);
      }
      res.json({ success: true, wipe, drive: drive || { status: 'skipped' } });
    } catch (e) {
      res.status(500).json({ success: false, error: String((e as Error)?.message || e).slice(0, 200), code: 'IMMOFINDER_FAILED' });
    }
  });

  app.get('/api/immofinder/runs/latest', async (_req, res) => {
    try { res.json({ success: true, run: await latestRun() }); } catch { res.status(500).json({ success: false, error: 'Run status unavailable', code: 'IMMOFINDER_FAILED' }); }
  });

  app.get('/api/immofinder/settings', async (_req, res) => {
    try { const cfg = loadImmoConfig(); res.json({ success: true, settings: await getSettings(cfg), channels: channelStatus(), communes: cfg.municipalities, timezone: TIMEZONE }); }
    catch { res.status(500).json({ success: false, error: 'Settings unavailable', code: 'IMMOFINDER_FAILED' }); }
  });

  app.put('/api/immofinder/settings', json, async (req, res) => {
    try { const cfg = loadImmoConfig(); res.json({ success: true, settings: await saveSettings(cfg, req.body), channels: channelStatus() }); }
    catch { res.status(500).json({ success: false, error: 'Settings could not be saved', code: 'IMMOFINDER_FAILED' }); }
  });

  app.post('/api/immofinder/settings/prepare-chur-test', json, async (req, res) => {
    if (!secretOk(req)) return res.status(401).json({ success: false, error: 'Invalid test secret', code: 'UNAUTHORIZED' });
    if (!process.env.DATABASE_URL) return res.status(503).json({ success: false, error: 'Settings store unavailable', code: 'DATABASE_UNAVAILABLE' });
    try {
      const cfg = loadImmoConfig();
      const settings = await saveSettings(cfg, churTestSettings(cfg));
      return res.json({ success: true, settings, channels: channelStatus(), communes: cfg.municipalities, timezone: TIMEZONE });
    } catch {
      return res.status(500).json({ success: false, error: 'Chur test profile could not be applied', code: 'IMMOFINDER_FAILED' });
    }
  });

  app.post('/api/immofinder/settings/reset', json, async (_req, res) => {
    try {
      const cfg = loadImmoConfig();
      const current = await getSettings(cfg);
      const defaults = defaultSettings(cfg);
      // Reset search behaviour without silently disabling a user-configured e-mail destination.
      const settings = await saveSettings(cfg, {
        ...defaults,
        delivery: {
          ...defaults.delivery,
          email: Boolean(current.delivery.emailTo),
          emailTo: current.delivery.emailTo,
        },
      });
      res.json({ success: true, settings, channels: channelStatus(), communes: cfg.municipalities, timezone: TIMEZONE });
    } catch {
      res.status(500).json({ success: false, error: 'Default settings could not be applied', code: 'IMMOFINDER_FAILED' });
    }
  });

  app.post('/api/immofinder/settings/test', json, async (req, res) => {
    const channel = String(req.body?.channel || '');
    try {
      const s = await getSettings(loadImmoConfig());
      if (channel === 'telegram') return res.json({ success: true, result: await sendTelegram('ImmoFinder test message: Telegram delivery works.') });
      if (channel === 'email') return res.json({ success: true, result: s.delivery.emailTo ? await sendEmail(s.delivery.emailTo, 'ImmoFinder test message', 'ImmoFinder test message: email delivery works.') : 'skipped: save an email address first' });
      if (channel === 'drive') return res.json({ success: true, result: await checkDrive(driveFolder(s.delivery.driveFolderId)) });
      return res.status(400).json({ success: false, error: 'Unknown channel', code: 'INVALID_REQUEST' });
    } catch { return res.status(500).json({ success: false, error: 'Test failed', code: 'IMMOFINDER_FAILED' }); }
  });


  app.post('/api/immofinder/stop', json, async (_req, res) => {
    try {
      const latest = await latestRun();
      if (!latest || latest.finished_at) return res.json({ success: true, stopped: false, reason: 'no_active_run' });
      await requestRunCancel(String(latest.id));
      return res.json({ success: true, stopped: true, runId: latest.id, state: 'cancellation_requested' });
    } catch {
      return res.status(500).json({ success: false, error: 'Could not stop run', code: 'IMMOFINDER_FAILED' });
    }
  });

  /** Diagnostics: is a scheduled search due right now? (no side effects) */
  app.get('/api/immofinder/schedule-status', async (_req, res) => {
    try {
      const settings = await getSettings(loadImmoConfig());
      const lastAt = await lastRealRunAt();
      const now = new Date();
      const due = isDue(settings.schedule, lastAt, now);
      res.json({
        success: true,
        timezone: TIMEZONE,
        now: now.toISOString(),
        schedule: settings.schedule,
        lastRealRunAt: lastAt ? lastAt.toISOString() : null,
        due,
        reason: due ? 'due' : (settings.schedule.mode === 'manual' ? 'manual_only' : 'not_due'),
        secretConfigured: Boolean(process.env.IMMOFINDER_RUN_SECRET && process.env.IMMOFINDER_RUN_SECRET.length >= 16),
        note: 'In-process scheduler checks about every 10 minutes when schedule.mode is hours/daily. External cron is optional.',
      });
    } catch (e) {
      res.status(500).json({ success: false, error: String((e as Error)?.message || e).slice(0, 160) });
    }
  });

  app.post('/api/immofinder/run', json, async (req, res) => {
    const testMode = req.body?.testMode === true;
    if (testMode && (!(req as any).immoCron || req.body?.dryRun !== true)) return res.status(403).json({ success: false, error: 'Bounded test runs require the run secret and dryRun=true', code: 'TEST_RUN_FORBIDDEN' });
    const dryRun = testMode || req.body?.dryRun === true;
    // C131 manual run is outcome-first: the source-first full pass is the safe default.
    // Users can still explicitly request { wave: 'carousel' } for a rotating slice.
    const defaultWave: 'carousel' | 'full' = 'full';
    const waveRaw = String(req.body?.wave || defaultWave).toLowerCase();
    // Product modes: carousel | full. Legacy priority→carousel, extended→full.
    const wave: 'carousel' | 'full' =
      testMode ? 'full' : waveRaw === 'carousel' || waveRaw === 'priority' ? 'carousel' :
      waveRaw === 'full' || waveRaw === 'extended' ? 'full' :
      defaultWave;
    const trigger = testMode ? 'manual' : (req as any).immoCron ? 'schedule' : 'manual';
    let settings; try { settings = await getSettings(loadImmoConfig()); } catch { return res.status(500).json({ success: false, error: 'Settings unavailable', code: 'IMMOFINDER_FAILED' }); }
    if (trigger === 'schedule') {
      let lastAt: Date | null = null;
      let due = false;
      let dueError: string | null = null;
      try {
        lastAt = await lastRealRunAt();
        due = isDue(settings.schedule, lastAt, new Date());
      } catch (e) {
        dueError = String((e as Error)?.message || e).slice(0, 120);
      }
      const skipped = !due ? (settings.schedule.mode === 'manual' ? 'manual_only' : 'not_due') : null;
      console.info(JSON.stringify({
        type: 'immofinder_schedule_tick',
        trigger: 'schedule',
        mode: settings.schedule.mode,
        everyHours: settings.schedule.everyHours,
        dailyAt: settings.schedule.dailyAt,
        timezone: TIMEZONE,
        due,
        skipped,
        lastRealRunAt: lastAt ? lastAt.toISOString() : null,
        now: new Date().toISOString(),
        dueError,
      }));
      if (!due) return res.json({ success: true, skipped: skipped || 'not_due' });
    } else {
      console.info(JSON.stringify({ type: 'immofinder_run_start', trigger: 'manual', dryRun }));
    }
    let runId: string | null;
    try {
      if (testMode) runId = await startRun(trigger, dryRun, { settings, wave, cycle: await realRunCount(), testMode });
      else runId = await startRun(trigger, dryRun, { settings, wave, cycle: await realRunCount() });
    } catch { return res.status(500).json({ success: false, error: 'Could not start run', code: 'IMMOFINDER_FAILED' }); }
    if (!runId) {
      console.warn(JSON.stringify({ type: 'immofinder_run_rejected', code: 'RUN_IN_PROGRESS', trigger }));
      return res.status(409).json({ success: false, error: 'A run is already in progress', code: 'RUN_IN_PROGRESS' });
    }
    console.info(JSON.stringify({ type: 'immofinder_run_accepted', trigger, runId, dryRun, wave }));
    res.status(202).json({ success: true, runId, dryRun, wave });
    // The durable PostgreSQL worker claims and executes this queued run.
  });

    const executeQueuedRun = async (job: any, workerId: string, leaseLost: () => boolean) => {
    const runId = String(job.id);
    const progress = job.progress && typeof job.progress === 'object' ? { ...job.progress } : {};
    const settings = progress.settingsSnapshot || await getSettings(loadImmoConfig());
    const wave: 'carousel' | 'full' = progress.wave === 'full' ? 'full' : 'carousel';
    const dryRun = Boolean(job.dry_run);
    if (job.cancel_requested) {
      markRunCancelLocal(runId);
      await finishRunCancelled(runId, { ...(progress.counts || {}), filtered: progress.filtered || {}, sourceStats: progress.sourceStats || [] }, workerId);
      return;
    }

      const log: { t: number; text: string }[] = []; let lastSave = 0; let ev: { stage: string; text: string; current?: number; total?: number; counts?: Record<string, number>; communes?: string[] } = { stage: 'catalogue', text: 'Starting' };
      const push = (e: typeof ev, force = false) => {
        ev = e; log.push({ t: Date.now(), text: e.text }); if (log.length > 40) log.shift();
        const n = Date.now(); if (!force && n - lastSave < 700) return; lastSave = n;
        void saveWorkerProgress(runId, workerId, { stage: e.stage, text: e.text, current: e.current, total: e.total, counts: e.counts ?? {}, communes: e.communes, log }).catch(() => {});
      };
      push(ev, true);
      const errors: unknown[] = [];
      let result = null as Awaited<ReturnType<typeof runPipeline>> | null;
      let pipelineCompleted = false;
      const delivery: Record<string, string> = { ...((progress.deliveryResults && typeof progress.deliveryResults === 'object') ? progress.deliveryResults : {}) };
      const deliveryCompleted = new Set<string>(Array.isArray(progress.deliveryCompleted) ? progress.deliveryCompleted.filter((v: unknown): v is string => typeof v === 'string') : []);
      const waveAListingIds = new Set<string>(Array.isArray(progress.waveAListingIds) ? progress.waveAListingIds.filter((v: unknown): v is string => typeof v === 'string') : []);
      const runStartedAtMs = new Date(job.started_at).getTime();
      const persistDelivery = async (key: string, status: string) => {
        delivery[key] = status;
        deliveryCompleted.add(key);
        const patch = { deliveryResults: { ...delivery }, deliveryCompleted: [...deliveryCompleted] };
        const saved = await saveWorkerProgress(runId, workerId, patch);
        if (!saved) throw new Error('worker_lease_lost_while_saving_delivery');
        Object.assign(progress, patch);
      };
      try {
        immoLog('info', 'database_diagnostics_start', await immoDatabaseDiagnostics(), 'ImmoFinder database snapshot before run');
        const baseCfg = applySettings(loadImmoConfig(), settings);
        const cfg = progress.testMode === true ? applyImmoFinderTestBudget(baseCfg) : baseCfg;
        if (progress.testMode !== true) {
          try { const h = await cleanupStored(); if (h) push({ stage: 'catalogue', text: `Hid ${h} saved results that are not suitable`, counts: {} }, true); } catch { /* cleanup is optional */ }
        }
        const dl = settings.delivery;
        const deliverWave = async (wave: 'priority' | 'extended' | 'carousel', newInWave: { canonical_key: string }[], counts: Record<string, number>) => {
          const label = immofinderWaveLabel(wave);
          const all = (await listListingsForRefresh()).filter((r: any) => !r.hidden);
          const runNew = all.filter((row: any) => {
            const firstSeen = new Date(row.first_seen_at).getTime();
            return Number.isFinite(firstSeen) && firstSeen >= runStartedAtMs;
          });
          const fallbackKeys = new Set(newInWave.map((row) => row.canonical_key));
          const candidates = runNew.length ? runNew : all.filter((row: any) => fallbackKeys.has(row.canonical_key));
          const fresh = wave === 'extended'
            ? candidates.filter((row: any) => !waveAListingIds.has(String(row.id)))
            : candidates;
          const emailAllMode = dl.emailContent === 'all';
          const emailRows = emailAllMode ? all : fresh;
          const notifyTelegram = fresh.length > 0 || dl.notifyWhenEmpty;
          const notifyEmail = emailRows.length > 0 || dl.notifyWhenEmpty;
          const head = `ImmoFinder ${label}: ${fresh.length} new · kept=${counts.kept ?? 0} · fetched=${counts.fetched ?? 0}`;
          push({ stage: 'delivery', text: `${label}: email=${emailAllMode ? `all ${emailRows.length}` : `${fresh.length} new`} · telegram=${fresh.length} new`, counts }, true);

          if (dl.drive) {
            const key = `${wave}:drive`;
            if (deliveryCompleted.has(key)) delivery.drive = delivery[`${wave}_drive`] || 'already exported';
            else {
              try {
                const d = await exportDrive(all, driveFolder(dl.driveFolderId));
                if (d.url) delivery.driveUrl = d.url;
                delivery[`${wave}_drive`] = d.status;
                delivery.drive = d.status;
                await persistDelivery(key, d.status);
              } catch (e) {
                const detail = String((e as Error)?.message || e).slice(0, 160);
                delivery[`${wave}_drive`] = `error: ${detail}`;
                errors.push({ code: `${wave}_drive_delivery_failed`, detail });
              }
            }
          } else delivery.drive = 'off';

          if (dl.telegram) {
            const key = `${wave}:telegram`;
            if (deliveryCompleted.has(key)) delivery.telegram = delivery[`${wave}_telegram`] || 'already sent';
            else {
              try {
                const status = notifyTelegram
                  ? await sendTelegram(formatListingsText(fresh, { heading: head, limit: 6, driveUrl: delivery.driveUrl }))
                  : 'skipped: nothing new';
                delivery[`${wave}_telegram`] = status;
                delivery.telegram = status;
                await persistDelivery(key, status);
              } catch (e) {
                const detail = String((e as Error)?.message || e).slice(0, 160);
                delivery[`${wave}_telegram`] = `error: ${detail}`;
                errors.push({ code: `${wave}_telegram_delivery_failed`, detail });
              }
            }
          } else delivery.telegram = 'off';

          if (dl.email && dl.emailTo) {
            const key = `${wave}:email`;
            if (deliveryCompleted.has(key)) delivery.email = delivery[`${wave}_email`] || 'already sent';
            else {
              try {
                const status = notifyEmail
                  ? await sendEmail(
                    dl.emailTo,
                    emailAllMode
                      ? `ImmoFinder ${label}: all ${emailRows.length} listings (${fresh.length} new in wave)`
                      : `ImmoFinder ${label}: ${fresh.length} new listings`,
                    formatListingsText(emailRows, {
                      heading: emailAllMode
                        ? `${head}\nAll current listings (${emailRows.length}), newest first:`
                        : head,
                      limit: emailAllMode ? 60 : 30,
                      driveUrl: delivery.driveUrl,
                    }),
                  )
                  : (emailAllMode ? 'skipped: no listings' : 'skipped: nothing new');
                delivery[`${wave}_email`] = status;
                delivery.email = status;
                await persistDelivery(key, status);
              } catch (e) {
                const detail = String((e as Error)?.message || e).slice(0, 160);
                delivery[`${wave}_email`] = `error: ${detail}`;
                errors.push({ code: `${wave}_email_delivery_failed`, detail });
              }
            }
          } else delivery.email = 'off';

          if (wave === 'priority' || wave === 'carousel') {
            for (const row of candidates) waveAListingIds.add(String(row.id));
            const patch = { waveAListingIds: [...waveAListingIds], deliveryResults: { ...delivery }, deliveryCompleted: [...deliveryCompleted] };
            const saved = await saveWorkerProgress(runId, workerId, patch);
            if (!saved) throw new Error('worker_lease_lost_while_saving_wave_delivery');
            Object.assign(progress, patch);
          }
        };
        result = await runPipeline({
          config: cfg,
          fetchPage: createPoliteFetch(cfg, fetch, undefined, { allowJina: false, allowBrowser: true }),
          llm: null,
          store: createPgStore(),
          onProgress: push,
          maxLlmCalls: 0,
          search: null,
          cycle: Number(progress.cycle ?? 0),
          resume: {
            completedQueryKeys: Array.isArray(progress.completedQueryKeys) ? progress.completedQueryKeys : [],
            discoveryProcessedItems: Number(progress.discoveryProcessedItems) || 0,
            counts: progress.counts && typeof progress.counts === 'object' ? progress.counts : {},
            filtered: progress.filtered && typeof progress.filtered === 'object' ? progress.filtered : {},
            sourceStats: Array.isArray(progress.sourceStats) ? progress.sourceStats : [],
            wavesRun: Array.isArray(progress.wavesRun) ? progress.wavesRun : [],
          },
          onCheckpoint: async (checkpoint) => {
            const patch = { ...checkpoint, checkpointAt: new Date().toISOString() };
            const saved = await saveWorkerProgress(runId, workerId, patch);
            if (!saved) throw new Error('worker_lease_lost_before_query_checkpoint');
            Object.assign(progress, patch);
          },
          shouldCancel: () => isRunCancelled(runId) || workerStopping || leaseLost(),
          onWaveComplete: dryRun ? undefined : async ({ wave, newInWave, counts }) => {
            try { await deliverWave(wave, newInWave, counts); }
            catch (e) { errors.push({ code: `${wave}_delivery_failed`, detail: String((e as Error)?.message || e).slice(0, 200) }); }
          },
        }, { dryRun, wave, testMode: progress.testMode === true });
        pipelineCompleted = true;
        immoLog('info', 'database_diagnostics_end', await immoDatabaseDiagnostics(), 'ImmoFinder database snapshot after run');
        errors.push(...(result.errors || []));
        try {
          const saved = await listListings(null, { includeHidden: true });
          immoLog(
            'info',
            'search_quality_summary',
            searchQualityPayload({
              runId,
              wave,
              counts: result.counts,
              filtered: result.filtered,
              errors: result.errors?.length || 0,
              sourceStats: result.sourceStats || [],
              wavesRun: result.wavesRun || [],
              savedRows: saved,
              preview: result.preview || [],
            }),
            'Search quality, card completeness and weak-sample summary for All Logs',
          );
        } catch (diagError) {
          immoLog('warn', 'search_quality_summary_failed', { runId, error: String((diagError as Error)?.message || diagError).slice(0, 120) });
        }
        const rowsSinceRunStart = (await listListingsForRefresh()).filter((row: any) => {
          if (row.hidden) return false;
          const firstSeen = new Date(row.first_seen_at).getTime();
          return Number.isFinite(firstSeen) && firstSeen >= runStartedAtMs;
        });
        if (result) {
          result.counts.new = rowsSinceRunStart.length;
          result.newListings = rowsSinceRunStart as any;
        }
        if (!dryRun && dl.notifyWhenEmpty && rowsSinceRunStart.length === 0) {
          await deliverWave('extended', [], result?.counts ?? {});
        }
      } catch (e) { errors.push({ code: 'run_failed', detail: String((e as Error)?.message || e).slice(0, 200) }); }
      if (leaseLost()) return;
      if (workerStopping && (!pipelineCompleted || result?.errors?.some((e) => e.code === 'cancelled'))) {
        await releaseRunForRetry(runId, workerId, 'Render is replacing this instance; the queued run will resume on the new process');
        return;
      }
      try {
        if (isRunCancelled(runId)) await finishRunCancelled(runId, { ...(result?.counts ?? progress.counts ?? {}), filtered: result?.filtered ?? progress.filtered ?? {}, sourceStats: result?.sourceStats ?? progress.sourceStats ?? [] }, workerId);
        else await finishRun(runId, result, errors, delivery, workerId);
      } catch { /* lease expiry lets another process recover the run */ }
      const diagnosticsStatus = await publishGitHubDiagnosticsAfterRun(runId!, result, errors);
      const snapshotStatus = progress.testMode === true ? 'skipped:test_mode' : await publishGitHubSnapshotAfterRun(runId!);
      clearRunCancel(runId!);
      immoLog('info', 'immofinder_worker_run_finalized', { runId, diagnosticsStatus, snapshotStatus, counts: result?.counts ?? {} });

  };
  // PostgreSQL-backed queue consumer; expired leases are recovered by the next app process.
  const workerDisabled = process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT) || process.env.IMMOFINDER_DISABLE_WORKER === '1';
  if (!workerDisabled && !stopImmoFinderWorkerImpl) {
    let active: Promise<void> | null = null;
    let polling = false;
    const workerId = `immo-${process.pid}-${crypto.randomUUID()}`;
    const tick = async () => {
      if (workerStopping || polling || active) return;
      polling = true;
      try {
        const job = await claimNextRun(workerId);
        if (!job) return;
        let leaseLost = false;
        const heartbeat = setInterval(() => {
          void renewRunLease(String(job.id), workerId).then((cancelled) => {
            if (cancelled === null) leaseLost = true;
            else if (cancelled) markRunCancelLocal(String(job.id));
          }).catch((error) => {
            leaseLost = true;
            console.warn(JSON.stringify({ type: 'immofinder_worker_heartbeat_failed', runId: job.id, leaseLost: true, error: String((error as Error)?.message || error).slice(0, 120) }));
          });
        }, 10_000);
        heartbeat.unref();
        active = (async () => {
          try { await executeQueuedRun(job, workerId, () => leaseLost); }
          catch (error) {
            if (!leaseLost) await releaseRunForRetry(String(job.id), workerId, `Worker error: ${String((error as Error)?.message || error).slice(0, 160)}`).catch(() => {});
            console.error(JSON.stringify({ type: 'immofinder_worker_run_failed', runId: job.id, error: String((error as Error)?.message || error).slice(0, 200) }));
          } finally { clearInterval(heartbeat); active = null; }
        })();
        await active;
      } finally { polling = false; }
    };
    const timer = setInterval(() => { void tick().catch((error) => console.warn(JSON.stringify({ type: 'immofinder_worker_poll_failed', error: String((error as Error)?.message || error).slice(0, 120) }))); }, 15_000);
    timer.unref();
    stopImmoFinderWorkerImpl = async () => {
      workerStopping = true;
      clearInterval(timer);
      if (active) await Promise.race([active, new Promise((resolve) => setTimeout(resolve, 20_000))]);
    };
    console.info(JSON.stringify({ type: 'immofinder_durable_worker_started', workerId, pollMs: 15_000 }));
    void tick().catch((error) => console.warn(JSON.stringify({ type: 'immofinder_worker_initial_poll_failed', error: String((error as Error)?.message || error).slice(0, 120) })));
  }
// One-time owner-approved scope expansion. A persisted updated_at guard prevents repeats after restarts.
  const scopeExpandAfterMs = Date.parse('2026-11-26T15:24:00Z');
  if (Number.isFinite(scopeExpandAfterMs) && process.env.NODE_ENV !== 'test' && !process.env.NODE_TEST_CONTEXT && process.env.DATABASE_URL) {
    const scopeExpandTimer = setTimeout(() => {
      void (async () => {
        const cfg = loadImmoConfig();
        const updatedAt = await getSettingsUpdatedAt();
        if (updatedAt && updatedAt.getTime() >= scopeExpandAfterMs) {
          immoLog('info', 'immofinder_scope_expansion_skipped', { reason: 'settings_already_updated', updatedAt: updatedAt.toISOString() });
          return;
        }
        const current = await getSettings(cfg);
        const sourceIds = [...new Set([...Object.keys(current.search.sources), ...(cfg.sources || []).map((s) => s.id)])];
        const expanded = await saveSettings(cfg, {
          ...current,
          schedule: { ...current.schedule, mode: 'manual' },
          delivery: { ...current.delivery, telegram: false, email: false, emailTo: '', drive: false, driveFolderId: '', notifyWhenEmpty: false },
          search: {
            ...current.search,
            communes: [...cfg.municipalities],
            minRooms: 2,
            municipalityGroups: { group1: true, group2: true },
            sources: Object.fromEntries(sourceIds.map((id) => [id, !['portal-anibis', 'portal-tutti'].includes(id)])),
            profile: 'burst',
            defaultWave: 'full',
            carouselCommunesPerRun: cfg.municipalities.length,
            maxAiPages: 200,
            enrichSearchesPerRun: 0,
            recheckContactSearch: false,
            limitPrice: false,
            maxListingAgeDays: 0,
            requirePrice: false,
            requireContact: false,
            rejectSeekerPosts: true,
          },
        });
        const clearedSeen = await clearC131PilotSeen();
        const runId = await startRun('manual', false, { settings: expanded, wave: 'full', cycle: await realRunCount() });
        immoLog('info', 'immofinder_scope_expansion_applied', {
          communes: expanded.search.communes.length,
          minRooms: expanded.search.minRooms,
          enabledSources: Object.entries(expanded.search.sources).filter(([, enabled]) => enabled).map(([id]) => id),
          runId,
          clearedSeen,
          deliveryDisabled: true,
          paidDiscoveryDisabled: true,
        });
      })().catch((error) => immoLog('error', 'immofinder_scope_expansion_failed', { error: String((error as Error)?.message || error).slice(0, 180) }));
    }, 15_000);
    scopeExpandTimer.unref();
  }

// One-time production smoke hook. It is inert unless an explicit ISO threshold is set in Render.
  // lastRealRunAt is persisted in PostgreSQL, so later restarts cannot repeat this run.
  const bootRunAfterMs = Date.parse(String(process.env.IMMOFINDER_BOOT_RUN_AFTER || ''));
  if (Number.isFinite(bootRunAfterMs) && process.env.NODE_ENV !== 'test' && !process.env.NODE_TEST_CONTEXT && process.env.DATABASE_URL) {
    const bootRunTimer = setTimeout(() => {
      void (async () => {
        try {
          const lastAt = await lastRealRunAt();
          if (lastAt && lastAt.getTime() >= bootRunAfterMs) {
            immoLog('info', 'immofinder_boot_run_skipped', { reason: 'threshold_already_satisfied', lastRealRunAt: lastAt.toISOString() });
            return;
          }
          const settings = await getSettings(loadImmoConfig());
          const runId = await startRun('manual', false, { settings, wave: 'full', cycle: await realRunCount() });
          if (!runId) {
            immoLog('warn', 'immofinder_boot_run_skipped', { reason: 'another_run_is_active' });
            return;
          }
          immoLog('info', 'immofinder_boot_run_accepted', { runId, wave: 'full', dryRun: false });
        } catch (error) {
          immoLog('error', 'immofinder_boot_run_failed', { error: String((error as Error)?.message || error).slice(0, 180) });
        }
      })();
    }, 30_000);
    bootRunTimer.unref();
  }

// --- In-process schedule (default hourly carousel; no external cron required) ---
  // Checks every 10 minutes; isDue() enforces everyHours / dailyAt. Manual mode still disables auto-runs.
  // Do not start timers under node:test / explicit disable — they keep the event loop alive and time out CI.
  const scheduleDisabled =
    process.env.IMMOFINDER_DISABLE_INTERNAL_SCHEDULE === '1' ||
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.NODE_TEST_CONTEXT);
  const g = globalThis as unknown as { __immoInternalScheduleStarted?: boolean };
  if (!scheduleDisabled && !g.__immoInternalScheduleStarted) {
    g.__immoInternalScheduleStarted = true;
    const CHECK_MS = 10 * 60 * 1000;
    const bootDelayMs = 75_000;
    const internalTick = async () => {
      try {
        if (!process.env.DATABASE_URL) return;
        const settings = await getSettings(loadImmoConfig());
        const lastAt = await lastRealRunAt();
        const now = new Date();
        const due = isDue(settings.schedule, lastAt, now);
        console.info(JSON.stringify({
          type: 'immofinder_schedule_tick',
          trigger: 'internal',
          mode: settings.schedule.mode,
          everyHours: settings.schedule.everyHours,
          dailyAt: settings.schedule.dailyAt,
          timezone: TIMEZONE,
          due,
          skipped: due ? null : (settings.schedule.mode === 'manual' ? 'manual_only' : 'not_due'),
          lastRealRunAt: lastAt ? lastAt.toISOString() : null,
          now: now.toISOString(),
        }));
        if (!due) return;

        let wave: 'carousel' | 'full' = 'carousel';
        if (settings.search?.profile === 'carousel') wave = 'carousel';
        else if ((settings.search?.defaultWave as string) === 'priority') wave = 'carousel'; // legacy priority → carousel
        else wave = 'full';

        const dryRun = false;
        const trigger = 'schedule';
        let runId: string | null = null;
        try { runId = await startRun(trigger, dryRun, { settings, wave, cycle: await realRunCount() }); } catch (e) {
          console.warn(JSON.stringify({ type: 'immofinder_run_rejected', code: 'START_FAILED', trigger: 'internal', detail: String((e as Error)?.message || e).slice(0, 120) }));
          return;
        }
        if (!runId) {
          console.warn(JSON.stringify({ type: 'immofinder_run_rejected', code: 'RUN_IN_PROGRESS', trigger: 'internal' }));
          return;
        }
        console.info(JSON.stringify({ type: 'immofinder_run_accepted', trigger: 'internal', runId, dryRun, wave }));

        // Scheduled runs are consumed by the same durable PostgreSQL worker.
      } catch (e) {
        console.warn(JSON.stringify({ type: 'immofinder_schedule_tick', trigger: 'internal', error: String((e as Error)?.message || e).slice(0, 160) }));
      }
    };
    setTimeout(() => {
      void internalTick();
      setInterval(() => { void internalTick(); }, CHECK_MS);
      console.info(JSON.stringify({ type: 'immofinder_internal_schedule_started', checkEveryMin: 10, bootDelaySec: bootDelayMs / 1000 }));
    }, bootDelayMs);
  }
}
