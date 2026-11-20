import crypto from 'node:crypto';
import express, { type Express, type Request } from 'express';
import { isSameOrigin } from './security.ts';
import { createPoliteFetch } from './immofinderFetcher.ts';
import { runPipeline } from './immofinderPipeline.ts';
import { channelStatus, checkDrive, exportDrive, clearDriveExport, formatListingsText, sendEmail, sendTelegram } from './immofinderDelivery.ts';

/** User-facing run name: only Carousel vs Full (settings). Internal priority/extended map to these. */
function immofinderWaveLabel(wave: string): string {
  const w = String(wave || '').toLowerCase();
  if (w === 'carousel') return 'Carousel';
  if (w === 'full' || w === 'extended') return 'Full search';
  if (w === 'priority') return 'Full search'; // legacy internal phase name — not a separate product mode
  return 'Search';
}
import { TIMEZONE, applySettings, isDue, parseDriveFolderId } from './immofinderSettings.ts';
import { createSerperSearch } from './immofinderDiscovery.ts';
import { STATUSES, createPgStore, cleanupStored, recheckStored, wipeAllListings, finishRun, finishRunCancelled, getSettings, hiddenCount, isRunCancelled, lastRealRunAt, latestRun, listListings, listListingsForRefresh, listListingsNeedingContact, loadImmoConfig, realRunCount, requestRunCancel, saveProgress, saveSettings, setStatus, deleteListing, startRun, clearRunCancel, updateListingContacts } from './immofinderStore.ts';
import { resolveEnrichmentConfig, enrichContacts, applyEnrichmentToRecord, type EnrichmentInput } from './immofinderContactEnrichment.ts';
import { runRefreshJob, newRefreshStatus, type RefreshStatus } from './immofinderRefresh.ts';
import { immoLog, completenessSummary } from './immofinderDiag.ts';

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

/** Cron call shape (POST /api/immofinder/run with X-Immofinder-Secret). Lets it past the global session gate only; the secret itself is verified in registerImmoFinderRoutes. */
export function isImmoCronCall(req: Request): boolean {
  return req.method === 'POST' && req.path === '/api/immofinder/run' && Boolean(req.get('x-immofinder-secret'));
}

/** Folder precedence: saved setting, then env, then the config default. */
function driveFolder(saved: string): string {
  return saved || parseDriveFolderId(process.env.IMMOFINDER_DRIVE_FOLDER_ID) || parseDriveFolderId(loadImmoConfig().driveFolderId);
}

export function registerImmoFinderRoutes(app: Express, deps: ImmoRouteDeps): void {
  const json = express.json({ limit: '10kb' });
  app.use('/api/immofinder', (req, res, next) => {
    const isRunPost = req.method === 'POST' && req.path === '/run';
    const hasSecretHeader = Boolean(String(req.get('x-immofinder-secret') || ''));
    const secretConfigured = Boolean(process.env.IMMOFINDER_RUN_SECRET && process.env.IMMOFINDER_RUN_SECRET.length >= 16);
    const cron = isRunPost && secretOk(req);
    if (isRunPost) {
      console.info(JSON.stringify({
        type: 'immofinder_run_request',
        via: cron ? 'schedule_secret' : (hasSecretHeader ? 'bad_or_short_secret' : 'session'),
        secretHeaderPresent: hasSecretHeader,
        secretConfigured,
        cronAuth: cron,
      }));
    }
    if (!cron) {
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
    (req as any).immoCron = cron; next();
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

  /** Recheck dates and contact details on every stored listing, including hidden rows. */
  app.post('/api/immofinder/recheck-list', json, async (_req, res) => {
    if (refreshStatus.running) return res.status(409).json({ success: false, error: 'Recheck list is already running', code: 'RECHECK_IN_PROGRESS' });
    try {
      const cfg = loadImmoConfig();
      const rows = await listListingsForRefresh();
      const fetchPage = createPoliteFetch(cfg);
      const enrichCfg = resolveEnrichmentConfig(cfg);
      const search = process.env.SERPER_API_KEY ? createSerperSearch(fetch, cfg.discovery?.resultsPerQuery ?? 10) : null;
      // Enrichment limits are run-wide; sharing the budget prevents one search per saved row from multiplying costs.
      const refreshSearchBudget = { searchesLeft: Math.max(0, Number(enrichCfg.maxExtraSearchesPerRun) || 0), reverseImageLeft: 0 };
      res.status(202).json({ success: true, queued: rows.length });
      void runRefreshJob(rows, {
        fetchPage,
        platformDomains: cfg.platformDomains || [],
        enrich: enrichCfg.enabled && search ? (input) => enrichContacts(input, {
          config: enrichCfg, search, fetchPage, budget: refreshSearchBudget,
        }) : undefined,
        update: updateListingContacts,
        log: (level, event, details) => immoLog(level, event, details),
      }, refreshStatus).catch((e) => {
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
      requestRunCancel(String(latest.id));
      await finishRunCancelled(String(latest.id), latest.counts || {});
      return res.json({ success: true, stopped: true, runId: latest.id });
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
    const dryRun = req.body?.dryRun === true;
    let defaultWave: 'full' | 'carousel' = 'carousel';
    try {
      const st = await getSettings(loadImmoConfig());
      if (st.search?.profile === 'carousel') defaultWave = 'carousel';
      else if (st.search?.defaultWave === 'priority') defaultWave = 'carousel';
      else defaultWave = 'full';
    } catch { /* keep carousel as C129 default */ }
    const waveRaw = String(req.body?.wave || defaultWave).toLowerCase();
    // Product modes: carousel | full. Legacy priority→carousel, extended→full.
    const wave: 'full' | 'carousel' =
      waveRaw === 'carousel' || waveRaw === 'priority' ? 'carousel' :
      waveRaw === 'full' || waveRaw === 'extended' ? 'full' :
      defaultWave;
    const trigger = (req as any).immoCron ? 'schedule' : 'manual';
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
    try { runId = await startRun(trigger, dryRun); } catch { return res.status(500).json({ success: false, error: 'Could not start run', code: 'IMMOFINDER_FAILED' }); }
    if (!runId) {
      console.warn(JSON.stringify({ type: 'immofinder_run_rejected', code: 'RUN_IN_PROGRESS', trigger }));
      return res.status(409).json({ success: false, error: 'A run is already in progress', code: 'RUN_IN_PROGRESS' });
    }
    console.info(JSON.stringify({ type: 'immofinder_run_accepted', trigger, runId, dryRun, wave }));
    res.status(202).json({ success: true, runId, dryRun, wave });
    void (async () => {
      const log: { t: number; text: string }[] = []; let lastSave = 0; let ev: { stage: string; text: string; current?: number; total?: number; counts?: Record<string, number>; communes?: string[] } = { stage: 'catalogue', text: 'Starting' };
      const push = (e: typeof ev, force = false) => {
        ev = e; log.push({ t: Date.now(), text: e.text }); if (log.length > 40) log.shift();
        const n = Date.now(); if (!force && n - lastSave < 700) return; lastSave = n;
        void saveProgress(runId!, { stage: e.stage, text: e.text, current: e.current, total: e.total, counts: e.counts ?? {}, communes: e.communes, log }).catch(() => {});
      };
      push(ev, true);
      const errors: unknown[] = []; let result = null as Awaited<ReturnType<typeof runPipeline>> | null; const delivery: Record<string, string> = {};
      try {
        const cfg = applySettings(loadImmoConfig(), settings);
        try { const h = await cleanupStored(); if (h) push({ stage: 'catalogue', text: `Hid ${h} saved results that are not suitable`, counts: {} }, true); } catch { /* cleanup is optional */ }
        const dl = settings.delivery;
        const deliverWave = async (wave: 'carousel' | 'extended' | 'carousel', newInWave: { canonical_key: string }[], counts: Record<string, number>) => {
          const label = immofinderWaveLabel(wave);
          const all = await listListings(null);
          const newKeys = new Set(newInWave.map((l) => l.canonical_key));
          const fresh = all.filter((r: any) => newKeys.has(r.canonical_key));
          // emailContent: 'new' = only this wave; 'all' = every visible listing (setting in Delivery).
          const emailAllMode = dl.emailContent === 'all';
          const emailRows = emailAllMode ? all : fresh;
          const notifyTelegram = fresh.length > 0 || dl.notifyWhenEmpty;
          const notifyEmail = emailRows.length > 0 || dl.notifyWhenEmpty;
          push({ stage: 'delivery', text: `${label}: email=${emailAllMode ? `all ${emailRows.length}` : `${fresh.length} new`} · telegram=${fresh.length} new`, counts }, true);
          if (dl.drive) {
            const d = await exportDrive(all, driveFolder(dl.driveFolderId));
            delivery.drive = d.status;
            if (d.url) delivery.driveUrl = d.url;
            delivery[`${wave}_drive`] = d.status;
          } else delivery.drive = 'off';
          const head = `ImmoFinder ${label}: ${fresh.length} new · kept=${counts.kept ?? 0} · fetched=${counts.fetched ?? 0}`;
          if (dl.telegram) {
            delivery[`${wave}_telegram`] = notifyTelegram
              ? await sendTelegram(formatListingsText(fresh, { heading: head, limit: 6, driveUrl: delivery.driveUrl }))
              : 'skipped: nothing new';
            delivery.telegram = delivery[`${wave}_telegram`];
          } else delivery.telegram = 'off';
          if (dl.email && dl.emailTo) {
            delivery[`${wave}_email`] = notifyEmail
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
            delivery.email = delivery[`${wave}_email`];
          } else delivery.email = 'off';
        };
        result = await runPipeline({
          config: cfg,
          fetchPage: createPoliteFetch(cfg),
          llm: dryRun ? null : deps.llm,
          store: createPgStore(),
          onProgress: push,
          maxLlmCalls: settings.search.maxAiPages,
          search: process.env.SERPER_API_KEY ? createSerperSearch(fetch, cfg.discovery?.resultsPerQuery ?? 10) : null,
          cycle: await realRunCount(),
          shouldCancel: () => isRunCancelled(runId!),
          onWaveComplete: dryRun ? undefined : async ({ wave, newInWave, counts }) => {
            try { await deliverWave(wave, newInWave, counts); }
            catch (e) { errors.push({ code: `${wave}_delivery_failed`, detail: String((e as Error)?.message || e).slice(0, 200) }); }
          },
        }, { dryRun, wave });
        errors.push(...(result.errors || []));
        try {
          const saved = await listListings(null, { includeHidden: true });
          immoLog('info', 'search_quality_summary', {
            runId, wave, counts: result.counts, filtered: result.filtered, errors: result.errors?.length || 0,
            sourceStats: result.sourceStats || [], wavesRun: result.wavesRun || [],
            completeness: completenessSummary(saved),
            previewSamples: (result.preview || []).slice(0, 8).map((x) => ({ host: (() => { try { return new URL(x.url).hostname; } catch { return 'unknown'; } })(), kept: x.kept, reason: x.reason, detail: String(x.detail || '').slice(0, 100) })),
          }, 'Search quality and saved-card completeness summary');
        } catch (diagError) {
          immoLog('warn', 'search_quality_summary_failed', { runId, error: String((diagError as Error)?.message || diagError).slice(0, 120) });
        }
        // Safety net: if waves produced nothing and notifyWhenEmpty, still one summary delivery
        if (!dryRun && dl.notifyWhenEmpty && !(result.priorityNewListings?.length || result.newListings.length)) {
          await deliverWave('extended', [], result.counts);
        }
      } catch (e) { errors.push({ code: 'run_failed', detail: String((e as Error)?.message || e).slice(0, 200) }); }
      try {
          if (isRunCancelled(runId!)) { await finishRunCancelled(runId!, result?.counts ?? {}); }
          else { await finishRun(runId!, result, errors, delivery); await saveProgress(runId!, { stage: 'done', text: result?.errors?.some((e) => e.code === 'cancelled') ? 'Stopped by user' : 'Finished', counts: result?.counts ?? {}, log }); }
          clearRunCancel(runId!);
        } catch { /* run row stays open; the 30-minute guard releases it */ }
    })();
  });

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

        let wave: 'carousel' | 'extended' | 'full' | 'carousel' = 'carousel';
        if (settings.search?.profile === 'carousel') wave = 'carousel';
        else if (settings.search?.defaultWave === 'priority') wave = 'priority';
        else wave = 'full';

        const dryRun = false;
        const trigger = 'schedule';
        let runId: string | null = null;
        try { runId = await startRun(trigger, dryRun); } catch (e) {
          console.warn(JSON.stringify({ type: 'immofinder_run_rejected', code: 'START_FAILED', trigger: 'internal', detail: String((e as Error)?.message || e).slice(0, 120) }));
          return;
        }
        if (!runId) {
          console.warn(JSON.stringify({ type: 'immofinder_run_rejected', code: 'RUN_IN_PROGRESS', trigger: 'internal' }));
          return;
        }
        console.info(JSON.stringify({ type: 'immofinder_run_accepted', trigger: 'internal', runId, dryRun, wave }));

        void (async () => {
          const log: { t: number; text: string }[] = [];
          let lastSave = 0;
          let ev: { stage: string; text: string; current?: number; total?: number; counts?: Record<string, number>; communes?: string[] } = { stage: 'catalogue', text: 'Scheduled carousel starting' };
          const push = (e: typeof ev, force = false) => {
            ev = e; log.push({ t: Date.now(), text: e.text }); if (log.length > 40) log.shift();
            const n = Date.now(); if (!force && n - lastSave < 700) return; lastSave = n;
            void saveProgress(runId!, { stage: e.stage, text: e.text, current: e.current, total: e.total, counts: e.counts ?? {}, communes: e.communes, log }).catch(() => {});
          };
          push(ev, true);
          const errors: unknown[] = [];
          let result = null as Awaited<ReturnType<typeof runPipeline>> | null;
          const delivery: Record<string, string> = {};
          try {
            const cfg = applySettings(loadImmoConfig(), settings);
            try { const h = await cleanupStored(); if (h) push({ stage: 'catalogue', text: `Hid ${h} saved results that are not suitable`, counts: {} }, true); } catch { /* optional */ }
            const dl = settings.delivery;
            const deliverWave = async (w: 'priority' | 'extended' | 'carousel', newInWave: { canonical_key: string }[], counts: Record<string, number>) => {
              const label = immofinderWaveLabel(w);
              const all = await listListings(null);
              const newKeys = new Set(newInWave.map((l) => l.canonical_key));
              const fresh = all.filter((r: any) => newKeys.has(r.canonical_key));
              const emailAllMode = dl.emailContent === 'all';
              const emailRows = emailAllMode ? all : fresh;
              const notifyTelegram = fresh.length > 0 || dl.notifyWhenEmpty;
              const notifyEmail = emailRows.length > 0 || dl.notifyWhenEmpty;
              push({ stage: 'delivery', text: `${label}: email=${emailAllMode ? `all ${emailRows.length}` : `${fresh.length} new`}`, counts }, true);
              if (dl.drive) {
                const d = await exportDrive(all, driveFolder(dl.driveFolderId));
                delivery.drive = d.status;
                if (d.url) delivery.driveUrl = d.url;
              } else delivery.drive = 'off';
              const head = `ImmoFinder ${label}: ${fresh.length} new · kept=${counts.kept ?? 0} · fetched=${counts.fetched ?? 0}`;
              if (dl.telegram) {
                delivery.telegram = notifyTelegram
                  ? await sendTelegram(formatListingsText(fresh, { heading: head, limit: 6, driveUrl: delivery.driveUrl }))
                  : 'skipped: nothing new';
              } else delivery.telegram = 'off';
              if (dl.email && dl.emailTo) {
                delivery.email = notifyEmail
                  ? await sendEmail(
                    dl.emailTo,
                    emailAllMode
                      ? `ImmoFinder ${label}: all ${emailRows.length} listings (${fresh.length} new)`
                      : `ImmoFinder ${label}: ${fresh.length} new`,
                    formatListingsText(emailRows, {
                      heading: emailAllMode ? `${head}\nAll current listings (${emailRows.length}), newest first:` : head,
                      limit: emailAllMode ? 60 : 30,
                      driveUrl: delivery.driveUrl,
                    }),
                  )
                  : (emailAllMode ? 'skipped: no listings' : 'skipped: nothing new');
              } else delivery.email = 'off';
            };
            result = await runPipeline({
              config: cfg,
              fetchPage: createPoliteFetch(cfg),
              llm: deps.llm,
              store: createPgStore(),
              onProgress: push,
              maxLlmCalls: settings.search.maxAiPages,
              search: process.env.SERPER_API_KEY ? createSerperSearch(fetch, cfg.discovery?.resultsPerQuery ?? 10) : null,
              cycle: await realRunCount(),
              shouldCancel: () => isRunCancelled(runId!),
              onWaveComplete: async ({ wave: w, newInWave, counts }) => {
                try { await deliverWave(w, newInWave, counts); }
                catch (e) { errors.push({ code: `${w}_delivery_failed`, detail: String((e as Error)?.message || e).slice(0, 200) }); }
              },
            }, { dryRun: false, wave });
            errors.push(...(result.errors || []));
            if (dl.notifyWhenEmpty && !(result.priorityNewListings?.length || result.newListings.length)) {
              await deliverWave('extended', [], result.counts);
            }
          } catch (e) {
            errors.push({ code: 'run_failed', detail: String((e as Error)?.message || e).slice(0, 200) });
          }
          try {
            if (isRunCancelled(runId!)) await finishRunCancelled(runId!, result?.counts ?? {});
            else {
              await finishRun(runId!, result, errors, delivery);
              await saveProgress(runId!, { stage: 'done', text: 'Finished', counts: result?.counts ?? {}, log });
            }
            clearRunCancel(runId!);
          } catch { /* 30-min guard */ }
        })();
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
