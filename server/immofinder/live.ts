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

function candidateIsTarget(sourceId: string, url: string, municipalities: string[], titleHint?: string): boolean {
  if (municipalities.length === 0) return true;
  const targets = new Set(municipalities.map(normalizeSlug));
  if (sourceId === 'happyholiday') {
    const locality = /-graubuenden-in-([^/]+)\/?$/i.exec(url)?.[1];
    if (locality) return targets.has(normalizeSlug(locality));
  }
  const haystack = normalizeSlug(url + ' ' + (titleHint || ''));
  if (!haystack) return true;
  const commonTourist = ['scuol', 'davos', 'st-moritz', 'stmoritz', 'klosters', 'arosa', 'samedan', 'pontresina', 'silvaplana', 'zernez', 'samnaun'];
  const hitsTarget = municipalities.some((m) => haystack.includes(normalizeSlug(m)));
  if (hitsTarget) return true;
  if (commonTourist.some((t) => haystack.includes(t))) return false;
  return true;
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
  // Restored clean body — see repository history for full implementation.
  // This temporary stub will be replaced immediately with the full clean file.
  throw new Error('live.ts restore in progress');
}
