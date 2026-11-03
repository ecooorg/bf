/**
 * P124.29  Weather connector (gated) and result cache (R-7).
 *
 * Owner decision 4 (docs/WEB_SEARCH_REMEDIATION.md section 6): Open-Meteo and MET Norway are NOT for commercial use.
 * This module therefore runs only when WEATHER_CONNECTOR_ENABLED=true (off by default). Setting that switch is the
 * deployment's declaration that it is non-commercial. Data is labelled as numerical-model output, not station
 * observations, and carries the attribution both providers require.
 *
 * No country, city or host list: the place comes from the search plan, the geocoder resolves it, the plan's ISO country
 * filters geocoder candidates, units follow the caller-supplied unit system.
 */

export type WeatherUnits = 'metric' | 'imperial';
export type WeatherFetch = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

export type GeoCandidate = { name: string; admin1?: string; country?: string; countryCode?: string; latitude: number; longitude: number; timezone?: string; population?: number };

export type ProviderForecast = {
  provider: 'open-meteo' | 'met-no';
  /** Start of the model interval the "now" values describe (local time for Open-Meteo, UTC for MET Norway). */
  observedAt?: string;
  now?: { tempC?: number; feelsC?: number; windKmh?: number; precipMm?: number; summary?: string };
  /** ISO date (local day) -> values; metric. */
  daily: Record<string, { minC?: number; maxC?: number; precipMm?: number; precipProbPct?: number; summary?: string }>;
};

export type WeatherEvidence = {
  digest: string;
  sources: { title: string; url: string }[];
  place: GeoCandidate;
  alternatives: string[];
  providers: string[];
  discrepancies: string[];
};

export const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
const WEATHER_CACHE_MAX = 200;
const DISCREPANCY_C = 2;
const OPEN_METEO_URL = 'https://open-meteo.com/';
const MET_NO_URL = 'https://api.met.no/';

export function isWeatherConnectorEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return String(env.WEATHER_CONNECTOR_ENABLED ?? '').trim().toLowerCase() === 'true';
}

/** A plan is a weather plan when it names a place and its topic or query talks about weather. Pure. */
export function isWeatherPlan(plan?: { query?: string; place?: string; topic?: string }): boolean {
  if (!plan?.place) return false;
  return /\b(?:weather|forecast|temperature|rain|snow|wind|humidity|sunny|storm)\b/i.test(`${plan.topic || ''} ${plan.query || ''}`);
}

// ---- tiny TTL cache (in memory; one process) ----
type CacheEntry = { at: number; value: unknown };
const cache = new Map<string, CacheEntry>();
export function clearWeatherCache(): void { cache.clear(); }
export function weatherCacheSize(): number { return cache.size; }
async function cached<T>(key: string, now: number, load: () => Promise<T | null>): Promise<T | null> {
  const hit = cache.get(key);
  if (hit && now - hit.at < WEATHER_CACHE_TTL_MS) return hit.value as T;
  const value = await load();
  if (value == null) return null; // failures are never cached
  if (cache.size >= WEATHER_CACHE_MAX) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(key, { at: now, value });
  return value;
}

// ---- unit helpers ----
export const cToF = (c: number) => Math.round((c * 9 / 5 + 32) * 10) / 10;
export const kmhToMph = (k: number) => Math.round(k / 1.609344);
export const mmToIn = (mm: number) => Math.round(mm / 25.4 * 100) / 100;
const r1 = (n: number) => Math.round(n * 10) / 10;

const WMO: Record<number, string> = {
  0: 'clear', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'fog', 48: 'rime fog', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle',
  56: 'freezing drizzle', 57: 'freezing drizzle', 61: 'light rain', 63: 'rain', 65: 'heavy rain', 66: 'freezing rain', 67: 'freezing rain',
  71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains', 80: 'rain showers', 81: 'rain showers', 82: 'violent rain showers',
  85: 'snow showers', 86: 'heavy snow showers', 95: 'thunderstorm', 96: 'thunderstorm with hail', 99: 'thunderstorm with hail',
};

// ---- geocoding ----
/** Pick the geocoder candidate: ISO country from the plan wins; otherwise the geocoder's own ranking. Pure. */
export function pickGeoCandidate(cands: GeoCandidate[], country?: string): { best: GeoCandidate; alternatives: GeoCandidate[] } | null {
  const c = String(country || '').trim().toUpperCase();
  const pool = c ? cands.filter((x) => String(x.countryCode || '').toUpperCase() === c) : cands;
  const list = pool.length ? pool : cands;
  if (!list.length) return null;
  const [best, ...rest] = list;
  return { best, alternatives: rest.filter((x) => x.name.toLowerCase() === best.name.toLowerCase() && (x.admin1 !== best.admin1 || x.countryCode !== best.countryCode)).slice(0, 2) };
}

export async function geocodePlace(place: string, country: string | undefined, f: WeatherFetch, now: number, signal?: AbortSignal): Promise<{ best: GeoCandidate; alternatives: GeoCandidate[] } | null> {
  const name = String(place || '').trim().slice(0, 80);
  if (name.length < 2) return null;
  const cands = await cached<GeoCandidate[]>(`geo:${name.toLowerCase()}`, now, async () => {
    const res = await f(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=8&language=en&format=json`, { signal });
    if (!res.ok) return null;
    const j = await res.json();
    const out: GeoCandidate[] = (Array.isArray(j?.results) ? j.results : [])
      .filter((x: any) => Number.isFinite(x?.latitude) && Number.isFinite(x?.longitude) && typeof x?.name === 'string')
      .map((x: any) => ({ name: x.name, admin1: x.admin1, country: x.country, countryCode: x.country_code, latitude: x.latitude, longitude: x.longitude, timezone: x.timezone, population: x.population }));
    return out.length ? out : null;
  });
  return cands ? pickGeoCandidate(cands, country) : null;
}

// ---- providers (always fetched in metric units; converted for display) ----
const q2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

export async function fetchOpenMeteo(g: GeoCandidate, f: WeatherFetch, now: number, signal?: AbortSignal): Promise<{ forecast: ProviderForecast; utcOffsetSeconds: number } | null> {
  return cached(`om:${q2(g.latitude)},${q2(g.longitude)}`, now, async () => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${q2(g.latitude)}&longitude=${q2(g.longitude)}` +
      '&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max' +
      '&forecast_days=7&timezone=auto&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm';
    const res = await f(url, { signal });
    if (!res.ok) return null;
    const j = await res.json();
    const d = j?.daily;
    if (!d || !Array.isArray(d.time)) return null;
    const daily: ProviderForecast['daily'] = {};
    d.time.forEach((day: string, i: number) => {
      daily[day] = {
        minC: d.temperature_2m_min?.[i], maxC: d.temperature_2m_max?.[i], precipMm: d.precipitation_sum?.[i],
        precipProbPct: d.precipitation_probability_max?.[i], summary: WMO[d.weather_code?.[i]],
      };
    });
    const c = j?.current;
    return {
      utcOffsetSeconds: Number(j?.utc_offset_seconds) || 0,
      forecast: {
        provider: 'open-meteo' as const, observedAt: typeof c?.time === 'string' ? c.time : undefined,
        now: c ? { tempC: c.temperature_2m, feelsC: c.apparent_temperature, windKmh: c.wind_speed_10m, precipMm: c.precipitation, summary: WMO[c.weather_code] } : undefined,
        daily,
      },
    };
  });
}

export async function fetchMetNo(g: GeoCandidate, f: WeatherFetch, now: number, utcOffsetSeconds: number, contact: string, signal?: AbortSignal): Promise<ProviderForecast | null> {
  return cached(`met:${q2(g.latitude)},${q2(g.longitude)},${utcOffsetSeconds}`, now, async () => {
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${q2(g.latitude)}&lon=${q2(g.longitude)}`;
    const res = await f(url, { headers: { 'User-Agent': `BiForge/1.0 (+${contact})`, Accept: 'application/json' }, signal });
    if (!res.ok) return null;
    const j = await res.json();
    const series: any[] = j?.properties?.timeseries;
    if (!Array.isArray(series) || !series.length) return null;
    const daily: ProviderForecast['daily'] = {};
    for (const s of series) {
      const t = Date.parse(s?.time);
      const temp = s?.data?.instant?.details?.air_temperature;
      if (!Number.isFinite(t) || !Number.isFinite(temp)) continue;
      const day = new Date(t + utcOffsetSeconds * 1000).toISOString().slice(0, 10);
      const e = (daily[day] ||= {});
      e.minC = e.minC === undefined ? temp : Math.min(e.minC, temp);
      e.maxC = e.maxC === undefined ? temp : Math.max(e.maxC, temp);
    }
    const d0 = series[0]?.data?.instant?.details;
    return {
      provider: 'met-no' as const, observedAt: typeof series[0]?.time === 'string' ? series[0].time : undefined,
      now: d0 ? { tempC: d0.air_temperature, windKmh: Number.isFinite(d0.wind_speed) ? r1(d0.wind_speed * 3.6) : undefined } : undefined,
      daily,
    };
  });
}

// ---- formatting ----
function fmtT(c: number | undefined, u: WeatherUnits): string { return c === undefined || !Number.isFinite(c) ? 'n/a' : u === 'imperial' ? `${cToF(c)} F` : `${r1(c)} C`; }
function fmtW(k: number | undefined, u: WeatherUnits): string { return k === undefined || !Number.isFinite(k) ? 'n/a' : u === 'imperial' ? `${kmhToMph(k)} mph` : `${Math.round(k)} km/h`; }
function fmtP(mm: number | undefined, u: WeatherUnits): string { return mm === undefined || !Number.isFinite(mm) ? 'n/a' : u === 'imperial' ? `${mmToIn(mm)} in` : `${r1(mm)} mm`; }
const label = (p: ProviderForecast['provider']) => (p === 'open-meteo' ? 'Open-Meteo' : 'MET Norway');

/** Compare providers on the current temperature and on each day's max/min. Pure. */
export function findDiscrepancies(fs: ProviderForecast[], units: WeatherUnits): string[] {
  const out: string[] = [];
  if (fs.length < 2) return out;
  const [a, b] = fs;
  const d = (x: number | undefined, y: number | undefined) => (x !== undefined && y !== undefined && Math.abs(x - y) >= DISCREPANCY_C ? Math.abs(x - y) : null);
  const diff = (c: number) => (units === 'imperial' ? `${r1(c * 9 / 5)} F` : `${r1(c)} C`);
  const nd = d(a.now?.tempC, b.now?.tempC);
  if (nd !== null) out.push(`current temperature differs by ${diff(nd)}: ${label(a.provider)} ${fmtT(a.now?.tempC, units)}, ${label(b.provider)} ${fmtT(b.now?.tempC, units)}`);
  for (const day of Object.keys(a.daily).sort()) {
    const o = b.daily[day];
    if (!o) continue;
    const mx = d(a.daily[day].maxC, o.maxC);
    if (mx !== null) out.push(`${day} maximum differs by ${diff(mx)}: ${label(a.provider)} ${fmtT(a.daily[day].maxC, units)}, ${label(b.provider)} ${fmtT(o.maxC, units)}`);
    const mn = d(a.daily[day].minC, o.minC);
    if (mn !== null) out.push(`${day} minimum differs by ${diff(mn)}: ${label(a.provider)} ${fmtT(a.daily[day].minC, units)}, ${label(b.provider)} ${fmtT(o.minC, units)}`);
  }
  return out;
}

export function formatWeatherDigest(place: GeoCandidate, alternatives: string[], fs: ProviderForecast[], units: WeatherUnits, discrepancies: string[]): string {
  const where = [place.name, place.admin1, place.countryCode].filter(Boolean).join(', ');
  const L: string[] = [];
  L.push(`WEATHER DATA for ${where} (latitude ${q2(place.latitude)}, longitude ${q2(place.longitude)}${place.timezone ? `, timezone ${place.timezone}` : ''}).`);
  L.push('Values are numerical weather-model output for this grid point, not station observations. "Model time" is the start of the interval the current values describe.');
  if (alternatives.length) L.push(`Other places with the same name exist (${alternatives.join('; ')}); the first match was used. Name the place used in the answer.`);
  for (const f of fs) {
    const n = f.now;
    L.push(`${label(f.provider)} - model time ${f.observedAt || 'unknown'}: now ${fmtT(n?.tempC, units)}${n?.feelsC !== undefined ? `, feels like ${fmtT(n.feelsC, units)}` : ''}, wind ${fmtW(n?.windKmh, units)}${n?.precipMm !== undefined ? `, precipitation ${fmtP(n.precipMm, units)}` : ''}${n?.summary ? `, ${n.summary}` : ''}.`);
  }
  const days = [...new Set(fs.flatMap((f) => Object.keys(f.daily)))].sort().slice(0, 7);
  if (days.length) {
    L.push(`Daily forecast (minimum / maximum, local dates)${units === 'imperial' ? ', Fahrenheit, inches' : ', Celsius, millimetres'}:`);
    for (const day of days) {
      const cells = fs.map((f) => {
        const e = f.daily[day];
        if (!e) return null;
        const extra = [e.precipMm !== undefined ? `precipitation ${fmtP(e.precipMm, units)}` : '', e.precipProbPct !== undefined ? `chance ${e.precipProbPct}%` : '', e.summary || ''].filter(Boolean).join(', ');
        return `${label(f.provider)} ${fmtT(e.minC, units)} / ${fmtT(e.maxC, units)}${extra ? ` (${extra})` : ''}`;
      }).filter(Boolean);
      L.push(`${day}: ${cells.join(' | ')}`);
    }
  }
  L.push(discrepancies.length ? `SOURCES DISAGREE: ${discrepancies.join('; ')}. Show both values.` : (fs.length > 1 ? 'The sources agree within 2 degrees C on the compared values.' : 'Only one source answered; no comparison is possible.'));
  L.push('Attribution: weather data by Open-Meteo.com (CC BY 4.0) and MET Norway (CC BY 4.0, NLOD). Name the sources in the answer.');
  return L.join('\n');
}

/**
 * Geocode, fetch both providers in parallel (one failing is tolerated), compare, format. Returns null when nothing usable
 * was obtained, so the caller continues with the ordinary web search. Never throws.
 */
export async function fetchWeatherEvidence(opts: {
  place: string;
  country?: string;
  units: WeatherUnits;
  fetchImpl?: WeatherFetch;
  now?: number;
  timeoutMs?: number;
  contact?: string;
}): Promise<WeatherEvidence | null> {
  const f: WeatherFetch = opts.fetchImpl || ((url, init) => fetch(url, init as any) as any);
  const now = opts.now ?? Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Math.max(2000, opts.timeoutMs ?? 8000));
  try {
    const geo = await geocodePlace(opts.place, opts.country, f, now, ctrl.signal);
    if (!geo) return null;
    const contact = (opts.contact || process.env.WEATHER_CONNECTOR_CONTACT || 'https://github.com/ecooorg/bf').trim();
    const om = await fetchOpenMeteo(geo.best, f, now, ctrl.signal).catch(() => null);
    const met = await fetchMetNo(geo.best, f, now, om?.utcOffsetSeconds ?? 0, contact, ctrl.signal).catch(() => null);
    const fs = [om?.forecast, met].filter((x): x is ProviderForecast => Boolean(x));
    if (!fs.length) return null;
    const discrepancies = findDiscrepancies(fs, opts.units);
    const alternatives = geo.alternatives.map((a) => [a.name, a.admin1, a.countryCode].filter(Boolean).join(', '));
    return {
      digest: formatWeatherDigest(geo.best, alternatives, fs, opts.units, discrepancies),
      sources: fs.map((x) => (x.provider === 'open-meteo' ? { title: 'Open-Meteo (weather model data, CC BY 4.0)', url: OPEN_METEO_URL } : { title: 'MET Norway (weather model data, CC BY 4.0)', url: MET_NO_URL })),
      place: geo.best, alternatives, providers: fs.map((x) => x.provider), discrepancies,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
