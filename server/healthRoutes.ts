import type { Express, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';

export interface HealthRouteOptions {
  appVersion: string;
  nodeEnv: string;
  appAuthEnabled: boolean;
  hasApiKey: boolean;
  lightModels: string[];
  strongModels: string[];
  isAuthenticated: (req: Request) => boolean;
  distDirectory: string;
  skipDistHealthcheck?: boolean;
  isDatabaseReady?: () => Promise<boolean>;
}

/** Register the stable public liveness/readiness and authenticated diagnostic contracts. */
export function registerHealthRoutes(app: Express, options: HealthRouteOptions): void {
  app.get('/health', (_req, res) => {
    if (options.nodeEnv === 'production' && !options.skipDistHealthcheck &&
        !fs.existsSync(path.join(options.distDirectory, 'index.html'))) {
      return res.status(503).json({ status: 'error', version: options.appVersion, code: 'DIST_MISSING' });
    }
    return res.json({ status: 'ok', version: options.appVersion });
  });

  app.get('/ready', async (_req, res) => {
    if (!options.isDatabaseReady) return res.status(503).json({ status: 'not_ready', reason: 'database_not_configured' });
    const ready = await options.isDatabaseReady().catch(() => false);
    if (!ready) return res.status(503).json({ status: 'not_ready', reason: 'database_unavailable' });
    return res.json({ status: 'ready', version: options.appVersion });
  });

  app.get('/api/health', (req, res) => {
    if (!options.isAuthenticated(req)) return res.json({ status: 'ok', version: options.appVersion });
    return res.json({ status: 'ok', version: options.appVersion, hasKey: options.hasApiKey,
      authRequired: options.appAuthEnabled, lightModels: options.lightModels, strongModels: options.strongModels });
  });
}
