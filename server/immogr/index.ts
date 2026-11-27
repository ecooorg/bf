import type { Express } from 'express';
import { fetchWebSearchDigest, type SearchClientLike } from '../webSearch.ts';
import { IMMOGR_LOCALITIES, isImmoGRGroupMode, localitiesForMode } from './localities.ts';
type ImmoGRDependencies = { searchClient?: SearchClientLike | null; searchModels?: string[] };

/** Live discovery returns candidate URLs only. It never fetches listing pages or persists unverified leads. */
export function registerImmoGRRoutes(app: Express, dependencies: ImmoGRDependencies = {}): void {
  const searchModels = (dependencies.searchModels || []).filter(Boolean).slice(0, 2);
  const searchClient = dependencies.searchClient || null;
  const liveDiscoveryEnabled = Boolean(searchClient && searchModels.length);
  console.info('[ImmoGR] routes ready', { liveDiscoveryEnabled, localityCount: IMMOGR_LOCALITIES.length });

  app.get('/api/immogr/localities', (req, res) => {
    const rawMode = String(req.query.groupMode || 'both');
    const groupMode = isImmoGRGroupMode(rawMode) ? rawMode : 'both';
    const localities = localitiesForMode(groupMode);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json({ localities, count: localities.length, groupMode, groups: { group1: 22, group2: 22 }, scope: 'owner_defined_localities_only' });
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
    const locality = String(req.body?.locality ?? '').trim().replace(/\s+/g, ' ');
    const groupMode = isImmoGRGroupMode(req.body?.groupMode) ? req.body.groupMode : null;
    const category = req.body?.category === 'private_owner_prospect' ? 'private_owner_prospect' : req.body?.category === 'direct_rental' ? 'direct_rental' : null;
    const allowed = groupMode ? localitiesForMode(groupMode) : [];
    const selected = allowed.find((item) => item.name.toLocaleLowerCase('de-CH') === locality.toLocaleLowerCase('de-CH'));
    if (!category || !selected || locality.length > 80 || /[<>\u0000-\u001f]/.test(locality)) {
      return res.status(400).json({ success: false, code: 'INVALID_DISCOVERY_INPUT', error: 'Select a locality included in the enabled ImmoGR group(s) and a supported discovery category.' });
    }
    const intent = category === 'direct_rental'
      ? 'private long-term apartment or house rental, monthly rent, private landlord, individual property listing'
      : 'holiday apartment or chalet offered directly by a private owner, individual property page, direct landlord contact';
    const userText = 'Find current public candidate listing URLs for ' + intent + ' in the locality ' + selected.name + ', canton Graubünden (GR), Switzerland. Do not broaden to other localities in the same municipality. Prefer individual property detail pages over search result pages. Do not invent URLs or claim that a result is verified.';
    const result = await fetchWebSearchDigest({
      client: searchClient, models: searchModels, userText,
      today: new Date().toISOString().slice(0, 10), timeoutMs: 18_000,
      maxAttempts: Math.min(2, searchModels.length),
    });
    if (result.status !== 'used') {
      return res.status(502).json({ success: false, code: 'DISCOVERY_LOOKUP_FAILED', providerStatus: result.status, reason: result.reason || 'No grounded search results were returned.' });
    }
    console.info('[ImmoGR] discovery completed', { category, locality: selected.name, group: selected.group, providerStatus: result.status, sourceCount: result.sources.length, modelCount: searchModels.length });
    const leads = result.sources.slice(0, 6).map((source) => {
      let host = '';
      try { host = new URL(source.url).hostname; } catch { /* grounding parser already validates URLs */ }
      return { title: source.title, url: source.url, host, verification: 'unverified', accessReview: 'manual_review_required' };
    });
    return res.json({
      success: true, status: 'discovery_only', category, locality: selected.name, localityGroup: selected.group, groupMode,
      generatedAt: new Date().toISOString(), leads, queries: result.queries,
      listingAdmissionEnabled: false, pageAcquisitionPerformed: false,
      disclaimer: 'These are live search-engine URL leads, not verified property listings. No result page was fetched or parsed. Review each source manually and check its terms before any automated access.',
    });
  });
}
