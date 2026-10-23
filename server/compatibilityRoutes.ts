/** Compatibility and retired HTTP endpoints extracted from server.ts (P82). */
import type { Express, Response } from 'express';

type Ok = (res: Response, data: unknown, meta: unknown) => void;
type Fail = (res: Response, status: number, error: string, code?: string, details?: Record<string, unknown>) => void;

export function registerCompatibilityRoutes(app: Express, helpers: { ok: Ok; fail: Fail }): void {
  const { ok, fail } = helpers;

  // Legacy endpoints return 410.
  app.post('/api/analyze-full', (_req, res) => {
    fail(res, 410, 'Monolithic analysis removed. Use step endpoints.', 'GONE');
  });
  app.post('/api/radar-legacy', (_req, res) => {
    fail(res, 410, 'Legacy radar. Use /api/neutralize → /api/radar.', 'GONE');
  });

  // EVPI is client-side only (G-09) — optional server echo for tests.
  app.post('/api/evpi', (req, res) => {
    const { p, G, L, c } = req.body || {};
    const pNorm = p > 1 ? p / 100 : p;
    const evOpen = pNorm * G - (1 - pNorm) * L;
    const bestNoInfo = Math.max(evOpen, 0);
    const evPerfect = pNorm * G;
    const evpiVal = evPerfect - bestNoInfo;
    ok(res, { evOpen, bestNoInfo, evPerfect, evpi: evpiVal, testCost: c }, { model: 'local', fallback: false, durationMs: 0, stage: 'evpi' });
  });
}
