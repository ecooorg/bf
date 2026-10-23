/**
 * Operations snapshot routes (/api/ops, /ops).
 * Extracted from server.ts (p73) without behaviour change.
 */
import type { Express, Request } from 'express';
import { buildOpsSnapshot, gatherOpsInput, processRssMb, renderOpsHtml } from './opsMetrics.ts';
import { getPool } from './database.ts';

export interface OpsRouteDeps {
  appAuthEnabled: boolean;
  appVersion: string;
  authenticated: (req: Request) => boolean;
}

export function registerOpsRoutes(app: Express, deps: OpsRouteDeps): void {
  const { appAuthEnabled: APP_AUTH_ENABLED, appVersion: APP_VERSION, authenticated } = deps;

  // P24 / BX-25: authenticated operations snapshot (metrics + alerts; no secrets).
  async function loadOpsSnapshot() {
    const limit = Number(process.env.OPS_RSS_LIMIT_MB) || null;
    if (!process.env.DATABASE_URL) {
      return buildOpsSnapshot({
        queueQueued: 0, queueLeased: 0, abandoned24h: 0, runsFinished24h: 0, avgRunDurationMs: null,
        disabledProviders: [], migrationCount: 0, oldestQueuedAgeSec: null,
        memoryRssMb: processRssMb(), memoryRssLimitMb: limit,
      });
    }
    try {
      const pool = await getPool();
      const input = await gatherOpsInput(pool, { memoryRssLimitMb: limit });
      return buildOpsSnapshot(input);
    } catch {
      return buildOpsSnapshot({
        queueQueued: 0, queueLeased: 0, abandoned24h: 0, runsFinished24h: 0, avgRunDurationMs: null,
        disabledProviders: [], migrationCount: 0, oldestQueuedAgeSec: null,
        memoryRssMb: processRssMb(), memoryRssLimitMb: limit,
      });
    }
  }

  app.get('/api/ops', async (req, res) => {
    if (APP_AUTH_ENABLED && !authenticated(req)) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'UNAUTHORIZED' });
    }
    try {
      const snap = await loadOpsSnapshot();
      res.json({ success: true, data: snap });
    } catch (error) {
      res.status(503).json({ success: false, error: 'Ops metrics unavailable', code: 'OPS_UNAVAILABLE' });
    }
  });

  app.get('/ops', async (req, res) => {
    if (APP_AUTH_ENABLED && !authenticated(req)) {
      return res.status(401).type('html').send('<!DOCTYPE html><html><body><p>Sign in required for /ops.</p></body></html>');
    }
    try {
      const snap = await loadOpsSnapshot();
      res.type('html').send(renderOpsHtml(snap, APP_VERSION));
    } catch {
      res.status(503).type('html').send('<!DOCTYPE html><html><body><p>Ops unavailable.</p></body></html>');
    }
  });
}
