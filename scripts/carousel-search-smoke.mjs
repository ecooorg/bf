#!/usr/bin/env node
/** Opt-in live smoke for search providers and Jina Reader. Emits metadata only. */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
const query = 'latest stable Node.js release';
const samples = [];

async function main() {
  const { fetchSerperDigestMulti, fetchWebSearchDigest, jinaReaderBase, jinaHeaders, isPublicFetchTarget, weatherEvidenceAsResult } = await import(
    pathToFileURL(path.join(root, 'server/webSearch.ts')).href
  );
  const { parseSearchCarousel } = await import(pathToFileURL(path.join(root, 'server/searchCarousel.ts')).href);
  const { isWeatherConnectorEnabled } = await import(pathToFileURL(path.join(root, 'server/weatherConnector.ts')).href);
  const { registryForGeminiCascade } = await import(pathToFileURL(path.join(root, 'server/modelRegistry.ts')).href);
  const carousel = parseSearchCarousel(process.env);
  let jinaTarget = '';

  const serperKey = String(process.env.SERPER_API_KEY || '').trim();
  if (serperKey) {
    const started = Date.now();
    const result = await fetchSerperDigestMulti({
      apiKey: serperKey, userText: query, englishQuery: query, today,
      timeoutMs: 12_000, fetchPages: false, maxPages: 1,
      country: process.env.WEB_SEARCH_DEFAULT_COUNTRY || undefined,
    });
    samples.push({ provider: 'serper', configured: true, status: result.status, latencyMs: Date.now() - started,
      queryCount: result.queries.length, sourceHosts: result.sources.map((s) => { try { return new URL(s.url).hostname; } catch { return ''; } }).filter(Boolean).slice(0, 6),
      reason: result.reason || null });
    jinaTarget = result.sources[0]?.url || '';
  } else samples.push({ provider: 'serper', configured: false, status: 'NOT_CONFIGURED' });

  const geminiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (geminiKey) {
    const { GoogleGenAI } = await import('@google/genai');
    const model = registryForGeminiCascade('LIGHT', process.env)[0]?.modelId || 'gemini-3.5-flash-lite';
    const started = Date.now();
    const result = await fetchWebSearchDigest({ client: new GoogleGenAI({ apiKey: geminiKey }), models: [model], userText: query, today, timeoutMs: 12_000, maxAttempts: 1 });
    samples.push({ provider: 'gemini_google_search', configured: true, model, status: result.status, latencyMs: Date.now() - started,
      queryCount: result.queries.length, sourceCount: result.sources.length, reason: result.reason || null });
    if (!jinaTarget) jinaTarget = result.sources[0]?.url || '';
  } else samples.push({ provider: 'gemini_google_search', configured: false, status: 'NOT_CONFIGURED' });

  if (jinaTarget && process.env.JINA_READER_BASE_URL !== 'disabled') {
    const started = Date.now();
    let status = 'FAILED', httpStatus = null, bytes = 0, error = null;
    try {
      if (!await isPublicFetchTarget(jinaTarget)) throw new Error('search result URL failed public-target validation');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6_000);
      try {
        const response = await fetch(`${jinaReaderBase()}${jinaTarget}`, { headers: jinaHeaders(6_000), signal: controller.signal, redirect: 'error' });
        httpStatus = response.status;
        const body = await response.text();
        bytes = Buffer.byteLength(body);
        status = response.ok && bytes >= 40 ? 'used' : 'failed';
      } finally { clearTimeout(timer); }
    } catch (e) { error = String(e?.name === 'AbortError' ? 'TIMEOUT_6000MS' : e?.message || e).slice(0, 160); }
    samples.push({ provider: 'jina_reader', configured: true, status, latencyMs: Date.now() - started, httpStatus, bytes, error });
  } else samples.push({ provider: 'jina_reader', configured: Boolean(process.env.JINA_API_KEY || process.env.JINA_READER_BASE_URL), status: 'SKIPPED_NO_SEARCH_SOURCE' });

  const weatherPlace = String(process.env.CAROUSEL_WEATHER_PLACE || '').trim();
  if (isWeatherConnectorEnabled() && weatherPlace) {
    const started = Date.now();
    const result = await weatherEvidenceAsResult({ place: weatherPlace, country: process.env.WEB_SEARCH_DEFAULT_COUNTRY || undefined }, 8_000);
    samples.push({ provider: 'weather_connector', configured: true, placeProvided: true, status: result?.status || 'no_result',
      latencyMs: Date.now() - started, sourceCount: result?.sources?.length || 0, digestChars: result?.digest?.length || 0, reason: result?.reason || null });
  } else samples.push({ provider: 'weather_connector', configured: isWeatherConnectorEnabled(), status: weatherPlace ? 'SKIPPED_DISABLED' : 'SKIPPED_NO_PLACE' });

  const required = samples.filter((s) => s.configured && !String(s.provider).startsWith('weather_') && s.provider !== 'jina_reader');
  const ok = required.every((s) => ['used', 'used_weak'].includes(s.status));
  const report = {
    type: 'carousel_search_diagnostic', ok, checkedAt: new Date().toISOString(), query,
    carousel: { order: carousel.order, source: carousel.source, unknown: carousel.unknown,
      serp2Status: carousel.order.includes('serp2') ? 'NOT_IMPLEMENTED_IN_THIS_REPOSITORY' : 'NOT_IN_CHAIN' },
    samples,
    note: 'No response bodies, source URLs, API keys, or user content are included.',
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(JSON.stringify({ type: 'carousel_search_diagnostic_error', error: String(error?.message || error).slice(0, 200) }));
  process.exit(1);
});
