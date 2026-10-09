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

  app.get('/ready', (_req, res) => {
    // PostgreSQL is introduced in BX-04. Until then, process liveness is not readiness.
    return res.status(503).json({ status: 'not_ready', reason: 'database_not_configured' });
  });

  app.get('/api/health', (req, res) => {
    if (!options.isAuthenticated(req)) return res.json({ status: 'ok', version: options.appVersion });
    return res.json({ status: 'ok', version: options.appVersion, hasKey: options.hasApiKey,
      authRequired: options.appAuthEnabled, lightModels: options.lightModels, strongModels: options.strongModels });
  });
}
