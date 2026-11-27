import type { Express } from 'express';
/** WP1 status only. Discovery and persistence are intentionally not activated before source/quality gates. */
export function registerImmoGRRoutes(app: Express): void {
  app.get('/api/immogr/status', (_req, res) => {
    res.json({
      product: 'ImmoGR',
      stage: 'WP1_FOUNDATION',
      liveSearchEnabled: false,
      resultCategories: ['direct_rental', 'private_owner_prospect'],
      message: 'The independent ImmoGR foundation is in place. Source eligibility, page-level evidence extraction, and real-page quality gates must pass before live search is enabled.',
    });
  });
}
