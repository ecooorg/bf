import crypto from 'node:crypto';
import express, { type Express, type Request } from 'express';
import { isSameOrigin } from './security.ts';
import { createPoliteFetch } from './immofinderFetcher.ts';
import { runPipeline } from './immofinderPipeline.ts';
import { exportDrive, sendTelegram } from './immofinderDelivery.ts';
import { STATUSES, createPgStore, finishRun, latestRun, listListings, loadImmoConfig, setStatus, startRun } from './immofinderStore.ts';

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

  app.post('/api/immofinder/run', json, async (req, res) => {
    const dryRun = req.body?.dryRun === true; const trigger = (req as any).immoCron ? 'schedule' : 'manual';
    let runId: string | null;
    try { runId = await startRun(trigger, dryRun); } catch { return res.status(500).json({ success: false, error: 'Could not start run', code: 'IMMOFINDER_FAILED' }); }
    if (!runId) return res.status(409).json({ success: false, error: 'A run is already in progress', code: 'RUN_IN_PROGRESS' });
    res.status(202).json({ success: true, runId, dryRun });
    void (async () => {
      const errors: unknown[] = []; let result = null as Awaited<ReturnType<typeof runPipeline>> | null; const delivery: Record<string, string> = {};
      try {
        const cfg = loadImmoConfig();
        result = await runPipeline({ config: cfg, fetchPage: createPoliteFetch(cfg), llm: dryRun ? null : deps.llm, store: createPgStore() }, { dryRun });
        errors.push(...result.errors);
        if (!dryRun) {
          const all = await listListings(null);
          const d = await exportDrive(all); delivery.drive = d.status; if (d.url) delivery.driveUrl = d.url;
          const top = result.newListings.slice(0, 5).map((l) => `• ${l.property_name} (${l.municipality}, ${l.rooms_estimated} rooms)\n${l.listing_url}`).join('\n');
          delivery.telegram = await sendTelegram(`ImmoFinder: ${result.counts.new} new, ${result.counts.updated} updated, ${result.counts.kept} matched.${top ? `\n${top}` : ''}${d.url ? `\nDrive: ${d.url}` : ''}`);
        }
      } catch (e) { errors.push({ code: 'run_failed', detail: String((e as Error)?.message || e).slice(0, 200) }); }
      try { await finishRun(runId!, result, errors, delivery); } catch { /* run row stays open; the 30-minute guard releases it */ }
    })();
  });
}
