/** P124.29  gated weather connector, units, discrepancy, 10-minute cache, merge with the SERP result. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isWeatherConnectorEnabled, isWeatherPlan, pickGeoCandidate, fetchWeatherEvidence, findDiscrepancies,
  clearWeatherCache, weatherCacheSize, WEATHER_CACHE_TTL_MS, cToF,
} from '../server/weatherConnector.ts';
import { combineWeatherWithSearch, weatherEvidenceAsResult } from '../server/webSearch.ts';

const GEO = { results: [
  { name: 'Springfield', admin1: 'Illinois', country: 'United States', country_code: 'US', latitude: 39.8, longitude: -89.64, timezone: 'America/Chicago', population: 114000 },
  { name: 'Springfield', admin1: 'Massachusetts', country: 'United States', country_code: 'US', latitude: 42.1, longitude: -72.59, population: 155000 },
  { name: 'Zurich', admin1: 'Zurich', country: 'Switzerland', country_code: 'CH', latitude: 47.37, longitude: 8.55, timezone: 'Europe/Zurich', population: 400000 },
  { name: 'Zurich', admin1: 'Ontario', country: 'Canada', country_code: 'CA', latitude: 43.42, longitude: -81.62 },
] };
const days = ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09'];
const omBody = (maxBase = 9) => ({
  utc_offset_seconds: 3600,
  current: { time: '2026-11-03T13:00', temperature_2m: 8.4, apparent_temperature: 6.1, precipitation: 0, weather_code: 3, wind_speed_10m: 11 },
  daily: { time: days, weather_code: days.map(() => 61), temperature_2m_max: days.map(() => maxBase), temperature_2m_min: days.map(() => 4), precipitation_sum: days.map(() => 1.2), precipitation_probability_max: days.map(() => 60) },
});
const metBody = (t = 8.0) => ({ properties: { timeseries: days.flatMap((d) => [`${d}T06:00:00Z`, `${d}T12:00:00Z`, `${d}T18:00:00Z`].map((time, i) => ({ time, data: { instant: { details: { air_temperature: t + [0, 1, -4][i], wind_speed: 3 } } } }))) } });

function makeFetch({ om = omBody(), met = metBody(), geo = GEO, failOm = false, failMet = false } = {}) {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, init });
    const ok = (body) => ({ ok: true, status: 200, json: async () => body });
    if (url.includes('geocoding-api.open-meteo.com')) return ok(geo);
    if (url.includes('api.open-meteo.com')) return failOm ? { ok: false, status: 503, json: async () => ({}) } : ok(om);
    if (url.includes('api.met.no')) return failMet ? { ok: false, status: 503, json: async () => ({}) } : ok(met);
    throw new Error(`unexpected ${url}`);
  };
  f.calls = calls;
  return f;
}

test('gate: off by default, on only for the exact value true', () => {
  assert.equal(isWeatherConnectorEnabled({}), false);
  assert.equal(isWeatherConnectorEnabled({ WEATHER_CONNECTOR_ENABLED: 'false' }), false);
  assert.equal(isWeatherConnectorEnabled({ WEATHER_CONNECTOR_ENABLED: '1' }), false);
  assert.equal(isWeatherConnectorEnabled({ WEATHER_CONNECTOR_ENABLED: 'true' }), true);
});

test('weather plan needs a place and weather wording; other topics never reach the connector', () => {
  assert.equal(isWeatherPlan({ query: 'weather Zurich', place: 'Zurich', topic: 'weather' }), true);
  assert.equal(isWeatherPlan({ query: 'rain forecast tomorrow', place: 'Bern' }), true);
  assert.equal(isWeatherPlan({ query: 'weather today', topic: 'weather' }), false);
  assert.equal(isWeatherPlan({ query: 'bitcoin price', place: 'Zurich', topic: 'exchange rate' }), false);
});

test('geocoder candidate: plan country filters (no lists); same-name alternatives are reported', () => {
  const cands = GEO.results.map((x) => ({ name: x.name, admin1: x.admin1, countryCode: x.country_code, latitude: x.latitude, longitude: x.longitude }));
  assert.equal(pickGeoCandidate(cands, 'CA').best.admin1, 'Ontario');
  assert.equal(pickGeoCandidate(cands, 'ch').best.countryCode, 'CH');
  const sp = pickGeoCandidate(cands.slice(0, 2), 'US');
  assert.equal(sp.best.admin1, 'Illinois'); assert.equal(sp.alternatives.length, 1);
  assert.equal(pickGeoCandidate(cands, 'XX').best.name, 'Springfield'); // unknown country: geocoder ranking
  assert.equal(pickGeoCandidate([], 'CH'), null);
});

test('evidence: both providers, model time, metric units, attribution, UA identifies the app', async () => {
  clearWeatherCache();
  const f = makeFetch();
  const w = await fetchWeatherEvidence({ place: 'Zurich', country: 'CH', units: 'metric', fetchImpl: f, now: 1_000 });
  assert.deepEqual(w.providers, ['open-meteo', 'met-no']);
  assert.match(w.digest, /Zurich, Zurich, CH/);
  assert.match(w.digest, /not station observations/);
  assert.match(w.digest, /Open-Meteo - model time 2026-11-03T13:00: now 8\.4 C/);
  assert.match(w.digest, /MET Norway - model time 2026-11-03T06:00:00Z/);
  assert.match(w.digest, /2026-11-09: /);
  assert.match(w.digest, /Attribution:.*Open-Meteo\.com \(CC BY 4\.0\).*MET Norway/);
  assert.equal(w.sources.length, 2);
  const met = f.calls.find((c) => c.url.includes('api.met.no'));
  assert.match(met.init.headers['User-Agent'], /^BiForge\/1\.0 \(\+https?:\/\//);
  assert.doesNotMatch(met.url, /lat=47\.370/); // coordinates rounded to 2 decimals
});

test('units follow the caller: imperial converts temperature, wind, precipitation', async () => {
  clearWeatherCache();
  const w = await fetchWeatherEvidence({ place: 'Springfield', country: 'US', units: 'imperial', fetchImpl: makeFetch(), now: 1_000 });
  assert.match(w.digest, /now 47\.1 F/); // 8.4 C
  assert.match(w.digest, /wind 7 mph/);
  assert.match(w.digest, /Fahrenheit, inches/);
  assert.equal(cToF(0), 32);
});

test('discrepancy between sources (>= 2 C) is named; small differences are not', async () => {
  clearWeatherCache();
  const far = await fetchWeatherEvidence({ place: 'Zurich', country: 'CH', units: 'metric', fetchImpl: makeFetch({ met: metBody(14) }), now: 1_000 });
  assert.ok(far.discrepancies.length > 0);
  assert.match(far.digest, /SOURCES DISAGREE/);
  clearWeatherCache();
  const near = await fetchWeatherEvidence({ place: 'Zurich', country: 'CH', units: 'metric', fetchImpl: makeFetch(), now: 1_000 });
  assert.deepEqual(near.discrepancies, []);
  assert.match(near.digest, /agree within 2 degrees/);
  assert.deepEqual(findDiscrepancies([{ provider: 'open-meteo', daily: {} }], 'metric'), []);
});

test('cache: second call within 10 minutes makes no network calls; after 10 minutes it refetches; failures are not cached', async () => {
  clearWeatherCache();
  const f = makeFetch();
  await fetchWeatherEvidence({ place: 'Zurich', country: 'CH', units: 'metric', fetchImpl: f, now: 0 });
  const first = f.calls.length;
  assert.equal(first, 3);
  await fetchWeatherEvidence({ place: 'Zurich', country: 'CH', units: 'metric', fetchImpl: f, now: WEATHER_CACHE_TTL_MS - 1 });
  assert.equal(f.calls.length, first);
  await fetchWeatherEvidence({ place: 'Zurich', country: 'CH', units: 'metric', fetchImpl: f, now: WEATHER_CACHE_TTL_MS + 1 });
  assert.equal(f.calls.length, first + 3);
  clearWeatherCache();
  const bad = makeFetch({ failOm: true, failMet: true });
  assert.equal(await fetchWeatherEvidence({ place: 'Zurich', country: 'CH', units: 'metric', fetchImpl: bad, now: 0 }), null);
  assert.equal(weatherCacheSize(), 1); // only the geocode result; no cached failure
});

test('one provider failing still gives evidence, both failing or unknown place gives null (caller continues with SERP)', async () => {
  clearWeatherCache();
  const one = await fetchWeatherEvidence({ place: 'Zurich', country: 'CH', units: 'metric', fetchImpl: makeFetch({ failMet: true }), now: 0 });
  assert.deepEqual(one.providers, ['open-meteo']);
  assert.match(one.digest, /Only one source answered/);
  clearWeatherCache();
  assert.equal(await fetchWeatherEvidence({ place: 'Nowhereville', units: 'metric', fetchImpl: makeFetch({ geo: { results: [] } }), now: 0 }), null);
  assert.equal(await fetchWeatherEvidence({ place: 'Zurich', units: 'metric', fetchImpl: async () => { throw new Error('offline'); }, now: 0 }), null);
});

test('R-7: connector evidence is merged with the SERP result and names both sources', async () => {
  clearWeatherCache();
  const w = await weatherEvidenceAsResult({ place: 'Zurich', country: 'CH' }, 5000, makeFetch());
  assert.equal(w.status, 'used'); assert.equal(w.model, 'weather-connector');
  const serp = { status: 'used', digest: 'MeteoSwiss page text with 7 C and rain in Zurich today.', sources: [{ title: 'MeteoSwiss', url: 'https://www.meteoswiss.admin.ch/x/y' }], queries: ['weather Zurich'], model: 'serper' };
  const m = combineWeatherWithSearch(w, serp, 'weather Zurich');
  assert.equal(m.status, 'used');
  assert.deepEqual(m.sources.map((s) => s.title.split(' ')[0]), ['Open-Meteo', 'MET', 'MeteoSwiss']);
  assert.match(m.digest, /WEATHER DATA/); assert.match(m.digest, /MeteoSwiss page text/);
  assert.equal(combineWeatherWithSearch(null, serp, 'q'), serp);
  const failed = { status: 'failed', digest: '', sources: [], queries: [], reason: 'timeout' };
  assert.equal(combineWeatherWithSearch(w, failed, 'q'), w);
});

test('wiring: connector runs only behind the switch and a weather plan, in parallel with the SERP', () => {
  const s = readFileSync(new URL('../server/webSearch.ts', import.meta.url), 'utf8');
  assert.match(s, /isWeatherConnectorEnabled\(\) && isWeatherPlan\(plan\)/);
  assert.match(s, /combineWeatherWithSearch\(query === plan\.query \? await weatherP : null, serp, query\)/);
  const c = readFileSync(new URL('../server/weatherConnector.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(c, /\b(?:Zurich|Switzerland|Bern|Geneva)\b/, 'no place hard-coded in the connector');
});
