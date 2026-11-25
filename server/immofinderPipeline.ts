import { randomUUID } from 'node:crypto';
import { hostOf, pickItems, communesForRun, isPortalDetailLink, type SearchHit } from './immofinderDiscovery.ts';
import { type ImmoConfig, type ListingType, LONG_TERM_HINT, classifyType, contactAdvice, isSpecificLink, nonListingReason, canonicalKey, cutAtMarkers, slugVariants, candidateLinks, extractContacts, CONTACT_ADVICE, htmlToText, isStopAgency, matchMunicipality, placeFromUrl, placeFromTitleOrSnippet, pageMeta, parseRooms, registrationForbidden, verifyQuote, parsePrice, resolveListingPrice, priceDiagSnippet, parseListedAt, isSeekerPost, isListingUnavailable, clearOutOfCantonRegion, qualityRejectReason, DEFAULT_QUALITY, isShortStayListing, shortStayPreflightReason, shortStayContactReason, looksLikeAgencyListing, type QualitySettings, buildEvidenceText, credibilityRejectReason, priceFromEvidence, isPlatformOrJunkContact, formatHideLog, type EvidenceKind, dedupeSnippetText } from './immofinderCore.ts';
import { sameListingUrlTarget, sanitizeNewRecord, ctxFromConfig } from './immofinderRepair.ts';
import { resolveEnrichmentConfig, enrichContacts, applyEnrichmentToRecord, type EnrichmentInput } from './immofinderContactEnrichment.ts';
import { verifyListingAdmission, buildTrustSearchPlan } from './immofinderTrustEngine.ts';
import { buildC131LetterDraft, hasPageContactAction } from './immofinderLetter.ts';

export interface ListingRecord {
  listing_type: ListingType; canonical_key: string; listing_url: string; source_urls: string[]; source_ids: string[]; photo_urls: string[]; municipality: string; property_name: string;
  rooms_text: string; rooms_estimated: number; rooms_basis: string; street_address: string | null; description_de: string; description_ru: string; title_ru: string; owner_name: string | null; rent_monthly_chf: number | null; pricing_unit: string | null; listed_at: string | null;
  direct_phone: string | null; direct_email: string | null; contact_evidence: { type: string; value: string; url: string }[]; contact_status: 'found' | 'not_found' | 'platform_only';
  contact_advice: string; private_signals: string[]; draft_message_de: string; raw: Record<string, unknown>;
}
export interface ImmoStore {
  findByUrl(url: string): Promise<{ id: string; last_seen_at: string; hidden: boolean; autoHidden: boolean } | null>;
  touch(id: string): Promise<void>;
  upsert(rec: ListingRecord): Promise<'new' | 'updated'>;
  getSeen(url: string): Promise<{ checked_at: string; decision?: string; reason?: string } | null>;
  markSeen(url: string, sourceId: string, decision: string, reason: string): Promise<void>;
}
export interface PipelineDeps {
  config: ImmoConfig;
  fetchPage(url: string): Promise<{ ok: boolean; status: number; body: string; finalUrl?: string; fetchMode?: string }>;
  /** Returns one parsed JSON object; null disables model extraction (dry run / no key). */
  llm: ((system: string, prompt: string) => Promise<unknown>) | null;
  store: ImmoStore;
  /** Web search for discovery (Serper); null disables discovery. */
  search?: ((q: string, options?: { tbs?: string }) => Promise<SearchHit[]>) | null;
  /** Number of finished real runs; rotates which communes discovery covers. */
  cycle?: number;
  /** Called often with a short human-readable status; must be cheap and must not throw. */
  onProgress?: (e: ProgressEvent) => void;
  /** Cost guard: after this many model calls the rest of the run uses the deterministic fallback. */
  maxLlmCalls?: number;
  now?: () => number;
  /**
   * Optional reverse-image search (public pages only).
   * When omitted, enrichment still runs secondary text search.
   */
  reverseImageSearch?: (imageUrl: string) => Promise<SearchHit[]>;
  /** When true, the pipeline stops between items and returns what it has. */
  shouldCancel?: () => boolean;
  /** PostgreSQL-persisted state restored after a worker/process replacement. */
  resume?: PipelineResumeState;
  /** Persist a query checkpoint only after its candidates have been fully processed. */
  onCheckpoint?: (checkpoint: PipelineResumeState) => void | Promise<void>;
  /**
   * Called after the priority wave (high-value catalogues, ~first 10 min) with listings found in that wave.
   * Used to push an early delivery (UI / Drive / email) before the extended wave continues.
   */
  onWaveComplete?: (info: { wave: 'priority' | 'extended' | 'carousel'; newInWave: ListingRecord[]; counts: Record<string, number> }) => void | Promise<void>;
}
export interface ProgressEvent { stage: 'catalogue' | 'search' | 'delivery'; text: string; current?: number; total?: number; counts: Record<string, number>; /** Communes in this carousel tick (shown in UI step title). */ communes?: string[] }
export interface SourceStats {
  id: string;
  queries: number;
  hits: number;
  candidates: number;
  fetched: number;
  llm: number;
  kept: number;
  new: number;
  agencies: number;
  junk: number;
  geo: number;
  consecutiveBad: number;
  stoppedEarly?: boolean;
}
export interface RunResult {
  counts: Record<string, number>; filtered: Record<string, number>; errors: { source: string; code: string; detail?: string }[];
  newListings: ListingRecord[]; preview: { url: string; title: string; source: string; municipality: string | null; rooms: number | null; kept: boolean; reason?: string; detail?: string }[]; estCostUsd: number;
  /** Listings first seen during the priority wave (for dual delivery). */
  priorityNewListings?: ListingRecord[];
  /** Per-source funnel for productivity ranking and debugging. */
  sourceStats?: SourceStats[];
  /** Which wave(s) actually ran. */
  wavesRun?: ('priority' | 'extended' | 'carousel')[];
}

/** Durable recovery state; a query is complete only after all its candidates were processed. */
export interface PipelineResumeState {
  completedQueryKeys?: string[];
  discoveryProcessedItems?: number;
  counts?: Record<string, number>;
  filtered?: Record<string, number>;
  sourceStats?: SourceStats[];
  wavesRun?: RunResult['wavesRun'];
}

const MIN_DIRECT_PAGE_TEXT_CHARS = 120;
interface Extract { name: string; municipality: string | null; streetAddress: string | null; rooms: { rooms: number; basis: string; quote: string } | null; owner: string | null; agency: string | null; regForbidden: boolean; single: boolean; summaryDe: string; signals: string[]; llm: boolean; priceQuote: string | null; listedAtQuote: string | null }

/** Listing facts are derived deterministically from the fetched detail page; no model prompt is used. */
async function extract(deps: PipelineDeps, text: string, meta: ReturnType<typeof pageMeta>, host: string): Promise<{ ex: Extract; llmCalls: number }> {
  const cfg = deps.config;
  const pageLead = meta.title + '\n' + text.slice(0, 5000);
  const parsedRooms = parseRooms(pageLead);
  const rooms = parsedRooms?.basis === 'zimmer' ? parsedRooms : null;
  const price = parsePrice(pageLead);
  const listedAt = parseListedAt(text, undefined, meta.published);
  const municipality = matchMunicipality(meta.title + '\n' + text, cfg.municipalities);
  return {
    llmCalls: 0,
    ex: {
      name: meta.title.trim() || host,
      municipality,
      streetAddress: null,
      rooms: rooms ? { rooms: rooms.rooms, basis: rooms.basis, quote: '' } : null,
      owner: null,
      agency: isStopAgency(meta.title, cfg.stopAgencies),
      regForbidden: registrationForbidden(text, null),
      single: true,
      summaryDe: meta.description.slice(0, 280),
      signals: ['deterministic_page_extraction'],
      llm: false,
      priceQuote: price?.quote ?? null,
      listedAtQuote: listedAt?.toISOString() ?? null,
    },
  };
}

interface Item { url: string; hit?: SearchHit; snippetOnly?: boolean; municipalityHint?: string | null; expandableIndex?: boolean }
interface SrcMeta { id: string; cutMarkers?: string[]; privateTitleHint?: string }

export type RunWave = 'priority' | 'extended' | 'full' | 'carousel';

export async function runPipeline(deps: PipelineDeps, opts: { dryRun: boolean; wave?: RunWave }): Promise<RunResult> {
  const { config: cfg } = deps; const now = deps.now ?? Date.now;
  const diagnosticRunId = randomUUID();
  const diagnosticStartedAt = now();
  const safeDiagText = (value: unknown, max = 500) => String(value ?? '').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]').replace(/(?:\+?\d[\d\s().-]{6,}\d)/g, '[phone]').slice(0, max);
  const safeDiagUrl = (value: unknown) => { try { const u = new URL(String(value)); return u.hostname + u.pathname; } catch { return '[invalid-url]'; } };
  const diag = (event: string, details: Record<string, unknown> = {}) => { try { console.info(JSON.stringify({ type: 'immofinder_trace', traceId: diagnosticRunId, event, at: new Date(now()).toISOString(), elapsedMs: Math.max(0, now() - diagnosticStartedAt), ...details })); } catch { /* diagnostics must never affect search */ } };
  diag('run_started', { wave: opts.wave || 'full', dryRun: opts.dryRun, municipalities: cfg.municipalities, minRooms: cfg.minRooms, discoveryEnabled: Boolean(cfg.discovery?.enabled), privateQueryTemplates: cfg.discovery?.queries?.length || 0, portalQueryTemplates: cfg.discovery?.portalQueries?.length || 0, maxCandidatesPerQuery: cfg.discovery?.maxCandidatesPerQuery ?? 4, pageLimit: cfg.discovery?.maxPagesPerRun ?? null, runMaxDurationMs: cfg.runMaxDurationMs ?? null, factExtractor: 'deterministic_page_only', llmEnabled: false, searchEnabled: Boolean(deps.search), sourceCount: cfg.sources.length });
  const waveMode: RunWave = opts.wave === 'priority' || opts.wave === 'extended' || opts.wave === 'carousel' ? opts.wave : 'full';
  const resume = deps.resume || {};
  const res: RunResult = {
    counts: { sources: 0, index_pages: 0, candidates: 0, fetched: 0, snippet_only: 0, skipped_known: 0, skipped_seen: 0, skipped_geo: 0, search_queries: 0, serper_calls: 0, serper_fallback: 0, llm_skipped_no_rooms: 0, kept: 0, new: 0, updated: 0, llm_calls: 0, enriched: 0, ...(resume.counts || {}) },
    filtered: { ...(resume.filtered || {}) }, errors: [], newListings: [], preview: [], estCostUsd: 0,
    sourceStats: [], wavesRun: [...(resume.wavesRun || [])],
  };
  const drop = (r: string) => { res.filtered[r] = (res.filtered[r] || 0) + 1; };
  /** Communes for the current carousel tick — attached to every progress event for the UI title. */
  let carouselCommunesSlot: string[] = [];
  const say = (stage: ProgressEvent['stage'], text: string, current?: number, total?: number) => { try { deps.onProgress?.({ stage, text, current, total, counts: { ...res.counts }, communes: carouselCommunesSlot.length ? carouselCommunesSlot : undefined }); } catch { /* progress must never break a run */ } };
  const fresh = (iso: string) => now() - new Date(iso).getTime() < cfg.limits.recheckAfterDays * 86400000;
  const enrichCfg = resolveEnrichmentConfig(cfg);
  const enrichBudget = {
    searchesLeft: enrichCfg.enabled ? enrichCfg.maxExtraSearchesPerRun : 0,
    reverseImageLeft: enrichCfg.enabled ? enrichCfg.maxReverseImagePerRun : 0,
  };
  const quality: QualitySettings = { ...DEFAULT_QUALITY, ...(cfg.quality || {}) };
  const runDeadline = now() + (cfg.runMaxDurationMs ?? 30 * 60 * 1000);
  /** Active wave deadline (priority wave tightens this to ~10 min). */
  let waveDeadline = runDeadline;
  const timeLeft = () => Math.min(runDeadline, waveDeadline) - (deps.now ?? Date.now)();
  const sourceStatMap = new Map<string, SourceStats>((resume.sourceStats || []).map((stat) => [stat.id, { ...stat }]));
  const getStat = (id: string): SourceStats => {
    let s = sourceStatMap.get(id);
    if (!s) { s = { id, queries: 0, hits: 0, candidates: 0, fetched: 0, llm: 0, kept: 0, new: 0, agencies: 0, junk: 0, geo: 0, consecutiveBad: 0 }; sourceStatMap.set(id, s); }
    return s;
  };
  // Catalogues: stop after a short bad streak (marketing pages). Search SERP is mixed — need a much higher bar.
  const consecutiveStopFor = (id: string) => (id === 'search' ? 64 : 14);
  /** Hard cap per LLM attempt — never sleep minutes between retries (UI looked frozen). */
  const STEP_MS = 10_000;
  const SERPER_STEP_MS = 40_000;
  const withStepTimeout = async <T,>(label: string, work: () => Promise<T>, timeoutMs = STEP_MS): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        work(),
        new Promise<T>((_, rej) => {
          timer = setTimeout(() => rej(new Error(`step_timeout:${label}`)), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };


  /** Fetch and verify one direct listing page before extraction, filtering and persistence. */
  async function processItems(src: SrcMeta, items: Item[], maxPages: number) {
    // P130.10 expandable expansion: Homegate/ImmoScout trefferliste → concrete /mieten/{id} (or en/fr flat) detail URLs
    const expanded: Item[] = [];
    for (const it of items) {
      if (!(it as any).expandableIndex) { expanded.push(it); continue; }
      try {
        const listPg = await withStepTimeout('fetch', () => deps.fetchPage(it.url), 25_000);
        if (!listPg.ok || !listPg.body || listPg.body.length < 80) {
          diag('expandable_index_fetch_failed', { source: src.id, url: safeDiagUrl(it.url), status: listPg.status });
          continue;
        }
        const detailRe = /homegate\.ch|immoscout24\.ch/i.test(it.url)
          ? /\/(mieten|rent)\/\d{5,}|\/(de|en|fr)\/flat\/[^"'\s]+\/\d{5,}/i
          : /\/\d{6,}(?:\/|$)|\/(mieten|rent)\/\d{5,}/i;
        // SPA list pages often omit classic <a href>; also harvest bare path ids from HTML/JSON.
        const fromAnchors = candidateLinks(listPg.body, listPg.finalUrl || it.url, 40, detailRe);
        const bareRe = /(?:https?:\/\/(?:www\.)?(?:homegate|immoscout24)\.ch)?(\/(?:mieten|rent)\/\d{5,})/gi;
        const fromBare: string[] = [];
        let bm: RegExpExecArray | null;
        const baseHost = (() => { try { return new URL(listPg.finalUrl || it.url).origin; } catch { return 'https://www.homegate.ch'; } })();
        while ((bm = bareRe.exec(listPg.body)) !== null) {
          const path = bm[1];
          const abs = path.startsWith('http') ? path : baseHost + path;
          fromBare.push(abs);
        }
        // listingId_json_harvest: Homegate SPA embeds numeric ids without path prefixes
        const idRe = /"listingId"\s*:\s*(\d{6,})|"id"\s*:\s*(\d{7,})|\/rent\/(\d{6,})|\/mieten\/(\d{6,})/gi;
        let im: RegExpExecArray | null;
        while ((im = idRe.exec(listPg.body)) !== null) {
          const id = im[1] || im[2] || im[3] || im[4];
          if (!id) continue;
          const origin = (() => { try { return new URL(listPg.finalUrl || it.url).origin; } catch { return 'https://www.homegate.ch'; } })();
          fromBare.push(origin + '/mieten/' + id);
          fromBare.push(origin + '/rent/' + id);
        }
        // homegate_400_id_harvest: classic Homegate numeric ids often appear as 400xxxxxxx in SPA payloads
        const hgIdRe = /\b(400\d{6,9})\b/g;
        let hg: RegExpExecArray | null;
        while ((hg = hgIdRe.exec(listPg.body)) !== null) {
          const origin2 = (() => { try { return new URL(listPg.finalUrl || it.url).origin; } catch { return 'https://www.homegate.ch'; } })();
          fromBare.push(origin2 + '/mieten/' + hg[1]);
        }
        const uniq = [...new Set([...fromAnchors, ...fromBare])].slice(0, 6);
        diag('expandable_index_expanded', { source: src.id, listUrl: safeDiagUrl(it.url), detailCount: uniq.length, sample: uniq.slice(0, 3).map(safeDiagUrl) });
        for (const u of uniq) {
          expanded.push({ url: u, hit: it.hit ? { ...it.hit, link: u, title: it.hit.title || 'Homegate detail' } : undefined, snippetOnly: false, municipalityHint: it.municipalityHint, expandableIndex: false });
        }
      } catch (e) {
        diag('expandable_index_error', { source: src.id, url: safeDiagUrl(it.url), error: safeDiagText((e as Error)?.message || e, 200) });
      }
    }
    items = expanded.length ? expanded : items.filter((it) => !(it as any).expandableIndex);

    res.counts.candidates += items.length;
    const st = getStat(src.id);
    st.candidates += items.length;
    const isDiscoverySource = src.id === 'search' || src.id.startsWith('portal-');
    const stage: ProgressEvent['stage'] = isDiscoverySource ? 'search' : 'catalogue'; let idx = 0;
    const pages: { url: string; evidenceUrl: string; finalUrl: string | null; fetchMode?: string; host: string; meta: ReturnType<typeof pageMeta>; text: string; ex: Extract; hitDate?: string | null; knownAutoHidden: boolean; provisional: boolean }[] = [];
    for (const it of items) {
      if (deps.shouldCancel?.()) { res.errors.push({ source: src.id, code: 'cancelled', detail: 'Stopped by user' }); break; }
      if (pages.length >= maxPages) break;
      const stopAt = consecutiveStopFor(src.id);
      if (!isDiscoverySource && st.consecutiveBad >= stopAt) {
        st.stoppedEarly = true;
        res.errors.push({ source: src.id, code: 'source_early_stop', detail: `${stopAt} consecutive non-keeps; skipping rest of source` });
        say(stage, `${src.id}: early stop after ${stopAt} consecutive bad results`);
        break;
      }
      diag('candidate_received', { source: src.id, url: safeDiagUrl(it.url), host: hostOf(it.url), title: safeDiagText(it.hit?.title, 180), snippetOnly: Boolean(it.snippetOnly), hasSearchHit: Boolean(it.hit) });
      const known = await deps.store.findByUrl(it.url);
      const knownFresh = known && (known.autoHidden
        ? now() - new Date(known.last_seen_at).getTime() < 6 * 60 * 60 * 1000
        : fresh(known.last_seen_at));
      if (known && knownFresh) { if (!opts.dryRun && !known.hidden) await deps.store.touch(known.id); res.counts.skipped_known++; diag('candidate_skipped_known', { source: src.id, url: safeDiagUrl(it.url), hidden: known.hidden, autoHidden: known.autoHidden, lastSeenAt: known.last_seen_at }); continue; }
      const seen = await deps.store.getSeen(it.url);
      if (seen) {
        // Soft quality rejects (rooms/price/municipality/seeker) recheck after 6h so new evidence can be tried;
        // hard rejects (list pages, for_sale, agency, non-listing) keep full recheckAfterDays.
        const soft = /^(rooms_|price_|municipality_|seeker_|min_rooms|detail_page_|not_single_listing|trust_)/i.test(seen.reason || '') || seen.decision === 'filtered' && /^(rooms|price|municipality|seeker)/i.test(seen.reason || '');
        const ttlMs = soft ? 6 * 60 * 60 * 1000 : cfg.limits.recheckAfterDays * 86400000;
        const isFresh = now() - new Date(seen.checked_at).getTime() < ttlMs;
        if (isFresh && !known?.autoHidden) {
          res.counts.skipped_seen++;
          diag('candidate_skipped_seen', { source: src.id, url: safeDiagUrl(it.url), reason: seen.reason || 'unknown', decision: seen.decision || 'unknown', checkedAt: seen.checked_at, ttlHours: Math.round(ttlMs / 3600000) });
          try { console.info(JSON.stringify({ type: 'immofinder_candidate_skipped_seen', host: hostOf(it.url), title: String(it.hit?.title || '').slice(0, 90), reason: seen.reason || 'unknown', decision: seen.decision || 'unknown', ageHours: Math.round((now() - new Date(seen.checked_at).getTime()) / 3_600_000), ttlHours: Math.round(ttlMs / 3_600_000) })); } catch { /* diagnostics only */ }
          continue;
        }
      }
      // Skip URLs that clearly name a place outside the whitelist (no fetch, no LLM).
      const place = placeFromUrl(it.url, cfg.municipalities);
      if (place.outside) {
        diag('candidate_rejected_prefetch', { source: src.id, url: safeDiagUrl(it.url), reason: 'municipality_not_whitelisted', stage: 'url_geo', placeHint: place.hint });
        res.counts.skipped_geo = (res.counts.skipped_geo || 0) + 1;
        st.geo++; st.consecutiveBad++;
        drop('municipality_not_whitelisted');
        res.preview.push({ url: it.url, title: (it.hit?.title || place.hint || it.url).slice(0, 90), source: src.id, municipality: null, rooms: null, kept: false, reason: 'municipality_not_whitelisted', detail: `url_place:${place.hint}` });
        /* insufficient location evidence: do not poison seen */
        continue;
      }
      // Title / snippet geo prefilter (search hits and catalogue titles that already name a distant resort).
      const titleGeo = placeFromTitleOrSnippet(it.hit?.title || '', it.hit?.snippet || '', cfg.municipalities);
      if (titleGeo.outside) {
        diag('candidate_rejected_prefetch', { source: src.id, url: safeDiagUrl(it.url), reason: 'municipality_not_whitelisted', stage: 'title_snippet_geo', placeHint: titleGeo.hint });
        res.counts.skipped_geo = (res.counts.skipped_geo || 0) + 1;
        st.geo++; st.consecutiveBad++;
        drop('municipality_not_whitelisted');
        res.preview.push({ url: it.url, title: (it.hit?.title || titleGeo.hint || it.url).slice(0, 90), source: src.id, municipality: null, rooms: null, kept: false, reason: 'municipality_not_whitelisted', detail: `title_place:${titleGeo.hint}` });
        /* insufficient location evidence: do not poison seen */
        continue;
      }
      // Title from search hit can reject list pages before fetch
      if (it.hit?.title) {
        const nlHit = nonListingReason(it.hit.title, it.url, cfg.discovery?.portalHosts || []);
        if (nlHit) {
          diag('candidate_rejected_prefetch', { source: src.id, url: safeDiagUrl(it.url), reason: nlHit, stage: 'search_title' });
          st.junk++; st.consecutiveBad++;
          drop(nlHit);
          res.preview.push({ url: it.url, title: it.hit.title.slice(0, 90), source: src.id, municipality: null, rooms: null, kept: false, reason: nlHit, detail: 'prefilter_title' });
          if (!opts.dryRun) await deps.store.markSeen(it.url, src.id, 'filtered', nlHit);
          continue;
        }
      }
      const host = hostOf(it.url); idx++; say(stage, `${src.id}: reading ${idx}/${items.length} · ${host}${new URL(it.url).pathname.slice(0, 50)}`, idx, items.length); let text = ''; let meta: ReturnType<typeof pageMeta>; let evidenceUrl = '';
      const rejectUnverified = async (reason: string, detail: string) => {
        drop(reason); st.junk++; st.consecutiveBad++;
        const title = (it.hit?.title || it.url).slice(0, 90);
        res.preview.push({ url: it.url, title, source: src.id, municipality: null, rooms: null, kept: false, reason, detail: detail.slice(0, 120) });
        diag('candidate_rejected_before_extraction', { source: src.id, url: safeDiagUrl(it.url), host: hostOf(it.url), title: safeDiagText(title, 180), reason, detail: safeDiagText(detail, 240) });
        try { console.info(JSON.stringify({ type: 'immofinder_candidate_rejected', source: src.id, host: hostOf(it.url), title, reason, detail: detail.slice(0, 120) })); } catch { /* diagnostics only */ }
        try { await deps.store.markSeen(it.url, src.id, 'filtered', reason); } catch { /* cache is advisory; do not abort discovery */ }
        say(stage, `✖ ${reason}: ${title.slice(0, 60)}`);
      };
      // Social feeds may expose an ad only as a post/snippet. Preserve it as provisional evidence.
      let snippetEvidence = Boolean(it.snippetOnly && it.hit);
      if (snippetEvidence) res.counts.snippet_only++;
      let pg: { ok: boolean; status: number; body: string; finalUrl?: string; fetchMode?: string };
      const fetchStartedAt = now();
      const buildSnippetPage = (fetchMode = 'search_snippet') => {
        const esc = (v: string) => String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
        const title = String(it.hit?.title || '').slice(0, 300);
        const snippet = String(it.hit?.snippet || '').slice(0, 3000);
        const body = '<html><head><title>' + esc(title) + '</title><meta name="description" content="' + esc(snippet) + '"></head><body><main>' + esc(title) + '<br>' + esc(snippet) + '</main></body></html>';
        return { ok: true, status: 200, body, finalUrl: it.url, fetchMode };
      };
      if (snippetEvidence) {
        pg = buildSnippetPage();
        diag('candidate_snippet_used', { source: src.id, url: safeDiagUrl(it.url), host, title: safeDiagText(it.hit?.title, 180), snippet: safeDiagText(it.hit?.snippet, 700), municipalityHint: it.municipalityHint || null, evidenceConfidence: 'low' });
      } else {
        try {
          pg = await withStepTimeout('fetch', () => deps.fetchPage(it.url), 25_000);
        } catch (fetchError) {
          pg = { ok: false, status: 0, body: String((fetchError as Error)?.message || fetchError).slice(0, 240) };
          res.errors.push({ source: src.id, code: 'step_timeout', detail: `fetch >${STEP_MS}ms ${it.url}`.slice(0, 200) });
          say(stage, `skip slow page (>${Math.round(STEP_MS / 1000)}s): ${hostOf(it.url)}`);
        }
      }
      if (!pg.ok) {
        diag('candidate_fetch_failed', { source: src.id, url: safeDiagUrl(it.url), status: pg.status, fetchMode: pg.fetchMode || null, durationMs: now() - fetchStartedAt, error: safeDiagText(pg.body, 300), finalUrl: safeDiagUrl(pg.finalUrl || it.url) });
        const availableSnippet = (String(it.hit?.title || '') + '\n' + String(it.hit?.snippet || '')).trim();
        const originalFetchStatus = pg.status;
        if (it.hit && availableSnippet.length >= 18) {
          snippetEvidence = true;
          res.counts.snippet_only++;
          pg = buildSnippetPage('search_snippet_fetch_fallback');
          diag('candidate_snippet_fallback_after_fetch_failure', { source: src.id, url: safeDiagUrl(it.url), host, originalFetchStatus, snippetChars: availableSnippet.length, evidenceConfidence: 'low' });
        } else {
          if (it.hit) {
            res.counts.snippet_only++;
            rejectUnverified('detail_page_fetch_failed', 'http_' + String(pg.status || 0));
          } else {
            res.errors.push({ source: src.id, code: 'detail_fetch_failed', detail: String(pg.status) + ' ' + it.url.slice(0, 200) });
            st.consecutiveBad++;
          }
          continue;
        }
      }
      if (!snippetEvidence) {
        res.counts.fetched++; st.fetched++;
        diag('candidate_fetch_succeeded', { source: src.id, url: safeDiagUrl(it.url), status: pg.status, fetchMode: pg.fetchMode || 'unknown', durationMs: now() - fetchStartedAt, bodyChars: String(pg.body || '').length, textChars: htmlToText(pg.body).trim().length, finalUrl: safeDiagUrl(pg.finalUrl || it.url) });
      }
      const fetchedUrl = String(pg.finalUrl || '').trim();
      if (fetchedUrl && !sameListingUrlTarget(it.url, fetchedUrl)) {
        diag('candidate_redirect_mismatch', { source: src.id, requestedUrl: safeDiagUrl(it.url), finalUrl: safeDiagUrl(fetchedUrl) });
        const availableSnippet = (String(it.hit?.title || '') + '\n' + String(it.hit?.snippet || '')).trim();
        if (it.hit && availableSnippet.length >= 18) {
          snippetEvidence = true;
          res.counts.snippet_only++;
          pg = buildSnippetPage('search_snippet_redirect_fallback');
          evidenceUrl = it.url;
          diag('candidate_snippet_fallback_after_redirect', { source: src.id, requestedUrl: safeDiagUrl(it.url), redirectedTo: safeDiagUrl(fetchedUrl), snippetChars: availableSnippet.length, evidenceConfidence: 'low' });
        } else {
          await rejectUnverified('detail_page_url_mismatch', 'final_url:' + fetchedUrl.slice(0, 120));
          continue;
        }
      } else {
        evidenceUrl = fetchedUrl || it.url;
      }
      text = cutAtMarkers(htmlToText(pg.body), src.cutMarkers);
      if (text.trim().length < MIN_DIRECT_PAGE_TEXT_CHARS && !snippetEvidence && it.hit && (String(it.hit.title || '') + '\n' + String(it.hit.snippet || '')).trim().length >= 18) {
        diag('candidate_page_text_too_short', { source: src.id, url: safeDiagUrl(it.url), textChars: text.trim().length, bodyChars: String(pg.body || '').length, fetchMode: pg.fetchMode || 'direct' });
        snippetEvidence = true;
        res.counts.snippet_only++;
        pg = buildSnippetPage('search_snippet_short_page_fallback');
        evidenceUrl = it.url;
        text = cutAtMarkers(htmlToText(pg.body), src.cutMarkers);
        diag('candidate_snippet_fallback_after_short_page', { source: src.id, url: safeDiagUrl(it.url), snippetChars: (String(it.hit.title || '') + String(it.hit.snippet || '')).length, evidenceConfidence: 'low' });
      }
      if (text.trim().length < (snippetEvidence ? 18 : MIN_DIRECT_PAGE_TEXT_CHARS)) {
        diag('candidate_page_text_too_short', { source: src.id, url: safeDiagUrl(it.url), textChars: text.trim().length, bodyChars: String(pg.body || '').length, fetchMode: pg.fetchMode || 'direct' });
        await rejectUnverified('detail_page_evidence_too_short', 'chars:' + text.trim().length + ';mode:' + (pg.fetchMode || 'direct'));
        continue;
      }
      meta = pageMeta(pg.body, evidenceUrl);
      if (snippetEvidence && it.hit) {
        meta.title = String(it.hit.title || meta.title).slice(0, 300);
        meta.description = String(it.hit.snippet || '').slice(0, 500);
      }
      // After a verified page or provisional snippet: cheap geo / non-listing before spending an LLM call.
      const pageGeo = placeFromTitleOrSnippet(meta!.title, text.slice(0, 800), cfg.municipalities);
      if (pageGeo.outside) {
        res.counts.skipped_geo = (res.counts.skipped_geo || 0) + 1;
        st.geo++; st.consecutiveBad++;
        drop('municipality_not_whitelisted');
        res.preview.push({ url: it.url, title: meta!.title.slice(0, 90), source: src.id, municipality: null, rooms: null, kept: false, reason: 'municipality_not_whitelisted', detail: `page_place:${pageGeo.hint}` });
        /* insufficient location evidence: do not poison seen */
        continue;
      }
      const nlEarly = nonListingReason(meta!.title, it.url, cfg.discovery?.portalHosts || []);
      if (nlEarly) {
        st.junk++; st.consecutiveBad++;
        drop(nlEarly);
        res.preview.push({ url: it.url, title: meta!.title.slice(0, 90), source: src.id, municipality: null, rooms: null, kept: false, reason: nlEarly, detail: 'prefilter_after_fetch' });
        if (!opts.dryRun) await deps.store.markSeen(it.url, src.id, 'filtered', nlEarly);
        continue;
      }
      if (timeLeft() < 30_000) { res.errors.push({ source: src.id, code: 'run_time_budget', detail: '30 minute cycle limit reached' }); break; }
      const extractionStartedAt = now();
      const { ex, llmCalls } = await extract(deps, text, meta!, host);
      if (snippetEvidence && !ex.municipality && it.municipalityHint) {
        ex.signals.push('municipality_search_hint_not_evidence');
      }
      if (snippetEvidence && !ex.rooms) {
        // Leave rooms null — inventing 0 previously bypassed minRooms and produced garbage cards.
        ex.signals.push('rooms_unverified');
      }
      // SERP title/snippet often carries "3.5 Zimmer" when the fetched page title is a brand (iCasa.ch).
      if (!ex.rooms && it.hit) {
        const serpRooms = parseRooms(`${it.hit.title || ''}\n${it.hit.snippet || ''}`);
        if (serpRooms) {
          ex.rooms = { rooms: serpRooms.rooms, basis: serpRooms.basis || 'serp_title', quote: '' };
          ex.signals.push('rooms_from_serp_title');
        }
      }
      if (snippetEvidence) ex.signals.push('provisional_search_snippet');
      diag('candidate_extracted', { source: src.id, url: safeDiagUrl(it.url), title: safeDiagText(meta!.title, 180), textChars: text.length, llmUsed: ex.llm, llmCalls, extractionDurationMs: now() - extractionStartedAt, single: ex.single, agencyDetected: Boolean(ex.agency), municipality: ex.municipality, rooms: ex.rooms?.rooms ?? null, roomsBasis: ex.rooms?.basis ?? null, priceQuotePresent: Boolean(ex.priceQuote), listedAtQuotePresent: Boolean(ex.listedAtQuote), ownerVerified: Boolean(ex.owner), regForbidden: ex.regForbidden });
      if (src.privateTitleHint && meta!.title.toLowerCase().includes(src.privateTitleHint.toLowerCase())) ex.signals.push('platform_says_private');
      res.counts.llm_calls += llmCalls; st.llm += llmCalls;
      pages.push({ url: it.url, evidenceUrl, finalUrl: pg.finalUrl || null, fetchMode: pg.fetchMode, host, meta: meta!, text, ex, hitDate: (it.hit as any)?.date ? String((it.hit as any).date) : null, knownAutoHidden: Boolean(known?.autoHidden), provisional: snippetEvidence });
    }
    // Phones repeated on several pages of one host belong to the platform, not to an owner.
    const phoneUse = new Map<string, number>();
    const contacts = pages.map((p) => extractContacts(p.text, cfg.platformDomains));
    contacts.forEach((c, i) => c.phones.forEach((ph) => { const k = `${pages[i].host}|${ph}`; phoneUse.set(k, (phoneUse.get(k) || 0) + 1); }));
    for (let i = 0; i < pages.length; i++) {
      const { url, evidenceUrl, fetchMode, host, meta, ex, provisional: snippetEvidence } = pages[i]; const c = contacts[i];
      const deny = async (reason: string, detail?: string) => {
        diag('candidate_rejected_after_extraction', { source: src.id, url: safeDiagUrl(url), host, title: safeDiagText(meta.title, 180), reason, detail: safeDiagText(detail, 240), municipality: ex.municipality, rooms: ex.rooms?.rooms ?? null, roomsBasis: ex.rooms?.basis ?? null, llmUsed: ex.llm });
        if (reason === 'agency') st.agencies++;
        else if (reason === 'municipality_not_whitelisted') st.geo++;
        else st.junk++;
        st.consecutiveBad++;
        drop(reason);
        try { console.log(formatHideLog({ reason, host, title: meta.title, url })); } catch { /* diag */ }
        say(stage, `✖ ${reason}${detail ? ` (${detail.slice(0, 40)})` : ''}: ${meta.title.slice(0, 60)}`); res.preview.push({ url, title: meta.title.slice(0, 90), source: src.id, municipality: ex.municipality, rooms: ex.rooms?.rooms ?? null, kept: false, reason, detail: detail?.slice(0, 120) });
        if (!opts.dryRun && reason !== 'rooms_unknown' && reason !== 'municipality_not_whitelisted' && reason !== 'short_stay_contact_required') await deps.store.markSeen(url, src.id, 'filtered', reason);
      };
      const nl = nonListingReason(meta.title, url, cfg.discovery?.portalHosts || []); if (nl) { await deny(nl); continue; }
      if (!ex.single) { await deny('not_single_listing'); continue; }
      if (ex.agency) { await deny('agency', ex.agency); continue; }
      if (looksLikeAgencyListing(meta.title, pages[i].text)) { await deny('agency', 'agency_language'); continue; }
      if (!ex.municipality) { await deny('municipality_not_whitelisted', 'no_page_locality_evidence'); continue; }
      const geoPre = placeFromTitleOrSnippet(meta.title, pages[i].text.slice(0, 600), cfg.municipalities);
      if (geoPre.outside && !ex.municipality) { await deny('municipality_not_whitelisted', 'outside:' + (geoPre.hint || '')); continue; }
      if (!snippetEvidence && (!ex.rooms || !(ex.rooms.rooms > 0))) { await deny('rooms_unknown'); continue; }
      if (ex.rooms && ex.rooms.rooms > 0 && ex.rooms.rooms < cfg.minRooms) { await deny('rooms_below_min', String(ex.rooms.rooms)); continue; }
      // Group houses / hostels mis-parsed as 15–68 rooms — never a private 3.5-room flat
      if (ex.rooms && ex.rooms.rooms >= 12) { await deny('rooms_too_many', String(ex.rooms.rooms)); continue; }
      if (ex.regForbidden) { await deny('registration_forbidden'); continue; }
      // FB group root / _join_ / portal list URLs are not one ad; owner microsites without an ID still get a soft signal only.
      if (!snippetEvidence && !isSpecificLink(url) && !isPortalDetailLink(url, cfg)) {
        if (/facebook\.com|newhome\.ch|tutti\.ch|homegate\.ch|immoscout24|flatfox|urbanhome|rentola|cozycozy|booking\.com|home\.ch/i.test(url)) {
          await deny('not_single_listing', 'non_specific_portal_or_social');
          continue;
        }
        ex.signals.push('generic_link');
      }
      if (clearOutOfCantonRegion(pages[i].text)) { await deny('municipality_not_whitelisted', 'foreign_region_markers'); continue; }
      const type = classifyType(meta.title, url, pages[i].text);
      if (LONG_TERM_HINT.test(pages[i].text.slice(0, 6000))) ex.signals.push('long_term_possible');
      const phones = c.phones.filter((p) => (phoneUse.get(`${host}|${p}`) || 0) < 3);
      const evidence = [...phones.slice(0, 1).map((v) => ({ type: 'phone', value: v, url })), ...c.emails.slice(0, 1).map((v) => ({ type: 'email', value: v, url }))];
      const pageText = pages[i].text;
      const evidenceKind: EvidenceKind = snippetEvidence ? 'snippet' : 'page_text';
      res.counts[`evidence_${evidenceKind}`] = (res.counts[`evidence_${evidenceKind}`] || 0) + 1;
      const evidenceText = buildEvidenceText(meta.title, pageText, 4000);
      const priceHay = evidenceText;
      // Prefer prices that appear in evidence text over unverified LLM collage.
      let price = priceFromEvidence(evidenceText, ex.priceQuote) || resolveListingPrice(priceHay, ex.priceQuote);
      const shortStay = isShortStayListing(meta.title, url, pageText, price);
      const hitDate = pages[i].hitDate || meta.published || null;
      const listedAt = parseListedAt(
        `${meta.title}\n${pageText.slice(0, 12000)}\n${ex.listedAtQuote || ''}`,
        url,
        meta.published || ex.listedAtQuote || null,
      );
      const seeker = isSeekerPost(meta.title, evidenceText);
      if (seeker) ex.signals.push('seeker_post');
      if (isListingUnavailable(meta.title, evidenceText)) { await deny('listing_unavailable', 'page_states_unavailable'); continue; }
      // Product gate: one coherent listing or drop (ARCHITECTURE: ImmoFinder search quality).
      let phone0 = phones[0] ?? null;
      let email0 = c.emails[0] ?? null;
      if (isPlatformOrJunkContact(email0, phone0)) {
        ex.signals.push('platform_contact_stripped');
        email0 = isPlatformOrJunkContact(email0, null) ? null : email0;
        phone0 = isPlatformOrJunkContact(null, phone0) ? null : phone0;
      }
      const credReason = credibilityRejectReason({
        title: meta.title,
        evidenceText,
        url,
        municipality: ex.municipality,
        roomsEstimated: ex.rooms?.rooms ?? null,
        price,
        phone: phone0,
        email: email0,
        evidenceKind,
        municipalities: cfg.municipalities,
        allowSnippet: snippetEvidence,
        allowShortStay: shortStay,
      });
      if (credReason) { await deny(credReason, evidenceKind); continue; }
      const shortStayReason = shortStayPreflightReason({ shortStay, price, url, evidenceKind, evidenceText });
      if (shortStayReason) { await deny(shortStayReason, evidenceKind); continue; }
      const qualityReason = qualityRejectReason(quality, price, listedAt, seeker, !!(phone0 || email0), now());
      // Provisional snippet must not keep a price that would fail the real gate (PLZ/error codes as rent).
      if (snippetEvidence && (qualityReason === 'price_above_max' || qualityReason === 'price_not_monthly')) {
        price = null;
        ex.priceQuote = null;
        if (qualityReason) ex.signals.push('provisional_price_cleared:' + qualityReason);
      }
      const qReason = snippetEvidence ? null : qualityReason;
      if (snippetEvidence && qualityReason) ex.signals.push('provisional_quality_gate:' + qualityReason);
      // A: diagnostics when price missing or reject is price_*
      if (!price || qReason === 'price_unknown' || qReason === 'price_above_max' || (price && price.monthlyChf == null)) {
        try {
          console.log(JSON.stringify({
            type: 'immofinder_price_diag',
            url: url.slice(0, 180),
            source: src.id,
            municipality: ex.municipality,
            priceQuoteLlm: ex.priceQuote,
            parsed: price,
            qReason: qReason || null,
            snippet: priceDiagSnippet(priceHay),
          }));
        } catch { /* never break run */ }
      }
      if (qReason) { await deny(qReason, price?.quote || listedAt?.toISOString()); continue; }
      // About text: prefer verified excerpt over free LLM paraphrase when summary is not grounded.
      // Always dedupe title/snippet echo so cards do not show the same phrase twice.
      const summaryOk = ex.summaryDe && verifyQuote(evidenceText, ex.summaryDe.slice(0, 80));
      const rawAbout = summaryOk
        ? ex.summaryDe
        : evidenceText.split('\n').slice(0, 6).join(' ').replace(/\s+/g, ' ').trim();
      const descriptionDe = dedupeSnippetText(ex.name || meta.title || '', rawAbout).slice(0, 500);
      const contactEvidence = [
        ...(phone0 ? [{ type: 'phone' as const, value: phone0, url: pages[i].finalUrl || evidenceUrl }] : []),
        ...(email0 ? [{ type: 'email' as const, value: email0, url: pages[i].finalUrl || evidenceUrl }] : []),
      ];
      const rec: ListingRecord = {
        listing_type: type, canonical_key: canonicalKey(ex.name, ex.municipality, hostOf(url)), listing_url: url, source_urls: [url], source_ids: [src.id], photo_urls: meta.photos, municipality: ex.municipality, property_name: ex.name,
        rooms_text: ex.rooms?.quote || '', rooms_estimated: ex.rooms?.rooms ?? 0, rooms_basis: ex.rooms?.basis || '', street_address: ex.streetAddress, description_de: descriptionDe, description_ru: '', title_ru: '', owner_name: ex.owner,
        rent_monthly_chf: price?.monthlyChf ?? null, pricing_unit: price?.unit ?? null, listed_at: listedAt ? listedAt.toISOString() : null,
        direct_phone: phone0, direct_email: email0, contact_evidence: contactEvidence, contact_status: contactEvidence.length ? 'found' : 'platform_only',
        contact_advice: contactEvidence.length ? '' : contactAdvice(url, type), private_signals: ex.signals, draft_message_de: '', raw: { dryRun: opts.dryRun, llm: ex.llm, via: src.id, price, price_quote: price?.quote ?? ex.priceQuote ?? null, listed_at: listedAt ? listedAt.toISOString() : null, evidence_text: evidenceText, evidence_kind: evidenceKind, evidence_url: evidenceUrl, evidence_confidence: snippetEvidence ? 'low' : 'verified_page', provisional: snippetEvidence, search_result_date: hitDate, address_quote: ex.streetAddress },
      };
      const fetchedAt = new Date(now()).toISOString();
      const municipalityIndex = ex.municipality ? pageText.toLowerCase().indexOf(ex.municipality.toLowerCase()) : -1;
      const municipalityQuote = municipalityIndex >= 0 ? pageText.slice(municipalityIndex, municipalityIndex + String(ex.municipality).length) : null;
      const roomQuote = /(?:\d{1,2}(?:[.,]\d)?\s*(?:[- ]?Zimmer|Zi\.?|rooms?|pi[eè]ces?)|(?:Zimmer|rooms?|pi[eè]ces?)\s*[:=]?\s*\d{1,2}(?:[.,]\d)?)/i.exec(pageText)?.[0] || null;
      const fieldEvidence = [
        { field: 'property_name', value: ex.name, verbatim_quote: meta.title, source_url: url, fetched_at: fetchedAt },
        ...(municipalityQuote ? [{ field: 'municipality', value: ex.municipality, verbatim_quote: municipalityQuote, source_url: url, fetched_at: fetchedAt }] : []),
        ...(roomQuote && ex.rooms ? [{ field: 'rooms', value: ex.rooms.rooms, verbatim_quote: roomQuote, source_url: url, fetched_at: fetchedAt }] : []),
        ...(price?.quote && pageText.includes(price.quote) ? [{ field: 'price', value: price.amount, verbatim_quote: price.quote, source_url: url, fetched_at: fetchedAt }] : []),
        ...contactEvidence.map((item) => ({ field: item.type, value: item.value, verbatim_quote: item.value, source_url: item.url, fetched_at: fetchedAt })),
        ...(descriptionDe && pageText.includes(descriptionDe) ? [{ field: 'description', value: descriptionDe, verbatim_quote: descriptionDe, source_url: url, fetched_at: fetchedAt }] : []),
      ];
      rec.raw = { ...rec.raw, fetched_at: fetchedAt, field_evidence: fieldEvidence };
      const trust = verifyListingAdmission({
        requestedUrl: url,
        finalUrl: pages[i].finalUrl,
        title: meta.title,
        pageText,
        municipality: ex.municipality,
        municipalities: cfg.municipalities,
        provisional: snippetEvidence,
        rooms: ex.rooms?.rooms ?? null,
        priceMonthlyChf: price?.monthlyChf ?? null,
        priceUnit: price?.unit ?? null,
        priceQuote: price?.quote ?? null,
        listedAt: listedAt?.toISOString() ?? null,
        maxAgeDays: quality.maxListingAgeDays ?? 180,
        phone: phone0,
        email: email0,
        contactEvidenceUrls: contactEvidence.map((item) => item.url),
        nowMs: now(),
      });
      if ('reason' in trust) { await deny(trust.reason, 'strict_trust_admission'); continue; }
      if (trust.contact === 'phone') {
        rec.direct_email = null;
        rec.contact_evidence = rec.contact_evidence.filter((item) => item.type === 'phone');
        rec.contact_status = 'found';
      } else if (trust.contact === 'email') {
        rec.direct_phone = null;
        rec.contact_evidence = rec.contact_evidence.filter((item) => item.type === 'email');
        rec.contact_status = 'found';
      } else {
        rec.direct_phone = null;
        rec.direct_email = null;
        rec.contact_evidence = [];
        rec.contact_status = 'platform_only';
        rec.contact_advice = contactAdvice(url, type);
      }
      const ownerEvidenceMatch = /\b(von privat|privatvermietung|privater vermieter|privatperson|direkt vom eigent[uü]mer|direkt vom vermieter|private owner|private landlord)\b/i.exec(pageText);
      const contactRoute = trust.contact !== 'platform_only' ? 'direct' : (hasPageContactAction(pageText) ? 'platform_message' : 'none');
      const ownerReachable = Boolean(ownerEvidenceMatch && contactRoute !== 'none');
      const letter = ownerReachable ? buildC131LetterDraft({
        resultType: type === 'holiday_owner' ? 'tourist_owner' : 'direct_offer',
        listingUrl: url,
        finalUrl: pages[i].finalUrl,
        title: meta.title,
        pageText,
        municipalities: cfg.municipalities,
        municipality: ex.municipality,
        propertyName: ex.name,
        rooms: ex.rooms?.rooms ?? null,
        ownerName: ex.owner,
        ownerEvidenceQuote: ownerEvidenceMatch?.[0] ?? null,
        contactRoute,
        contactEvidence: rec.contact_evidence,
        fetchedAt,
      }) : { ready: false as const, reason: 'owner_or_contact_route_missing' };
      rec.draft_message_de = letter.ready ? letter.draft : '';
      rec.raw = {
        ...rec.raw,
        c131_policy: 'C131-R1-R14',
        c131_result_type: type === 'holiday_owner' ? 'tourist_owner' : 'direct_offer',
        c131_quality_level: letter.ready ? 'L3' : ownerReachable ? 'L2' : 'L1',
        c131_owner_evidence_quote: ownerEvidenceMatch?.[0] ?? null,
        c131_owner_evidence_url: ownerEvidenceMatch ? url : null,
        c131_owner_evidence_fetched_at: ownerEvidenceMatch ? fetchedAt : null,
        c131_contact_route: contactRoute,
        c131_letter_verification: letter.ready === true ? { status: 'verified', verified_at: letter.verifiedAt, evidence: letter.evidence } : { status: 'not_ready', reason: letter.ready === false ? letter.reason : 'unknown' },
      };
      if (opts.dryRun) {
        const dryChecked = sanitizeNewRecord(rec as unknown as Record<string, any>, ctxFromConfig(cfg));
        if (dryChecked.hardReason) { await deny(dryChecked.hardReason, 'write_gate'); continue; }
        res.counts.kept++; res.counts.credible_kept = (res.counts.credible_kept || 0) + 1;
        st.kept++; st.consecutiveBad = 0;
        const priceNote = price?.monthlyChf != null ? `CHF ${price.monthlyChf}` : (price?.quote ? price.quote.slice(0, 24) : 'no price');
        say(stage, `✔ match: ${ex.name.slice(0, 50)} (${ex.municipality}) · ${priceNote}`);
        res.preview.push({ url, title: meta.title.slice(0, 90), source: src.id, municipality: ex.municipality, rooms: ex.rooms?.rooms ?? null, kept: true, detail: ex.signals.join(', ') });
      diag('candidate_kept', { source: src.id, url: safeDiagUrl(url), host, title: safeDiagText(meta.title, 180), municipality: ex.municipality, rooms: ex.rooms?.rooms ?? null, roomsBasis: ex.rooms?.basis ?? null, priceMonthlyChf: price?.monthlyChf ?? null, priceUnit: price?.unit ?? null, hasContact: Boolean(phone0 || email0), photoCount: meta.photos.length, fetchMode: fetchMode || 'direct' });
      try { console.info(JSON.stringify({ type: 'immofinder_candidate_kept', source: src.id, host, title: meta.title.slice(0, 90), municipality: ex.municipality, rooms: ex.rooms?.rooms ?? null, priceChf: price?.monthlyChf ?? null, priceUnit: price?.unit ?? null, evidenceChars: pageText.trim().length, fetchMode: fetchMode || 'direct' })); } catch { /* diagnostics only */ }
        continue;
      }

      // Contact enrichment (public sources only). Never drops the listing.
      let finalRec = rec;
      // Always try public contact search when the card has neither phone nor email.
      if (
        enrichCfg.enabled &&
        !(rec.direct_phone || rec.direct_email) &&
        deps.search &&
        (enrichBudget.searchesLeft > 0 || enrichBudget.reverseImageLeft > 0)
      ) {
        const input: EnrichmentInput = {
          listingUrl: url,
          propertyName: ex.name,
          municipality: ex.municipality!,
          ownerName: ex.owner,
          photoUrls: meta.photos,
          existingPhones: phones,
          existingEmails: c.emails,
          platformDomains: cfg.platformDomains,
        };
        try {
          const enrichment = await enrichContacts(input, {
            config: enrichCfg,
            search: deps.search,
            fetchPage: deps.fetchPage,
            reverseImageSearch: deps.reverseImageSearch,
            budget: enrichBudget,
          });
          finalRec = applyEnrichmentToRecord(rec, enrichment, rec.contact_advice);
          if (enrichment.evidence.length) {
            res.counts.enriched = (res.counts.enriched || 0) + 1;
            say(stage, `☎ enriched: ${ex.name.slice(0, 50)} (+${enrichment.evidence.length})`);
          }
          console.info(JSON.stringify({
            type: 'immofinder_enrich_pipeline_item',
            hit: enrichment.evidence.length > 0,
            evidenceCount: enrichment.evidence.length,
            municipality: (ex.municipality || '').slice(0, 40),
            propertyName: ex.name.slice(0, 60),
            notes: (enrichment.notes || []).slice(0, 6),
            searchesLeft: enrichBudget.searchesLeft,
          }));
        } catch (e) {
          finalRec = { ...rec, raw: { ...rec.raw, enrichment_error: String((e as Error)?.message || e).slice(0, 160) } };
        }
      }

      const shortStayContactFailure = shortStayContactReason(shortStay, finalRec.direct_phone, finalRec.direct_email);
      if (shortStayContactFailure) { await deny(shortStayContactFailure, 'no_verified_direct_phone_or_email'); continue; }
      const checked = sanitizeNewRecord(finalRec as unknown as Record<string, any>, ctxFromConfig(cfg));
      if (checked.hardReason) { await deny(checked.hardReason, 'write_gate'); continue; }
      const safeRec = checked.rec as unknown as ListingRecord;
      const r = await deps.store.upsert(safeRec);
      res.counts[r]++;
      res.counts.kept++; res.counts.credible_kept = (res.counts.credible_kept || 0) + 1;
      st.kept++; st.consecutiveBad = 0;
      if (r === 'new') { res.newListings.push(safeRec); st.new++; }
      else if (pages[i].knownAutoHidden) {
        // Revalidated cards hidden by automatic quality rules are restored and
        // delivered like fresh results; manual hides remain untouched.
        res.newListings.push(safeRec);
      }
      const priceNote = price?.monthlyChf != null ? `CHF ${price.monthlyChf}` : (price?.quote ? price.quote.slice(0, 24) : 'no price');
      say(stage, `✔ match: ${ex.name.slice(0, 50)} (${ex.municipality}) · ${priceNote}`);
      res.preview.push({ url, title: meta.title.slice(0, 90), source: src.id, municipality: ex.municipality, rooms: ex.rooms?.rooms ?? null, kept: true, detail: ex.signals.join(', ') });
      try { console.info(JSON.stringify({ type: 'immofinder_candidate_kept', source: src.id, host, title: meta.title.slice(0, 90), municipality: ex.municipality, rooms: ex.rooms?.rooms ?? null, priceChf: price?.monthlyChf ?? null, priceUnit: price?.unit ?? null, evidenceChars: pageText.trim().length, fetchMode: fetchMode || 'direct' })); } catch { /* diagnostics only */ }
    }
  }


  if (deps.shouldCancel?.()) { res.errors.push({ source: 'run', code: 'cancelled', detail: 'Stopped by user' }); res.estCostUsd = 0; return res; }

  const priorityMs = cfg.priorityWaveMs ?? 10 * 60 * 1000;
  const priorityDeadline = now() + priorityMs;
  const priorityTimeLeft = () => priorityDeadline - (deps.now ?? Date.now)();
  const newBefore = () => res.newListings.length;

  /** Load index pages and process detail candidates for one catalogue source. */
  async function runCatalogueSource(src: (typeof cfg.sources)[0], waveLabel: string) {
    if (deps.shouldCancel?.()) return;
    if (timeLeft() < 45_000) {
      res.errors.push({ source: src.id, code: 'run_time_budget', detail: `${waveLabel}: overall time budget low` });
      return;
    }
    res.counts.sources++;
    const pattern = src.detailPattern ? new RegExp(src.detailPattern) : undefined;
    const indexHtml: { url: string; body: string }[] = [];
    // Prefer commune/city pages first (high signal for whitelist zones).
    if (src.cityUrl) {
      let ci = 0;
      for (const m of cfg.municipalities) {
        if (waveLabel === 'priority' && priorityTimeLeft() < 40_000) break;
        if (timeLeft() < 40_000) break;
        say('catalogue', `${src.id}: commune page ${m} (${++ci}/${cfg.municipalities.length})`, ci, cfg.municipalities.length);
        for (const slug of slugVariants(m)) {
          const u = src.cityUrl.replace('{slug}', slug);
          const r = await deps.fetchPage(u).catch(() => ({ ok: false, status: 0, body: '' }));
          if (r.ok) { indexHtml.push({ url: u, body: r.body }); break; }
        }
      }
    }
    for (const extra of src.indexUrls ?? []) {
      if (timeLeft() < 40_000) break;
      const r = await deps.fetchPage(extra).catch(() => ({ ok: false, status: 0, body: '' }));
      if (r.ok) indexHtml.push({ url: extra, body: r.body });
    }
    // Broad area/index URL only when there is no cityUrl (city-first sources skip province-wide pages that mix distant resorts).
    if (!src.cityUrl && src.url) {
      say('catalogue', `${src.id}: loading index page (${waveLabel})`);
      const first = await deps.fetchPage(src.url).catch((e) => ({ ok: false, status: 0, body: String(e?.message || e) }));
      if (!first.ok) res.errors.push({ source: src.id, code: 'source_fetch_failed', detail: `status ${first.status}` });
      else indexHtml.push({ url: src.url, body: first.body });
    }
    res.counts.index_pages += indexHtml.length;
    const maxPages = src.maxDetailPages ?? cfg.limits.maxDetailPagesPerSource;
    const links = [...new Set(indexHtml.flatMap((pg) => candidateLinks(pg.body, pg.url, 500, pattern)))];
    if (!links.length) {
      if (indexHtml.length) res.errors.push({ source: src.id, code: 'source_no_candidates', detail: 'no object links found on the index pages' });
      return;
    }
    // Prefer links that look in-zone; push clear outside-zone URLs to the end (often skipped via placeFromUrl).
    const ranked = [...links].sort((a, b) => {
      const pa = placeFromUrl(a, cfg.municipalities);
      const pb = placeFromUrl(b, cfg.municipalities);
      const sa = pa.outside ? 2 : pa.matched ? 0 : 1;
      const sb = pb.outside ? 2 : pb.matched ? 0 : 1;
      return sa - sb;
    });
    await processItems(src, ranked.map((url) => ({ url })), maxPages);
  }

  /** Run discovery search queries. `discoveryQueryOffset` skips already-run queries in full mode so priority+extended do not repeat. */
  let discoveryQueryOffset = 0;
  let discoveryProcessedItems = Math.max(0, Number(resume.discoveryProcessedItems) || 0);
  const completedQueryKeys = new Set((resume.completedQueryKeys || []).filter((key): key is string => typeof key === 'string'));
  const serperMinIntervalMs = Math.max(0, Number(cfg.discovery?.serperMinIntervalMs ?? 1500) || 1500);
  const serperMaxPerMinute = Math.max(1, Number(cfg.discovery?.serperMaxPerMinute ?? 40) || 40);
  const serperTimestamps: number[] = [];
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  /** Pace Serper to stay under rolling per-minute and min-interval limits (no hard query-count budget). */
  async function paceSerper() {
    const nowMs = (deps.now ?? Date.now)();
    // Drop timestamps older than 60s
    while (serperTimestamps.length && nowMs - serperTimestamps[0] > 60_000) serperTimestamps.shift();
    if (serperTimestamps.length >= serperMaxPerMinute) {
      const wait = 60_000 - (nowMs - serperTimestamps[0]) + 50;
      if (wait > 0) {
        say('search', `Serper rate limit: waiting ${Math.ceil(wait / 1000)}s (${serperMaxPerMinute}/min)`);
        await sleep(wait);
      }
    }
    const last = serperTimestamps.length ? serperTimestamps[serperTimestamps.length - 1] : 0;
    const since = (deps.now ?? Date.now)() - last;
    if (last && since < serperMinIntervalMs) await sleep(serperMinIntervalMs - since);
  }
  async function runDiscoverySearch(maxQueries?: number, maxPages?: number, opts?: { finishAll?: boolean; stopAtKept?: number }) {
    const d = cfg.discovery;
    if (!d?.enabled) return;
    // A small per-query cap lets stronger results lower in SERP reach verification.
    // The overall pageLimit remains the hard bound on fetch work per run.
    const maxCandidatesPerQuery = Math.max(1, Math.min(6, Math.floor(Number(d.maxCandidatesPerQuery) || 4)));
    if (!deps.search) {
      diag('discovery_disabled_missing_search_dependency', { configuredKeyPresent: false });
      res.errors.push({ source: 'search', code: 'discovery_skipped', detail: 'SERPER_API_KEY is not set' });
      return;
    }
    // finishAll (carousel): keep going until every query for this commune slice is done, only stop on cancel / hard run wall.
    const finishAll = Boolean(opts?.finishAll);
    if (!finishAll && timeLeft() < 45_000) { diag('discovery_skipped_time_budget', { timeLeftMs: timeLeft(), finishAll }); return; }
    const coverAll = waveMode === 'full' || waveMode === 'extended'; // carousel never covers all communes in one tick
    const families: ('private' | 'portals')[] = [];
    if ((cfg.discovery?.queries || []).length) families.push('private');
    if ((cfg.discovery?.portalQueries || []).length) families.push('portals');
    const qs = buildTrustSearchPlan({ municipalities: cfg.municipalities, communeLimit: cfg.discovery?.communesPerRun ?? 2, privateTemplateCount: cfg.discovery?.queries?.length ?? 0, portalQueryTemplates: cfg.discovery?.portalQueries ?? [] }, deps.cycle ?? 0, { allCommunes: coverAll, families: families.length ? families : undefined });
    const slice = finishAll || maxQueries == null
      ? qs.slice(discoveryQueryOffset)
      : qs.slice(discoveryQueryOffset, discoveryQueryOffset + maxQueries);
    let qi = 0;
    let consecutiveSearchFails = 0;
    let processedItems = discoveryProcessedItems;
    const processedUrls = new Set<string>();
    const pageLimit = maxPages ?? (finishAll ? Math.max(d.maxPagesPerRun, 80) : d.maxPagesPerRun);
    if (processedItems >= pageLimit) { diag('discovery_stopped_page_limit', { processedItems, pageLimit, queryOffset: discoveryQueryOffset }); return; }
    diag('discovery_plan', { wave: waveMode, finishAll, coverAllCommunes: coverAll, cycle: deps.cycle ?? 0, selectedCommunes: coverAll ? cfg.municipalities : communesForRun(cfg.municipalities, cfg.discovery?.communesPerRun ?? 2, deps.cycle ?? 0), queryCountTotal: qs.length, queryOffset: discoveryQueryOffset, queryCountThisWave: Math.max(0, qs.length - discoveryQueryOffset), maxCandidatesPerQuery, pageLimit, resultsPerQuery: d.resultsPerQuery, serperMinIntervalMs, serperMaxPerMinute, queryFamilies: families });
    const communeHint = waveMode === 'carousel' && carouselCommunesSlot.length
      ? ` [${carouselCommunesSlot.join(', ')}]`
      : waveMode === 'full' ? ' [all communes]' : '';
    say('search', finishAll
      ? `Discovery${communeHint}: ${slice.length} queries (all selected sources, Serper-paced; process each query immediately)`
      : `Discovery: up to ${slice.length} queries`);
    let batchHits: SearchHit[] = [];
    let currentSourceId = 'search';
    const sourceIdForQuery = (query: string) => {
      const rawHost = /site:([a-z0-9.-]+)/i.exec(query)?.[1];
      if (!rawHost) return 'search';
      const host = rawHost.replace(/^www\./i, '').toLowerCase();
      const portal = (d.portalSources || []).find((p) => {
        const configured = String(p.host || '').replace(/^www\./i, '').toLowerCase();
        return configured && (host === configured || host.endsWith(`.${configured}`) || configured.endsWith(`.${host}`));
      });
      return portal?.id || 'search';
    };
    let currentQueryMunicipality: string | null = null;
    const flushBatch = async () => {
      if (!batchHits.length || deps.shouldCancel?.()) { batchHits = []; return; }
      const pickedForBatch = pickItems(batchHits, cfg);
      const duplicateAcrossQueries = pickedForBatch.filter((it) => processedUrls.has(it.url)).length;
      const items = pickedForBatch.filter((it) => !processedUrls.has(it.url)).slice(0, maxCandidatesPerQuery);
      const remaining = Math.max(0, pageLimit - processedItems);
      diag('discovery_batch_selected', { source: currentSourceId, rawHits: batchHits.length, pickedBeforeCrossQueryDedupe: pickedForBatch.length, duplicateAcrossQueries, selectedAfterPerQueryCap: items.length, maxCandidatesPerQuery, processedItemsBefore: processedItems, pageLimit, remainingPageBudget: remaining, candidateUrls: items.map((it) => ({ host: it.host, url: safeDiagUrl(it.url), title: safeDiagText(it.hit?.title, 160), snippetOnly: it.snippetOnly, expandableIndex: Boolean((it as any).expandableIndex) })) });
      for (const it of items) processedUrls.add(it.url);
      batchHits = [];
      if (items.length && remaining > 0) {
        res.counts.sources++;
        await processItems({ id: currentSourceId }, items.map((i) => ({ url: i.url, hit: i.hit, snippetOnly: i.snippetOnly, municipalityHint: currentQueryMunicipality, expandableIndex: Boolean((i as any).expandableIndex) })), remaining);
        processedItems += Math.min(items.length, remaining);
        discoveryProcessedItems = processedItems;
      }
    };
    for (const q of slice) {
      if (opts?.stopAtKept && res.counts.kept >= opts.stopAtKept) {
        diag('discovery_target_reached', { targetKeepCount: opts.stopAtKept, kept: res.counts.kept, remainingQueries: slice.length - qi });
        break;
      }
      if (deps.shouldCancel?.()) break;
      currentQueryMunicipality = cfg.municipalities.find((m) => q.toLowerCase().includes(m.toLowerCase())) || null;
      currentSourceId = sourceIdForQuery(q);
      if (completedQueryKeys.has(q)) {
        discoveryQueryOffset++;
        qi++;
        diag('discovery_query_resumed_skip', { source: currentSourceId, queryIndex: qi, queryTotal: slice.length, query: safeDiagText(q, 400) });
        continue;
      }
      getStat(currentSourceId).queries++;
      if (!finishAll && timeLeft() < 45_000) {
        diag('discovery_stopped_time_budget', { queryIndex: qi, queryTotal: slice.length, remainingQueries: slice.length - qi, timeLeftMs: timeLeft() });
        res.errors.push({ source: 'search', code: 'run_time_budget', detail: `stopped with ${slice.length - qi} queries left` });
        break;
      }
      if (finishAll && timeLeft() < 15_000 && qi === 0) {
        res.errors.push({ source: 'search', code: 'run_time_budget_soft', detail: `near wall-clock end at start; will still attempt ${slice.length} queries` });
      }
      await paceSerper();
      res.counts.search_queries++;
      discoveryQueryOffset++;
      say('search', `Searching: ${q}`, ++qi, slice.length);
      let querySucceeded = false;
      try {
        let batch: SearchHit[] = [];
        // No hard Google date filter: live rental listings can remain indexed for months.
        // qdr:m hid valid ads before fetch/verification could inspect them.
        const serperCall = async (label: string) => {
          res.counts.serper_calls = (res.counts.serper_calls || 0) + 1;
          try { return await withStepTimeout(label, () => deps.search!(q), SERPER_STEP_MS); }
          finally { serperTimestamps.push((deps.now ?? Date.now)()); }
        };
        batch = await serperCall('serper');
        querySucceeded = true;
        getStat(currentSourceId).hits += batch.length;
        const pickDecisions: { accepted: boolean; reason: string; host: string; url: string; title: string }[] = [];
        const picked = pickItems(batch, cfg, (decision) => { if (pickDecisions.length < 30) pickDecisions.push({ ...decision, url: safeDiagUrl(decision.url), title: safeDiagText(decision.title, 180) }); });
        diag('serper_query_succeeded', { source: currentSourceId, queryIndex: qi, queryTotal: slice.length, query: safeDiagText(q, 400), resultCount: batch.length, pickedCount: picked.length, selectedCount: Math.min(picked.length, maxCandidatesPerQuery), pickDecisions, results: batch.slice(0, 10).map((hit, rank) => ({ rank: rank + 1, host: hostOf(hit.link), url: safeDiagUrl(hit.link), title: safeDiagText(hit.title, 180), snippet: safeDiagText(hit.snippet, 360), date: hit.date || null, selected: picked.some((item) => item.url === hit.link) })), selected: picked.slice(0, maxCandidatesPerQuery).map((it) => ({ host: it.host, url: safeDiagUrl(it.url), title: safeDiagText(it.hit?.title, 180), snippetOnly: it.snippetOnly, expandableIndex: Boolean((it as any).expandableIndex) })) });
        try { console.info(JSON.stringify({ type: 'immofinder_discovery_query', query: q.slice(0, 260), hits: batch.length, pickedCandidates: picked.length, selectedCandidates: Math.min(picked.length, maxCandidatesPerQuery), pickedSample: picked.slice(0, 3).map((it) => ({ host: it.host, title: String(it.hit?.title || '').slice(0, 90), url: it.url.slice(0, 180), snippetOnly: it.snippetOnly, expandableIndex: Boolean((it as any).expandableIndex) })), freshness: 'unrestricted', fallbackTried: false })); } catch { /* diagnostics only */ }
        batchHits.push(...batch.slice(0, d.resultsPerQuery));
        consecutiveSearchFails = 0;
      } catch (e) {
        const msg = String((e as Error)?.message || e).slice(0, 300);
        diag('serper_query_failed', { source: currentSourceId, queryIndex: qi, queryTotal: slice.length, query: safeDiagText(q, 400), error: safeDiagText(msg, 300), errorName: (e as Error)?.name || typeof e });
        res.errors.push({ source: currentSourceId, code: msg.startsWith('step_timeout:') ? 'step_timeout' : 'search_failed', detail: msg });
        say('search', msg.startsWith('step_timeout:') ? `skip slow search (>10s): ${q.slice(0, 50)}` : `search failed: ${msg.slice(0, 160)}`);
        consecutiveSearchFails++;
        if (/429|400|rate/i.test(msg)) await sleep(Math.min(15_000, serperMinIntervalMs * 3));
        if (!finishAll && consecutiveSearchFails >= 5) break;
        if (finishAll && consecutiveSearchFails >= 20) {
          res.errors.push({ source: 'search', code: 'search_abort', detail: '20 consecutive Serper failures' });
          break;
        }
      }
      // Process each query's candidates before the next SERP call. This bounds volatile in-memory work to one query and commits verified rows incrementally.
      await flushBatch();
      if (deps.shouldCancel?.()) break;
      if (querySucceeded) completedQueryKeys.add(q);
      if (deps.onCheckpoint) {
        await deps.onCheckpoint({
          completedQueryKeys: [...completedQueryKeys],
          discoveryProcessedItems,
          counts: { ...res.counts },
          filtered: { ...res.filtered },
          sourceStats: [...sourceStatMap.values()].map((stat) => ({ ...stat })),
          wavesRun: [...(res.wavesRun || [])],
        });
      }
      try { console.info(JSON.stringify({ type: 'immofinder_discovery_batch_processed', queryIndex: qi, queryTotal: slice.length, processedItems, kept: res.counts.kept, new: res.counts.new, fetched: res.counts.fetched, checkpointed: querySucceeded })); } catch { /* diagnostics only */ }
      if (processedItems >= pageLimit) { diag('discovery_stopped_page_limit', { processedItems, pageLimit, queryIndex: qi, queryTotal: slice.length }); break; }
    }
    await flushBatch();
  }

  // ----- WAVE A (priority, ~10 min): high-value catalogues first + early search slice -----
  // Goal: >99% of valuable private listings in this window so Stage B can be optional.
  if (waveMode === 'priority' || waveMode === 'full' || waveMode === 'carousel') {
    waveDeadline = priorityDeadline;
    res.wavesRun!.push(waveMode === 'carousel' ? 'carousel' : 'priority');
    // Carousel: name the communes in this tick so the live UI title is meaningful.
    const carouselCommunes =
      waveMode === 'carousel'
        ? communesForRun(cfg.municipalities, cfg.discovery?.communesPerRun ?? 2, deps.cycle ?? 0)
        : [];
    carouselCommunesSlot = carouselCommunes;
    try { console.info(JSON.stringify({ type: 'immofinder_run_scope', wave: waveMode, selectedMunicipalities: cfg.municipalities, communesPerRun: cfg.discovery?.communesPerRun ?? null, communesThisRun: carouselCommunes, queryTemplates: (cfg.discovery?.queries?.length || 0) + (cfg.discovery?.portalQueries?.length || 0) })); } catch { /* diagnostics only */ }

    const carouselLabel = carouselCommunes.length
      ? carouselCommunes.join(', ')
      : 'this commune slice';
    const modeLabel = waveMode === 'carousel' ? 'Carousel' : 'Full search';
    say('catalogue', waveMode === 'carousel'
      ? `Carousel: ${carouselLabel} — sources from settings (cycle ${deps.cycle ?? 0})`
      : `Full search started (all selected communes from settings, up to ${Math.round(priorityMs / 60000)} min first phase): web search + catalogues`);
    if (waveMode === 'carousel') {
      say('search', `Carousel communes: ${carouselLabel}`);
    }
    const markA = newBefore();
    // C131 source-first: direct catalog/index adapters must still run when Serper has no credits.
    if (waveMode === 'full') {
      waveDeadline = runDeadline;
      for (const src of cfg.sources.filter((s) => s.phase === 1)) {
        if (deps.shouldCancel?.() || timeLeft() < 60_000) break;
        await runCatalogueSource(src, 'full');
      }
    }
    // Secondary discovery follows the bounded direct-source pass.
    if (waveMode === 'carousel') {
      // Carousel: no query-count budget. Run every private + portal template for this commune slice.
      // Duration grows with Serper pacing (serperMinIntervalMs / serperMaxPerMinute); wave uses full run deadline.
      waveDeadline = runDeadline;
      if (timeLeft() > 30_000) {
        const pageBudget = Math.max(cfg.discovery?.maxPagesPerRun ?? 80, 80);
        await runDiscoverySearch(undefined, pageBudget, { finishAll: true });
        // If the selected portal subset cannot produce ten verified matches, automatically
        // widen this carousel tick to the complete Swiss portal pool without changing saved settings.
        const selectedPortalQueries = cfg.discovery?.portalQueries || [];
        const fallbackPortalQueries = cfg.discovery?.fallbackPortalQueries || [];
        const remainingPages = Math.max(0, pageBudget - discoveryProcessedItems);
        if (
          res.counts.kept < 10 &&
          fallbackPortalQueries.length > selectedPortalQueries.length &&
          remainingPages > 0 &&
          timeLeft() > 30_000
        ) {
          const originalOffset = discoveryQueryOffset;
          cfg.discovery!.portalQueries = fallbackPortalQueries;
          discoveryQueryOffset = 0;
          diag('discovery_source_fallback_started', {
            targetKeepCount: 10,
            keptBeforeFallback: res.counts.kept,
            selectedPortalCount: selectedPortalQueries.length,
            fallbackPortalCount: fallbackPortalQueries.length,
            remainingPageBudget: remainingPages,
          });
          try {
            await runDiscoverySearch(undefined, pageBudget, { finishAll: true, stopAtKept: 10 });
          } finally {
            cfg.discovery!.portalQueries = selectedPortalQueries;
            discoveryQueryOffset = originalOffset;
          }
          diag('discovery_source_fallback_completed', {
            targetKeepCount: 10,
            kept: res.counts.kept,
            candidates: res.counts.candidates,
            serperCalls: res.counts.serper_calls,
          });
        }
      }
    } else if (waveMode === 'full') {
      // Full search: every private + portal query for ALL enabled communes; pace Serper; do not truncate sources.
      waveDeadline = runDeadline;
      if (timeLeft() > 30_000) {
        await runDiscoverySearch(20, Math.min(cfg.discovery?.maxPagesPerRun ?? 40, 40), { finishAll: false });
      }
    } else if (priorityTimeLeft() > 60_000 && timeLeft() > 60_000) {
      // Legacy priority Stage 1 only (no UI button): capped slice.
      await runDiscoverySearch(24, 30, { finishAll: false });
    }
    // Catalogues: skip on carousel. On full, run all enabled catalogues without a short priority cutoff.
    if (waveMode === 'carousel') {
      say('catalogue', 'Carousel tick: catalogues skipped (web search + extract only)');
    } else if (waveMode === 'full') {
      say('catalogue', 'Phase 1 direct sources completed before secondary search');
    } else {
      for (const src of cfg.sources.filter((s) => s.phase === 1)) {
        if (deps.shouldCancel?.()) break;
        if (priorityTimeLeft() < 30_000) {
          res.errors.push({ source: src.id, code: 'priority_wave_budget', detail: 'priority wave budget reached' });
          break;
        }
        await runCatalogueSource(src, 'priority');
      }
    }
    const priorityNew = res.newListings.slice(markA);
    res.priorityNewListings = priorityNew;
    say('catalogue', `${waveMode === 'carousel' ? 'Carousel' : 'Full search'} phase done: ${priorityNew.length} new, kept=${res.counts.kept}, fetched=${res.counts.fetched}`);
    try {
      await deps.onWaveComplete?.({ wave: waveMode === 'carousel' ? 'carousel' : 'priority', newInWave: priorityNew, counts: { ...res.counts } });
    } catch (e) {
      res.errors.push({ source: 'delivery', code: 'priority_delivery_failed', detail: String((e as Error)?.message || e).slice(0, 160) });
    }
  }

  if (deps.shouldCancel?.()) { res.errors.push({ source: 'run', code: 'cancelled', detail: 'Stopped by user' }); res.sourceStats = [...sourceStatMap.values()]; return res; }

  // ----- WAVE B (extended): remaining search + low-priority catalogues -----
  if (waveMode === 'extended' || waveMode === 'full') {
    waveDeadline = runDeadline;
    res.wavesRun!.push('extended');
    say('search', `Full search continuing (${Math.max(0, Math.round(timeLeft() / 60000))} min left, remaining communes/sources)`);
    const markB = newBefore();
    // Full discovery when running extended-only or when full and time remains.
    // Continue from discoveryQueryOffset so full mode does not repeat priority queries.
    if (deps.search && discoveryQueryOffset < 20 && timeLeft() > 60_000) {
      await runDiscoverySearch(20 - discoveryQueryOffset, Math.min(cfg.discovery?.maxPagesPerRun ?? 40, 40));
    }
    for (const src of cfg.sources.filter((s) => s.phase >= 2)) {
      if (deps.shouldCancel?.() || timeLeft() < 60_000) break;
      await runCatalogueSource(src, 'extended');
    }
    const extendedNew = res.newListings.slice(markB);
    try {
      await deps.onWaveComplete?.({ wave: 'extended', newInWave: extendedNew, counts: { ...res.counts } });
    } catch (e) {
      res.errors.push({ source: 'delivery', code: 'extended_delivery_failed', detail: String((e as Error)?.message || e).slice(0, 160) });
    }
  }

  res.sourceStats = [...sourceStatMap.values()].sort((a, b) => (b.kept - a.kept) || (b.fetched - a.fetched));
  const extraSearches = Math.max(0, (enrichCfg.enabled ? enrichCfg.maxExtraSearchesPerRun : 0) - enrichBudget.searchesLeft);
  res.newListings.sort((a, b) => Number(b.contact_status === 'found') - Number(a.contact_status === 'found'));
  res.estCostUsd = Math.round((res.counts.llm_calls * cfg.estCostPerLlmCallUsd + ((res.counts.serper_calls || res.counts.search_queries) + extraSearches) * (cfg.estCostPerSearchUsd ?? 0.001)) * 10000) / 10000;
  diag('run_completed', { durationMs: now() - diagnosticStartedAt, counts: res.counts, filtered: res.filtered, errors: res.errors, sourceStats: res.sourceStats, wavesRun: res.wavesRun, previewCount: res.preview.length, preview: res.preview.slice(0, 30).map((x) => ({ url: safeDiagUrl(x.url), source: x.source, title: safeDiagText(x.title, 160), kept: x.kept, reason: x.reason || null, detail: safeDiagText(x.detail, 200), municipality: x.municipality, rooms: x.rooms })), estimatedCostUsd: res.estCostUsd });
  const filt = Object.entries(res.filtered).map(([k, v]) => `${k}=${v}`).join(' ') || 'none';
  const c = res.counts;
  const statsLine = (res.sourceStats || []).map((s) => `${s.id}:kept=${s.kept}/fetch=${s.fetched}/geo=${s.geo}/junk=${s.junk}${s.stoppedEarly ? '/STOP' : ''}`).join(' · ') || 'none';
  say('catalogue', `FUNNEL candidates=${c.candidates} skipped_known=${c.skipped_known} skipped_seen=${c.skipped_seen} skipped_geo=${c.skipped_geo || 0} fetched=${c.fetched} snippet=${c.snippet_only} llm=${c.llm_calls} kept=${c.kept} credible_kept=${c.credible_kept || 0} new=${c.new} filtered: ${filt}`);
  say('catalogue', `SOURCE_STATS ${statsLine}`);
  const credibilityDenies: Record<string, number> = {};
  for (const [k, v] of Object.entries(res.filtered)) {
    if (/^(seeker_post|for_sale|holiday_tourism|listing_unavailable|rooms_conflict|municipality_mismatch|weak_facebook|temporary_furnished|agency|evidence_insufficient|not_single|shared_room|development|hotel)/i.test(k)) {
      credibilityDenies[k] = v;
    }
  }
  try {
    console.log(JSON.stringify({
      type: 'immofinder_product_quality_summary',
      credible_kept: c.credible_kept || 0,
      kept: c.kept || 0,
      new: c.new || 0,
      evidence_kind: {
        page_text: c.evidence_page_text || 0,
        snippet: c.evidence_snippet || 0,
        link_only: c.evidence_link_only || 0,
      },
      credibility_denies: credibilityDenies,
      filtered: res.filtered,
      wave: opts.wave || 'full',
    }));
  } catch { /* diag only */ }
  res.sourceStats = [...sourceStatMap.values()];
  res.wavesRun = [...new Set(res.wavesRun || [])];
  return res;
}
