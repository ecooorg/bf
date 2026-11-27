import type { Express } from 'express';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getPool } from '../database.ts';
import { recordApplicationLog } from '../projectDiagnostics.ts';
import { fetchWebSearchDigest, type SearchClientLike } from '../webSearch.ts';
import { IMMOGR_LOCALITIES, isImmoGRGroupMode, localitiesForMode } from './localities.ts';
import { isDiscoveryUrlInScope, resolveDiscoverySourceScope } from './discovery-scope.ts';
type ImmoGRDependencies = { searchClient?: SearchClientLike | null; searchModels?: string[]; appAuthEnabled?: boolean; authenticated?: (req: any) => boolean; pilotEnabled?: boolean };
type ManualSource = { id: string; name: string; category: string; status: string; ownerSignal: string; permission: string; homepageUrl?: string; manualReview?: Record<string, unknown>; probePolicy?: { status?: string } };
const sourceRegistry = JSON.parse(readFileSync(path.resolve(process.cwd(), 'config/immogr/sources.json'), 'utf8')) as { sources: ManualSource[] };
const validOwnerClasses = new Set(['private_owner', 'agency', 'management_company', 'tour_operator', 'intermediary', 'unknown']);
const validPricePeriods = new Set(['month', 'week', 'night', 'season', 'unknown']);
const validPropertyTypes = new Set(['apartment', 'house', 'chalet', 'room', 'other', 'unknown']);
const validAccessOutcomes = new Set(['reviewed', 'in_progress', 'blocked_by_source', 'no_relevant_inventory']);

/** Live discovery returns candidate URLs only. It never fetches listing pages or persists unverified leads. */
export function registerImmoGRRoutes(app: Express, dependencies: ImmoGRDependencies = {}): void {
  const searchModels = (dependencies.searchModels || []).filter(Boolean).slice(0, 2);
  const searchClient = dependencies.searchClient || null;
  const liveDiscoveryEnabled = Boolean(searchClient && searchModels.length);
  const requireOwner = (req: any, res: any): boolean => {
    if (!dependencies.appAuthEnabled || !dependencies.authenticated?.(req)) {
      res.status(401).json({ success: false, error: 'Personal ImmoGR notebook requires application authentication', code: 'UNAUTHORIZED' });
      return false;
    }
    return true;
  };
  console.info('[ImmoGR] routes ready', { liveDiscoveryEnabled, localityCount: IMMOGR_LOCALITIES.length });

  app.get('/api/immogr/localities', (req, res) => {
    const rawMode = String(req.query.groupMode || 'both');
    const groupMode = isImmoGRGroupMode(rawMode) ? rawMode : 'both';
    const localities = localitiesForMode(groupMode);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json({ localities, count: localities.length, groupMode, groups: { group1: 22, group2: 22 }, scope: 'owner_defined_localities_only' });
  });

  app.get('/api/immogr/sources', (req, res) => {
    if (!requireOwner(req, res)) return;
    res.setHeader('Cache-Control', 'no-store');
    res.json({ sources: sourceRegistry.sources.map(({ id, name, category, status, ownerSignal, permission, homepageUrl, manualReview, probePolicy }) => ({ id, name, category, automationStatus: status, ownerSignal, accessNote: permission, homepageUrl, manualReview, probePolicyStatus: probePolicy?.status ?? 'not_reviewed' })) });
  });

  app.get('/api/immogr/manual-reviews', async (req, res) => {
    if (!requireOwner(req, res)) return;
    try {
      const sourceId = String(req.query.sourceId || '').trim();
      const pool = await getPool();
      const result = await pool.query(
        'SELECT id, source_id, canonical_url, locality_id, reviewed_at, manual_access_outcome, page_title, property_type, price_amount, currency, price_period, owner_class, availability, reviewer_notes FROM immogr_manual_reviews WHERE ($1 = \'\' OR source_id = $1) ORDER BY reviewed_at DESC LIMIT 100',
        [sourceId],
      );
      return res.json({ reviews: result.rows });
    } catch (error) {
      console.error('[ImmoGR] manual review list unavailable', String((error as Error)?.message || error).slice(0, 180));
      return res.status(503).json({ error: 'ImmoGR manual research database is unavailable. Apply the latest migrations and configure DATABASE_URL.' });
    }
  });

  app.post('/api/immogr/manual-reviews', async (req, res) => {
    if (!requireOwner(req, res)) return;
    const body = req.body || {};
    const sourceId = String(body.sourceId || '').trim();
    const source = sourceRegistry.sources.find((item) => item.id === sourceId);
    const canonicalUrl = String(body.canonicalUrl || '').trim();
    const localityId = String(body.localityId || '').trim();
    const pageTitle = String(body.pageTitle || '').trim();
    const propertyType = String(body.propertyType || 'unknown');
    const priceRaw = body.priceAmount === '' || body.priceAmount == null ? null : Number(body.priceAmount);
    const currency = String(body.currency || 'CHF').trim().toUpperCase();
    const pricePeriod = String(body.pricePeriod || 'unknown');
    const ownerClass = String(body.ownerClass || 'unknown');
    const availability = String(body.availability || '').trim();
    const accessOutcome = String(body.accessOutcome || 'reviewed');
    const notes = String(body.notes || '').trim();
    const allowedLocality = IMMOGR_LOCALITIES.find((item) => item.id === localityId);
    let parsedUrl: URL | null = null;
    try { parsedUrl = new URL(canonicalUrl); } catch { /* validated below */ }
    if (!source || !parsedUrl || !['http:', 'https:'].includes(parsedUrl.protocol) || Boolean(parsedUrl.username || parsedUrl.password) || canonicalUrl.length > 2048 ||
      !allowedLocality || !validOwnerClasses.has(ownerClass) || !validPricePeriods.has(pricePeriod) || !validPropertyTypes.has(propertyType) ||
      !validAccessOutcomes.has(accessOutcome) || (priceRaw !== null && (!Number.isFinite(priceRaw) || priceRaw < 0 || priceRaw > 1000000)) ||
      !['CHF', 'EUR'].includes(currency) || pageTitle.length > 300 || availability.length > 500 || notes.length > 5000) {
      return res.status(400).json({ error: 'Invalid manual research record. Check source, HTTPS/HTTP URL, target locality and field values.' });
    }
    try {
      const pool = await getPool();
      const result = await pool.query(
        `INSERT INTO immogr_manual_reviews
          (source_id, canonical_url, locality_id, capture_method, reviewer_id, manual_access_outcome, page_title, property_type, price_amount, currency, price_period, owner_class, availability, reviewer_notes, source_snapshot)
         VALUES ($1,$2,$3,'manual_user_review','owner',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
         RETURNING id, source_id, canonical_url, locality_id, reviewed_at, manual_access_outcome`,
        [sourceId, canonicalUrl, localityId, accessOutcome, pageTitle || null, propertyType, priceRaw, currency, pricePeriod, ownerClass, availability || null, notes || null, JSON.stringify({ sourceName: source.name, automationStatus: source.status, capturedAt: new Date().toISOString() })],
      );
      return res.status(201).json({ success: true, review: result.rows[0] });
    } catch (error) {
      console.error('[ImmoGR] manual review save failed', String((error as Error)?.message || error).slice(0, 180));
      return res.status(503).json({ error: 'Could not save the manual research record. Check that migration 034_immogr_manual_reviews has been applied and DATABASE_URL is configured.' });
    }
  });

  app.get('/api/immogr/status', (_req, res) => {
    res.json({
      product: 'ImmoGR', stage: 'WP2_MANUAL_RESEARCH', liveDiscoveryEnabled,
      liveSearchEnabled: false, listingQualificationEnabled: false,
      resultCategories: ['direct_rental', 'private_owner_prospect'],
      message: liveDiscoveryEnabled
        ? 'Live discovery can return current candidate URLs. These are unverified leads only: ImmoGR does not fetch source pages, extract listing facts, or admit listings until source permissions and quality criteria are approved.'
        : 'WP2 manual research is active. The private notebook supports all registered sources, local HTML/HTM/TXT import and authenticated structured capture. Configure the approved Gemini search provider separately for URL discovery; remote source-page acquisition and listing qualification remain disabled.',
    });
  });

  const discoveryHandler = async (req: any, res: any) => {
    if (!searchClient || !searchModels.length) {
      return res.status(503).json({ success: false, code: 'DISCOVERY_PROVIDER_UNAVAILABLE', error: 'The Gemini Google Search provider is not configured for ImmoGR.' });
    }
    const locality = String(req.body?.locality ?? '').trim().replace(/\s+/g, ' ');
    const groupMode = isImmoGRGroupMode(req.body?.groupMode) ? req.body.groupMode : null;
    const category = req.body?.category === 'private_owner_prospect' ? 'private_owner_prospect' : req.body?.category === 'direct_rental' ? 'direct_rental' : null;
    const sourceScope = resolveDiscoverySourceScope(req.body?.sourceIds, sourceRegistry.sources);
    const allowed = groupMode ? localitiesForMode(groupMode) : [];
    const selected = allowed.find((item) => item.name.toLocaleLowerCase('de-CH') === locality.toLocaleLowerCase('de-CH'));
    if ('error' in sourceScope) {
      return res.status(400).json({ success: false, code: 'INVALID_DISCOVERY_INPUT', error: sourceScope.error });
    }
    if (!category || !selected || locality.length > 80 || /[<>\u0000-\u001f]/.test(locality)) {
      return res.status(400).json({ success: false, code: 'INVALID_DISCOVERY_INPUT', error: 'Select a locality included in the enabled ImmoGR group(s) and a supported discovery category.' });
    }
    const intent = category === 'direct_rental'
      ? 'private long-term apartment or house rental, monthly rent, private landlord, individual property listing'
      : 'holiday apartment or chalet offered directly by a private owner, individual property page, direct landlord contact';
    const selectedSourceInstructions = sourceScope.sources.map((source) => source.name + ' (site:' + source.host + ')').join('; ');
    const userText = 'Find current public candidate listing URLs for ' + intent + ' in the locality ' + selected.name + ', canton Graubünden (GR), Switzerland. Search ONLY within these owner-selected sources: ' + selectedSourceInstructions + '. Do not return results from other domains. Do not broaden to other localities in the same municipality. Prefer individual property detail pages over search result pages. Do not invent URLs or claim that a result is verified.';
    const requestId = randomUUID();
    const startedAt = Date.now();
    const attemptedModels: string[] = [];
    const result = await fetchWebSearchDigest({
      client: searchClient, models: searchModels, userText,
      today: new Date().toISOString().slice(0, 10), timeoutMs: 18_000,
      maxAttempts: Math.min(2, searchModels.length),
      onAttempt: (model) => attemptedModels.push(model),
    });
    const durationMs = Date.now() - startedAt;
    const diagnosticDetails = {
      category, locality: selected.name, localityGroup: selected.group, groupMode,
      sourceCount: sourceScope.sources.length, sourceIds: sourceScope.sources.map((source) => source.id),
      attemptedModels, successfulModel: result.model || null, providerStatus: result.status,
      reason: String(result.reason || '').slice(0, 240), queryCount: result.queries.length,
      groundedSourceCount: result.sources.length, durationMs,
    };
    res.setHeader('X-Request-Id', requestId);
    void recordApplicationLog({
      level: result.status === 'used' ? 'info' : 'error', component: 'immogr',
      event: result.status === 'used' ? 'discovery_succeeded' : 'discovery_failed',
      requestId, message: result.status === 'used' ? 'ImmoGR grounded discovery completed' : 'ImmoGR grounded discovery provider failed',
      details: diagnosticDetails,
    }).catch(() => {});
    if (result.status !== 'used') {
      return res.status(502).json({ success: false, code: 'DISCOVERY_LOOKUP_FAILED', error: 'The search provider did not return grounded results.', providerStatus: result.status, reason: result.reason || 'No grounded search results were returned.', requestId, diagnostics: diagnosticDetails });
    }
    console.info('[ImmoGR] discovery completed', { requestId, ...diagnosticDetails });
    const inScopeSources = result.sources.filter((source) => isDiscoveryUrlInScope(source.url, sourceScope.sources));
    const leads = inScopeSources.slice(0, 6).map((source) => {
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
  };
  app.post('/api/immogr/discovery', discoveryHandler);

  // Temporary owner-token pilot: four localities × four selected sources, sequentially.
  // It uses search-engine grounding only; it never fetches source listing pages.
  if (dependencies.pilotEnabled) {
    app.post('/api/immogr/pilot', async (req, res) => {
      const localityIds = Array.isArray(req.body?.localityIds) ? req.body.localityIds : [];
      const sourceIds = Array.isArray(req.body?.sourceIds) ? req.body.sourceIds : [];
      if (localityIds.length !== 4 || new Set(localityIds).size !== 4 || sourceIds.length !== 4 || new Set(sourceIds).size !== 4) {
        return res.status(400).json({ success: false, code: 'INVALID_PILOT_SCOPE', error: 'Pilot requires exactly four distinct localityIds and four distinct sourceIds.' });
      }
      const localities = localityIds.map((id: unknown) => IMMOGR_LOCALITIES.find((item) => item.id === String(id)));
      if (localities.some((item: any) => !item)) {
        return res.status(400).json({ success: false, code: 'INVALID_PILOT_SCOPE', error: 'One or more localities are outside the owner-defined ImmoGR list.' });
      }
      const scope = resolveDiscoverySourceScope(sourceIds, sourceRegistry.sources);
      const selectedRegistrySources = sourceIds.map((id: unknown) => sourceRegistry.sources.find((source) => source.id === id));
      if ('error' in scope || scope.sources.length !== 4 || selectedRegistrySources.some((source) => !source || source.probePolicy?.status === 'prohibited')) {
        return res.status(400).json({ success: false, code: 'INVALID_PILOT_SCOPE', error: 'Selected sources are invalid or marked prohibited in the source registry.' });
      }
      const results: any[] = [];
      for (const locality of localities as NonNullable<typeof localities[number]>[]) {
        const mockRes: any = {
          statusCode: 200,
          payload: null,
          status(code: number) { this.statusCode = code; return this; },
          json(payload: unknown) { this.payload = payload; return this; },
        };
        try {
          await discoveryHandler({ body: { locality: locality.name, groupMode: 'both', category: 'direct_rental', sourceIds } }, mockRes);
          results.push({ localityId: locality.id, locality: locality.name, httpStatus: mockRes.statusCode, result: mockRes.payload });
        } catch (error) {
          results.push({ localityId: locality.id, locality: locality.name, httpStatus: 502, result: { success: false, code: 'PILOT_DISCOVERY_ERROR', error: String((error as Error)?.message || error).slice(0, 240) } });
        }
      }
      const leadCount = results.reduce((total, item) => total + (Array.isArray(item.result?.leads) ? item.result.leads.length : 0), 0);
      console.info('[ImmoGR] pilot completed', { localityCount: results.length, sourceCount: sourceIds.length, leadCount });
      return res.json({
        success: true, status: 'pilot_completed', generatedAt: new Date().toISOString(),
        scope: { localityIds, sourceIds, category: 'direct_rental', requests: results.length },
        summary: { leadCount, successfulLocalities: results.filter((item) => item.result?.success).length, failedLocalities: results.filter((item) => !item.result?.success).length },
        results,
        pageAcquisitionPerformed: false, listingAdmissionEnabled: false,
        disclaimer: 'Search-engine candidate URLs only. No source listing pages were fetched, parsed, or stored; all leads remain unverified and require manual review.',
      });
    });
  }
}
