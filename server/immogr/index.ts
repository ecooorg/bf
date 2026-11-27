import type { Express } from 'express';
import { fetchWebSearchDigest, type SearchClientLike } from '../webSearch.ts';
import { IMMOGR_COMMUNES } from '../../src/immogr/communes.ts';
type ImmoGRDependencies = { searchClient?: SearchClientLike | null; searchModels?: string[] };

/** Live discovery returns candidate URLs only. It never fetches listing pages or persists unverified leads. */
export function registerImmoGRRoutes(app: Express, dependencies: ImmoGRDependencies = {}): void {
  const searchModels = (dependencies.searchModels || []).filter(Boolean).slice(0, 2);
  const searchClient = dependencies.searchClient || null;
  const liveDiscoveryEnabled = Boolean(searchClient && searchModels.length);
  console.info('[ImmoGR] routes ready', { liveDiscoveryEnabled, modelCount: searchModels.length });

  app.get('/api/immogr/communes', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json({ communes: IMMOGR_COMMUNES, count: IMMOGR_COMMUNES.length, source: 'Canton Graubünden municipality directory, status 2026-09-14' });
  });

  app.get('/api/immogr/status', (_req, res) => {
    res.json({
      product: 'ImmoGR', stage: 'WP1_FOUNDATION', liveDiscoveryEnabled,
      liveSearchEnabled: false, listingQualificationEnabled: false,
      resultCategories: ['direct_rental', 'private_owner_prospect'],
      message: liveDiscoveryEnabled
        ? 'Live discovery can return current candidate URLs. These are unverified leads only: ImmoGR does not fetch source pages, extract listing facts, or admit listings until source permissions and quality criteria are approved.'
        : 'The independent ImmoGR foundation is in place. Configure the approved Gemini search provider to enable URL discovery. Automated source-page acquisition and listing qualification remain disabled.',
    });
  });

  app.post('/api/immogr/discovery', async (req, res) => {
    if (!searchClient || !searchModels.length) {
      return res.status(503).json({ success: false, code: 'DISCOVERY_PROVIDER_UNAVAILABLE', error: 'The Gemini Google Search provider is not configured for ImmoGR.' });
    }
    const commune = String(req.body?.commune ?? '').trim().replace(/\s+/g, ' ');
    const category = req.body?.category === 'private_owner_prospect' ? 'private_owner_prospect' : req.body?.category === 'direct_rental' ? 'direct_rental' : null;
    if (!category || commune.length < 2 || commune.length > 80 || /[<>\u0000-\u001f]/.test(commune)) {
      return res.status(400).json({ success: false, code: 'INVALID_DISCOVERY_INPUT', error: 'Provide one commune name and a supported discovery category.' });
    }
    const intent = category === 'direct_rental'
      ? 'private long-term apartment or house rental, monthly rent, private landlord, individual property listing'
      : 'holiday apartment or chalet offered directly by a private owner, individual property page, direct landlord contact';
    const userText = 'Find current public candidate listing URLs for ' + intent + ' in ' + commune + ', Graubünden, Switzerland. Prefer individual property detail pages over search result pages. Do not invent URLs or claim that a result is verified.';
    const result = await fetchWebSearchDigest({
      client: searchClient, models: searchModels, userText,
      today: new Date().toISOString().slice(0, 10), timeoutMs: 18_000,
      maxAttempts: Math.min(2, searchModels.length),
    });
    if (result.status !== 'used') {
      return res.status(502).json({ success: false, code: 'DISCOVERY_LOOKUP_FAILED', providerStatus: result.status, reason: result.reason || 'No grounded search results were returned.' });
    }
    console.info('[ImmoGR] discovery completed', { category, commune, providerStatus: result.status, sourceCount: result.sources.length, modelCount: searchModels.length });
    const leads = result.sources.slice(0, 6).map((source) => {
      let host = '';
      try { host = new URL(source.url).hostname; } catch { /* grounding parser already validates URLs */ }
      return { title: source.title, url: source.url, host, verification: 'unverified', accessReview: 'manual_review_required' };
    });
    return res.json({
      success: true, status: 'discovery_only', category, commune, generatedAt: new Date().toISOString(),
      leads, queries: result.queries, listingAdmissionEnabled: false, pageAcquisitionPerformed: false,
      disclaimer: 'These are live search-engine URL leads, not verified property listings. No result page was fetched or parsed. Review each source manually and check its terms before any automated access.',
    });
  });
}
