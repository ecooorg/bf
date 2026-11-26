/**
 * C131 source-first live ImmoFinder runtime.
 *
 * Uses a small rotating Serper budget for supported Swiss portals and up to three
 * Gemini quote reviews for borderline owner evidence. Snippets never become evidence:
 * every admitted record still comes from a fetched detail page and deterministic gates.
 */

import { processSnapshot } from './pipeline.ts';
import { promoteLevel } from './owner.ts';
import { communesForRun, pickItems } from '../immofinderDiscovery.ts';
import { happyholidayAdapter } from './sources/happyholiday.ts';
import { ferienhausmieteAdapter } from './sources/ferienhausmiete.ts';
import { createSwissClassifiedAdapter } from './sources/swiss-classified.ts';
import type { PipelineDeps, ListingRecord, RunResult, ProgressEvent, SourceStats } from '../immofinderPipeline.ts';
import { buildEvidenceText, classifyType, resolveListingPrice, type ListingType } from '../immofinderCore.ts';

const MAX_INDEX_PAGES_PER_SOURCE = 6;
const MAX_DETAILS_PER_SOURCE = 12;
const MAX_TOTAL_DETAILS = 48;
const MAX_RUN_MS = 240_000;
const SEEN_TTL_MS = 24 * 60 * 60 * 1000;

type Adapter = {
  discover: (html: string, indexUrl: string) => Array<{ url: string; titleHint?: string }>;
  extract: (html: string, pageUrl: string) => {
    title: string | null;
    rooms: { value: number; quote: string } | null;
    locality: { value: string; quote: string } | null;
    priceText: string | null;
    privateMarker: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    evidenceQuotes: string[];
    descriptionText?: string;
    agencyName?: string | null;
  };
};

const PORTAL_HOSTS: Record<string, string> = {
  'portal-immoscout24': 'immoscout24.ch',
  'portal-homegate': 'homegate.ch',
  'portal-newhome': 'newhome.ch',
  'portal-flatfox': 'flatfox.ch',
  'portal-tutti': 'tutti.ch',
  'portal-anibis': 'anibis.ch',
  'portal-petitesannonces': 'petitesannonces.ch',
  'portal-immobilier': 'immobilier.ch',
  'portal-acheter-louer': 'acheter-louer.ch',
  'portal-immostreet': 'immostreet.ch',
  'portal-home': 'home.ch',
  'portal-icasa': 'icasa.ch',
  'portal-urbanhome': 'urbanhome.ch',
};
const ADAPTERS: Record<string, Adapter> = {
  happyholiday: happyholidayAdapter,
  ferienhausmiete: ferienhausmieteAdapter,
  ...Object.fromEntries(Object.entries(PORTAL_HOSTS).map(([id, host]) => [id, createSwissClassifiedAdapter(id, host)])),
};

function plainText(html: string): string {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function pageTitle(html: string, fallback: string): string {
  const title = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1]
    || /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]
    || '';
  return plainText(title).slice(0, 240) || fallback;
}

function canonicalKey(sourceId: string, url: string): string {
  const u = new URL(url);
  return sourceId + ':' + u.hostname.replace(/^www\./i, '').toLowerCase() + u.pathname.replace(/\/+$/, '').toLowerCase();
}

function photoUrls(html: string): string[] {
  const raw = /<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1]
    || /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i.exec(html)?.[1];
  if (!raw) return [];
  try {
    const u = new URL(raw);
    return ['http:', 'https:'].includes(u.protocol) ? [u.toString()] : [];
  } catch { return []; }
}


function normalizeSlug(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function selectIndexUrls(source: { id: string; url: string; indexUrls?: string[] }, municipalities: string[]): string[] {
  const configured = source.indexUrls?.length ? source.indexUrls : [source.url];
  if (source.id !== 'ferienhausmiete') return configured.slice(0, MAX_INDEX_PAGES_PER_SOURCE);
  const slugs = municipalities.map(normalizeSlug);
  const relevant = configured.filter((url) => slugs.some((slug) => slug && url.toLowerCase().includes(slug)));
  return (relevant.length ? relevant : [source.url]).slice(0, MAX_INDEX_PAGES_PER_SOURCE);
}

function candidateIsTarget(sourceId: string, url: string, municipalities: string[]): boolean {
  if (sourceId !== 'happyholiday') return true;
  const locality = /-graubuenden-in-([^/]+)\/?$/i.exec(url)?.[1];
  if (!locality) return true;
  const targets = new Set(municipalities.map(normalizeSlug));
  return targets.size === 0 || targets.has(normalizeSlug(locality));
}

function candidateScore(candidate: { url: string; titleHint?: string }, municipalities: string[]): number {
  const haystack = normalizeSlug(candidate.url + ' ' + (candidate.titleHint || ''));
  return municipalities.reduce((score, municipality) => score + (haystack.includes(normalizeSlug(municipality)) ? 1 : 0), 0);
}

function matchesDetailPattern(url: string, pattern?: string): boolean {
  if (!pattern) return true;
  try { return new RegExp(pattern, 'i').test(url); } catch { return false; }
}

function progress(deps: PipelineDeps, text: string, counts: Record<string, number>) {
  try { deps.onProgress?.({ stage: 'search', text, counts } as ProgressEvent); } catch { /* progress must never fail a run */ }
}

export async function runPipeline(
  deps: PipelineDeps,
  opts: { dryRun: boolean; wave?: 'priority' | 'extended' | 'full' | 'carousel'; testMode?: boolean },
): Promise<RunResult> {
  const started = Date.now();
  const now = deps.now || Date.now;
  const municipalities = deps.config.municipalities || [];
  const classifyConfig = {
    municipalities,
    minRooms: Math.max(1, Number(deps.config.minRooms) || 3),
    stopAgencies: deps.config.stopAgencies || [],
  };
  const counts: Record<string, number> = {
    index_pages: 0, candidates: 0, fetched: 0, kept: 0, new: 0, updated: 0, skipped: 0, infra_failures: 0, serper_calls: 0, gemini_calls: 0,
  };
  const filtered: Record<string, number> = {};
  const errors: RunResult['errors'] = [];
  const preview: RunResult['preview'] = [];
  const newListings: ListingRecord[] = [];
  const savedThisRun: ListingRecord[] = [];
  const sourceStats: SourceStats[] = [];
  const processedUrls = new Set<string>();
  let totalDetails = 0;
  let successfulIndexes = 0;
  let serperCalls = 0;
  let geminiCalls = 0;
  const geminiBudget = Math.min(3, Math.max(0, Number(deps.maxLlmCalls) || 0));
  const serpCandidates = new Map<string, Array<{ url: string; indexUrl: string; titleHint?: string }>>();
  const serperQueriesBySource = new Map<string, number>();
  const discovery = deps.config.discovery;
  const supportedPortalSources = (discovery?.portalSources || []).filter((p) => Boolean(ADAPTERS[p.id]));
  if (deps.search && discovery?.enabled && supportedPortalSources.length) {
    const cycle = Math.max(0, Number(deps.cycle || 0));
    const communeSlice = communesForRun(municipalities, Math.min(6, municipalities.length), cycle);
    const portalStart = (cycle * 2) % supportedPortalSources.length;
    const selectedPortals = Array.from({ length: Math.min(2, supportedPortalSources.length) }, (_, offset) => supportedPortalSources[(portalStart + offset) % supportedPortalSources.length]);
    const sitePlan = selectedPortals.flatMap((portal) => {
      const template = (discovery.portalQueries || []).find((q) => q.toLowerCase().includes('site:' + portal.host.toLowerCase()));
      return template ? communeSlice.map((commune) => ({ portal, commune, query: template.replace(/\{commune\}/g, commune) })) : [];
    });
    const privateTemplate = (discovery.queries || []).find((q) => q.includes('{commune}'));
    const privatePlan = privateTemplate ? communeSlice.map((commune) => ({ portal: null, commune, query: privateTemplate.replace(/\{commune\}/g, commune) })) : [];
    const plan = [...sitePlan, ...privatePlan].slice(0, 18);
    for (const item of plan) {
      if (deps.shouldCancel?.() || now() - started >= MAX_RUN_MS) break;
      try {
        if (serperCalls > 0) await new Promise((resolve) => setTimeout(resolve, Math.max(3000, Number(discovery.serperMinIntervalMs) || 3000)));
        serperCalls++;
        const hits = await deps.search(item.query);
        successfulIndexes++;
        if (item.portal) serperQueriesBySource.set(item.portal.id, (serperQueriesBySource.get(item.portal.id) || 0) + 1);
        const selected = pickItems(hits, deps.config);
        for (const candidate of selected) {
          const host = new URL(candidate.url).hostname.replace(/^www\./i, '').toLowerCase();
          const portal = item.portal || supportedPortalSources.find((p) => p.host.replace(/^www\./i, '').toLowerCase() === host);
          if (!portal || host !== portal.host.replace(/^www\./i, '').toLowerCase()) continue;
          const sourceConfig = (deps.config.sources || []).find((source) => source.id === portal.id);
          if (sourceConfig?.detailPattern && !matchesDetailPattern(candidate.url, sourceConfig.detailPattern)) continue;
          if (!item.portal) serperQueriesBySource.set(portal.id, (serperQueriesBySource.get(portal.id) || 0) + 1);
          const bucket = serpCandidates.get(portal.id) || [];
          if (!bucket.some((x) => x.url === candidate.url)) {
            bucket.push({ url: candidate.url, indexUrl: sourceConfig?.url || candidate.url, titleHint: candidate.hit.title });
            serpCandidates.set(portal.id, bucket);
          }
        }
      } catch (error) {
        errors.push({ source: item.portal?.id || 'serper-private', code: 'serper_discovery_failed', detail: String((error as Error)?.message || error).slice(0, 140) });
        // A quota/credit error is run-global; don't spend further calls retrying it.
        if (/not enough credits|quota|credits exhausted/i.test(String((error as Error)?.message || error))) break;
      }
    }
  }

  const sources = (deps.config.sources || [])
    .filter((source) => Boolean(ADAPTERS[source.id]))
    .sort((a, b) => Number(a.phase || 99) - Number(b.phase || 99) || a.id.localeCompare(b.id));

  if (!sources.length) {
    errors.push({ source: 'source_config', code: 'no_supported_direct_sources' });
    return {
      status: 'INFRA_FAIL', counts, filtered, errors, newListings, preview, estCostUsd: 0,
      sourceStats, wavesRun: [],
    };
  }

  for (const source of sources) {
    if (deps.shouldCancel?.()) break;
    if (now() - started >= MAX_RUN_MS || totalDetails >= MAX_TOTAL_DETAILS) break;
    const adapter = ADAPTERS[source.id];
    if (!adapter) continue;
    const stats: SourceStats = {
      id: source.id, queries: 0, hits: 0, candidates: 0, fetched: 0, llm: 0, kept: 0,
      new: 0, agencies: 0, junk: 0, geo: 0, consecutiveBad: 0,
    };
    sourceStats.push(stats);
    const indexUrls = source.id.startsWith('portal-') && source.id !== 'portal-flatfox' ? [] : selectIndexUrls(source, municipalities);
    const candidates: Array<{ url: string; indexUrl: string; titleHint?: string }> = [...(serpCandidates.get(source.id) || [])];
    stats.queries += serperQueriesBySource.get(source.id) || 0;
    stats.hits += candidates.length;
    for (const candidate of candidates) processedUrls.add(candidate.url);
    let sourceBlocked = false;
    for (const indexUrl of indexUrls) {
      if (deps.shouldCancel?.() || now() - started >= MAX_RUN_MS) break;
      stats.queries++;
      try {
        const page = await deps.fetchPage(indexUrl);
        counts.index_pages++;
        if (!page.ok || page.status < 200 || page.status >= 400 || !page.body || page.body.length < 300) {
          counts.infra_failures++;
          errors.push({ source: source.id, code: 'index_fetch_failed', detail: 'HTTP ' + page.status });
          if (page.status === 403 || page.status === 429) sourceBlocked = true;
          if (sourceBlocked) break;
          continue;
        }
        successfulIndexes++;
        const found = adapter.discover(page.body, indexUrl);
        stats.hits += found.length;
        for (const item of found) {
          if (source.id !== 'happyholiday' && !matchesDetailPattern(item.url, source.detailPattern)) {
            filtered.source_detail_pattern_mismatch = (filtered.source_detail_pattern_mismatch || 0) + 1;
            continue;
          }
          if (!candidateIsTarget(source.id, item.url, municipalities)) {
            filtered.source_locality_mismatch = (filtered.source_locality_mismatch || 0) + 1;
            stats.geo++;
            continue;
          }
          if (processedUrls.has(item.url)) continue;
          processedUrls.add(item.url);
          candidates.push({ ...item, indexUrl });
        }
      } catch (error) {
        counts.infra_failures++;
        errors.push({ source: source.id, code: 'index_fetch_error', detail: String((error as Error)?.message || error).slice(0, 140) });
      }
      if (sourceBlocked) break;
    }
    candidates.sort((a, b) => candidateScore(b, municipalities) - candidateScore(a, municipalities));
    stats.candidates = candidates.length;
    counts.candidates += candidates.length;
    const sourceLimit = Math.min(MAX_DETAILS_PER_SOURCE, Math.max(1, Number(source.maxDetailPages) || MAX_DETAILS_PER_SOURCE));
    let sourceAttempts = 0;

    for (const candidate of candidates) {
      if (deps.shouldCancel?.() || now() - started >= MAX_RUN_MS || totalDetails >= MAX_TOTAL_DETAILS || sourceAttempts >= sourceLimit) break;
      try {
        const existing = await deps.store.findByUrl(candidate.url);
        if (existing && !existing.hidden && now() - new Date(existing.last_seen_at).getTime() < SEEN_TTL_MS) {
          counts.skipped++;
          continue;
        }
        const prior = await deps.store.getSeen(candidate.url);
        if (prior && now() - new Date(prior.checked_at).getTime() < SEEN_TTL_MS) {
          counts.skipped++;
          continue;
        }
      } catch { /* seen-cache failure must not prevent a bounded source fetch */ }

      totalDetails++;
      sourceAttempts++;
      try {
        const page = await deps.fetchPage(candidate.url);
        if (!page.ok || page.status < 200 || page.status >= 400 || !page.body || page.body.length < 120) {
          counts.infra_failures++;
          stats.consecutiveBad++;
          errors.push({ source: source.id, code: 'detail_fetch_failed', detail: 'HTTP ' + page.status });
          preview.push({ url: candidate.url, title: candidate.titleHint || candidate.url, source: source.id, municipality: null, rooms: null, kept: false, reason: 'fetch_blocked' });
          if (page.status === 403 || page.status === 429) { sourceBlocked = true; break; }
          continue;
        }
        stats.fetched++;
        counts.fetched++;
        const extracted = adapter.extract(page.body, page.finalUrl || candidate.url);
        const title = extracted.title || pageTitle(page.body, candidate.titleHint || candidate.url);
        const text = plainText([page.body, extracted.descriptionText || '', extracted.agencyName ? 'Agentur: ' + extracted.agencyName : ''].filter(Boolean).join(' ')).slice(0, 12_000);
        const evidenceText = buildEvidenceText(title, text, 4_000);
        const snapshot = {
          requestedUrl: candidate.url,
          finalUrl: page.finalUrl || candidate.url,
          title,
          pageText: text,
          fetchTimeIso: new Date(now()).toISOString(),
          provisional: false,
        };
        const outcome = processSnapshot({ snapshot, config: classifyConfig, sourceId: source.id });
        let level = outcome.level;
        const rejectCode = outcome.rejectCode;
        const municipality = typeof outcome.classify.locality?.value === 'string' ? outcome.classify.locality.value : null;
        const rooms = typeof outcome.classify.rooms?.value === 'number' ? outcome.classify.rooms.value : null;
        preview.push({
          url: candidate.url, title, source: source.id, municipality, rooms,
          kept: level !== 'L0', reason: rejectCode || undefined,
          detail: level === 'L0' ? outcome.legacyReason || rejectCode || 'rejected' : level,
        });

        if (level === 'L0') {
          const code = rejectCode || 'not_detail_page';
          filtered[code] = (filtered[code] || 0) + 1;
          if (code === 'agency') stats.agencies++;
          if (code === 'outside_target') stats.geo++;
          else stats.junk++;
          stats.consecutiveBad++;
          if (!opts.dryRun) { try { await deps.store.markSeen(candidate.url, source.id, 'rejected', code); } catch { /* non-critical cache */ } }
          continue;
        }

        const owner = outcome.owner;
        // Gemini is a bounded semantic assist for borderline private-owner evidence only.
        // It cannot invent evidence: every accepted quote must be an exact substring of the fetched page.
        if (level === 'L1' && owner && owner.contactRoute !== 'none' && deps.llm && geminiCalls < geminiBudget) {
          geminiCalls++;
          try {
            const answer = await deps.llm(
              'You are a strict evidence extractor. Return one JSON object only. Never infer facts. Copy exact verbatim text from the supplied listing page.',
              'Find an exact quote proving the advertiser is the private owner rather than an agency. Return {"private_owner_quote": string|null}. Use null unless the page explicitly says the advertiser personally owns or privately lets the property. Page title: ' + title + '\nPage text: ' + text.slice(0, 5000),
            );
            const parsed: any = typeof answer === 'string' ? JSON.parse(answer) : answer;
            const quote = typeof parsed?.private_owner_quote === 'string' ? parsed.private_owner_quote.trim() : '';
            const normalizedPage = text.slice(0, 4000).replace(/\s+/g, ' ').toLowerCase();
            const normalizedQuote = quote.replace(/\s+/g, ' ').toLowerCase();
            const semanticPrivate = /(?:von\s+privat|privatperson|private[rn]?\s+(?:vermieter|anbieter|eigent[uü]mer)|direkt\s+(?:vom|von\s+dem)\s+eigent[uü]mer|ich\s+vermiete|wir\s+vermieten|vermiete\s+meine|vermieten\s+unsere|propri[eé]taire\s+particulier|private\s+owner|privato)/i.test(quote);
            if (quote.length >= 6 && normalizedPage.includes(normalizedQuote) && semanticPrivate) {
              owner.isPrivateOwner = true;
              owner.markers = [...new Set([...owner.markers, quote])];
              level = promoteLevel(level, owner);
              const latestPreview = preview[preview.length - 1];
              if (latestPreview) latestPreview.detail = level;
            }
          } catch (error) {
            errors.push({ source: source.id, code: 'gemini_owner_review_failed', detail: String((error as Error)?.message || error).slice(0, 120) });
          }
        }
        const directPhone = owner?.phone || null;
        const directEmail = owner?.email || null;
        if (!owner || owner.contactRoute === 'none') {
          filtered.no_contact_route = (filtered.no_contact_route || 0) + 1;
          stats.consecutiveBad++;
          if (!opts.dryRun) { try { await deps.store.markSeen(candidate.url, source.id, 'rejected', 'no_contact_route'); } catch { /* non-critical cache */ } }
          continue;
        }
        const parsedPrice = resolveListingPrice(text, extracted.priceText);
        const contactEvidence: ListingRecord['contact_evidence'] = [];
        if (directPhone) contactEvidence.push({ type: 'phone', value: directPhone, url: candidate.url });
        if (directEmail) contactEvidence.push({ type: 'email', value: directEmail, url: candidate.url });
        if (owner.platformFormPresent) contactEvidence.push({ type: 'platform_message', value: 'Contact via source listing form', url: candidate.url });
        const record: ListingRecord = {
          listing_type: classifyType(title, candidate.url, text) as ListingType,
          canonical_key: canonicalKey(source.id, candidate.url),
          listing_url: candidate.url,
          source_urls: [candidate.url, candidate.indexUrl],
          source_ids: [source.id],
          photo_urls: photoUrls(page.body),
          municipality: municipality || '',
          property_name: title,
          rooms_text: rooms === null ? '' : String(rooms) + ' Zimmer',
          rooms_estimated: rooms || 0,
          rooms_basis: rooms === null ? '' : 'zimmer',
          street_address: null,
          description_de: evidenceText,
          description_ru: '',
          title_ru: title,
          owner_name: owner.ownerName,
          rent_monthly_chf: parsedPrice?.monthlyChf ?? null,
          pricing_unit: parsedPrice?.unit ?? null,
          listed_at: null,
          direct_phone: directPhone,
          direct_email: directEmail,
          contact_evidence: contactEvidence,
          contact_status: directPhone || directEmail ? 'found' : 'platform_only',
          contact_advice: owner.platformFormPresent ? 'Use the source listing enquiry form.' : '',
          private_signals: owner?.markers || [],
          draft_message_de: '',
          raw: {
            engine: 'c131-source-first',
            level,
            source_id: source.id,
            index_url: candidate.indexUrl,
            fetched_at: snapshot.fetchTimeIso,
            evidence_kind: 'page_text',
            evidence_url: candidate.url,
            evidence_text: evidenceText,
            evidence_quotes: outcome.classify.rooms?.quote ? [outcome.classify.rooms.quote] : [],
            owner_markers: owner?.markers || [],
            contact_route: owner?.contactRoute || 'none',
            source_price_text: extracted.priceText,
            price: parsedPrice ? { amount: parsedPrice.amount, unit: parsedPrice.unit, currency: /(?:CHF|Fr\.?)/i.test(parsedPrice.quote) ? 'CHF' : /(?:EUR|€)/i.test(parsedPrice.quote) ? 'EUR' : null, quote: parsedPrice.quote } : null,
            monthly_price_chf: parsedPrice?.monthlyChf ?? null,
            pricing_unit: parsedPrice?.unit ?? null,
            owner_name: owner.ownerName,
            locality_quote: outcome.classify.locality?.quote || null,
          },
        };

        if (!opts.dryRun) {
          const stored = await deps.store.upsert(record);
          if (stored === 'new') { counts.new++; stats.new++; newListings.push(record); }
          else counts.updated++;
          savedThisRun.push(record);
          try { await deps.store.markSeen(candidate.url, source.id, 'kept', level); } catch { /* non-critical cache */ }
        }
        counts.kept++;
        stats.kept++;
        stats.consecutiveBad = 0;
      } catch (error) {
        counts.infra_failures++;
        errors.push({ source: source.id, code: 'detail_processing_failed', detail: String((error as Error)?.message || error).slice(0, 160) });
      }
      progress(deps, source.id + ': fetched ' + stats.fetched + ', verified ' + stats.kept, counts);
    }
    progress(deps, source.id + ': index candidates ' + stats.candidates, counts);
  }

  counts.serper_calls = serperCalls;
  counts.gemini_calls = geminiCalls;
  const wavesRun: RunResult['wavesRun'] = successfulIndexes ? ['extended'] : [];
  if (!opts.dryRun && savedThisRun.length && deps.onWaveComplete) {
    try { await deps.onWaveComplete({ wave: opts.wave === 'carousel' ? 'carousel' : 'extended', newInWave: savedThisRun, counts }); }
    catch (error) { errors.push({ source: 'delivery', code: 'wave_delivery_failed', detail: String((error as Error)?.message || error).slice(0, 160) }); }
  }
  return {
    status: successfulIndexes ? 'COMPLETED' : 'INFRA_FAIL',
    counts,
    filtered,
    errors,
    newListings,
    preview,
    estCostUsd: Number((serperCalls * (Number(deps.config.estCostPerSearchUsd) || 0.001) + geminiCalls * (Number(deps.config.estCostPerLlmCallUsd) || 0.002)).toFixed(4)),
    sourceStats,
    wavesRun,
  };
}
