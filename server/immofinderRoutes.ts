import crypto from 'node:crypto';
import express, { type Express, type Request } from 'express';
import { isSameOrigin } from './security.ts';
import { createPoliteFetch } from './immofinderFetcher.ts';
import { runPipeline } from './immofinderPipeline.ts';
import { channelStatus, checkDrive, exportDrive, formatListingsText, sendEmail, sendTelegram } from './immofinderDelivery.ts';
import { TIMEZONE, applySettings, isDue, parseDriveFolderId } from './immofinderSettings.ts';
import { createSerperSearch } from './immofinderDiscovery.ts';
import { STATUSES, createPgStore, finishRun, getSettings, lastRealRunAt, latestRun, listListings, loadImmoConfig, realRunCount, saveProgress, saveSettings, setStatus, startRun } from './immofinderStore.ts';

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

/** Folder precedence: saved setting, then env, then the config default. */
function driveFolder(saved: string): string {
  return saved || parseDriveFolderId(process.env.IMMOFINDER_DRIVE_FOLDER_ID) || parseDriveFolderId(loadImmoConfig().driveFolderId);
}

export function registerImmoFinderRoutes(app: Express, deps: ImmoRouteDeps): void {
  const json = express.json({ limit: '10kb' });
  app.use('/api/immofinder', (req, res, next) => {
    const cron = req.method === 'POST' && req.path === '/run' && secretOk(req);
    if (!cron) {
      if (!deps.appAuthEnabled || !deps.authenticated(req)) return res.status(401).json({ success: false, error: 'Authentication required', code: 'UNAUTHORIZED' });
      if (req.method !== 'GET') { const o = req.get('origin'); if (!o || !isSameOrigin(o, req.get('host'), req.protocol)) return res.status(403).json({ success: false, error: 'Same-origin request required', code: 'CSRF_ORIGIN' }); }
    }
    if (!process.env.DATABASE_URL) return res.status(503).json({ success: false, error: 'Database is not configured', code: 'DATABASE_UNAVAILABLE' });
    (req as any).immoCron = cron; next();
  });

  app.get('/api/immofinder/listings', async (req, res) => {
    try {
      const s = String(req.query.status || '').toUpperCase();
      res.json({ success: true, listings: await listListings((STATUSES as readonly string[]).includes(s) ? s : null) });
    } catch (e) { res.status(500).json({ success: false, error: 'Listings unavailable', code: 'IMMOFINDER_FAILED' }); }
  });

  app.patch('/api/immofinder/listings/:id', json, async (req, res) => {
    const status = String(req.body?.status || '');
    if (!(STATUSES as readonly string[]).includes(status) || !/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid id or status', code: 'INVALID_REQUEST' });
    try { return (await setStatus(req.params.id, status)) ? res.json({ success: true }) : res.status(404).json({ success: false, error: 'Listing not found', code: 'NOT_FOUND' }); }
    catch { return res.status(500).json({ success: false, error: 'Update failed', code: 'IMMOFINDER_FAILED' }); }
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

  app.post('/api/immofinder/run', json, async (req, res) => {
    const dryRun = req.body?.dryRun === true; const trigger = (req as any).immoCron ? 'schedule' : 'manual';
    let settings; try { settings = await getSettings(loadImmoConfig()); } catch { return res.status(500).json({ success: false, error: 'Settings unavailable', code: 'IMMOFINDER_FAILED' }); }
    if (trigger === 'schedule') {
      let due = false; try { due = isDue(settings.schedule, await lastRealRunAt(), new Date()); } catch { /* treated as not due */ }
      if (!due) return res.json({ success: true, skipped: settings.schedule.mode === 'manual' ? 'manual_only' : 'not_due' });
    }
    let runId: string | null;
    try { runId = await startRun(trigger, dryRun); } catch { return res.status(500).json({ success: false, error: 'Could not start run', code: 'IMMOFINDER_FAILED' }); }
    if (!runId) return res.status(409).json({ success: false, error: 'A run is already in progress', code: 'RUN_IN_PROGRESS' });
    res.status(202).json({ success: true, runId, dryRun });
    void (async () => {
      const log: { t: number; text: string }[] = []; let lastSave = 0; let ev: { stage: string; text: string; current?: number; total?: number; counts?: Record<string, number> } = { stage: 'catalogue', text: 'Starting' };
      const push = (e: typeof ev, force = false) => {
        ev = e; log.push({ t: Date.now(), text: e.text }); if (log.length > 14) log.shift();
        const n = Date.now(); if (!force && n - lastSave < 700) return; lastSave = n;
        void saveProgress(runId!, { stage: e.stage, text: e.text, current: e.current, total: e.total, counts: e.counts ?? {}, log }).catch(() => {});
      };
      push(ev, true);
      const errors: unknown[] = []; let result = null as Awaited<ReturnType<typeof runPipeline>> | null; const delivery: Record<string, string> = {};
      try {
        const cfg = applySettings(loadImmoConfig(), settings);
        result = await runPipeline({ config: cfg, fetchPage: createPoliteFetch(cfg), llm: dryRun ? null : deps.llm, store: createPgStore(), onProgress: push, maxLlmCalls: settings.search.maxAiPages, search: process.env.SERPER_API_KEY ? createSerperSearch(fetch, cfg.discovery?.resultsPerQuery ?? 10) : null, cycle: await realRunCount() }, { dryRun });
        errors.push(...result.errors);
        if (!dryRun) {
          const dl = settings.delivery; const notify = result.counts.new > 0 || dl.notifyWhenEmpty;
          const all = await listListings(null); const newKeys = new Set(result.newListings.map((l) => l.canonical_key)); const fresh = all.filter((r: any) => newKeys.has(r.canonical_key));
          if (dl.drive) { push({ stage: 'delivery', text: 'Updating the Google Sheet and Doc in Drive', counts: result.counts }, true); const d = await exportDrive(all, driveFolder(dl.driveFolderId)); delivery.drive = d.status; if (d.url) delivery.driveUrl = d.url; } else delivery.drive = 'off';
          const head = `ImmoFinder: ${result.counts.new} new, ${result.counts.updated} updated, ${result.counts.kept} matched.`;
          if (dl.telegram) { push({ stage: 'delivery', text: 'Sending Telegram message', counts: result.counts }, true); delivery.telegram = notify ? await sendTelegram(formatListingsText(fresh, { heading: head, limit: 6, driveUrl: delivery.driveUrl })) : 'skipped: nothing new'; } else delivery.telegram = 'off';
          if (dl.email && dl.emailTo) {
            push({ stage: 'delivery', text: 'Sending email', counts: result.counts }, true);
            const allMode = dl.emailContent === 'all';
            delivery.email = notify ? await sendEmail(dl.emailTo, allMode ? `ImmoFinder: all ${all.length} listings (${result.counts.new} new)` : `ImmoFinder: ${result.counts.new} new listings`,
              formatListingsText(allMode ? all : fresh, { heading: allMode ? `${head}\nAll listings found so far (${all.length}), newest first:` : head, limit: allMode ? 60 : 30, driveUrl: delivery.driveUrl })) : 'skipped: nothing new';
          } else delivery.email = 'off';
        }
      } catch (e) { errors.push({ code: 'run_failed', detail: String((e as Error)?.message || e).slice(0, 200) }); }
      try { await finishRun(runId!, result, errors, delivery); await saveProgress(runId!, { stage: 'done', text: 'Finished', counts: result?.counts ?? {}, log }); } catch { /* run row stays open; the 30-minute guard releases it */ }
    })();
  });
}
