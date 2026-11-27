export type LocalSchemaFacts = {
  pageTitle?: string;
  propertyType?: 'apartment' | 'house';
  priceAmount?: string;
  currency?: 'CHF' | 'EUR';
  pricePeriod?: 'month' | 'week' | 'night' | 'season';
  localityName?: string;
  availability?: string;
};

/** Conservative label normalization: formatting and diacritics only, never geographic alias inference. */
export function normalizeLocalityLabel(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss')
    .toLocaleLowerCase('de-CH').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function flattenJsonLd(value: unknown, output: Record<string, unknown>[], seen = new Set<object>()): void {
  if (Array.isArray(value)) {
    for (const item of value) flattenJsonLd(item, output, seen);
    return;
  }
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  const record = value as Record<string, unknown>;
  output.push(record);
  for (const key of ['@graph', 'mainEntity', 'item', 'itemOffered', 'offers', 'priceSpecification', 'address']) {
    if (record[key] !== undefined) flattenJsonLd(record[key], output, seen);
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) return asRecord(value[0]);
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined;
}

function asText(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 500);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function normalizePrice(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return String(value);
  const raw = asText(value);
  if (!raw) return undefined;
  let normalized = raw.replace(/[^0-9,.'’\s-]/g, '').replace(/[’'\s]/g, '');
  const comma = normalized.lastIndexOf(',');
  const dot = normalized.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? ',' : '.';
    normalized = normalized.replace(/[,.]/g, (mark) => mark === decimal ? '.' : '');
  } else if (comma >= 0) {
    normalized = /,\d{1,2}$/.test(normalized) ? normalized.replace(',', '.') : normalized.replace(/,/g, '');
  } else if (dot >= 0 && /\.\d{3}$/.test(normalized)) {
    normalized = normalized.replace(/\./g, '');
  }
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? String(number) : undefined;
}

function pricePeriodFrom(value: unknown): LocalSchemaFacts['pricePeriod'] {
  const text = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/month|monthly|monat|mois|mese|p1m|\bmon\b/.test(text)) return 'month';
  if (/week|weekly|woche|semaine|settimana|p1w|\bwee?k\b/.test(text)) return 'week';
  if (/night|nightly|nacht|nuit|notte|p1n/.test(text)) return 'night';
  if (/season|saison|stagione/.test(text)) return 'season';
  return undefined;
}

/** Extract suggestions from user-selected local HTML JSON-LD. Values remain unverified until the Owner reviews them. */
export function extractSchemaFactsFromJsonLd(scripts: string[]): LocalSchemaFacts {
  const objects: Record<string, unknown>[] = [];
  for (const script of scripts) {
    try { flattenJsonLd(JSON.parse(script), objects); } catch { /* ignore malformed or non-JSON-LD script blocks */ }
  }
  const candidates = objects.map((record) => {
    const types = Array.isArray(record['@type']) ? record['@type'].join(' ') : String(record['@type'] || '');
    const offers = asRecord(record.offers);
    const priceSpecification = asRecord(offers?.priceSpecification) || asRecord(record.priceSpecification);
    const address = asRecord(record.address);
    const score = (/(apartment|house|residence|accommodation|realestate|product)/i.test(types) ? 4 : 0)
      + (record.name ? 1 : 0) + (offers || record.price ? 2 : 0) + (address ? 2 : 0);
    return { record, types, offers, priceSpecification, address, score };
  }).sort((a, b) => b.score - a.score);
  const best = candidates.find((item) => item.score > 0);
  if (!best) return {};
  const { record, types, offers, priceSpecification, address } = best;
  const priceValue = offers?.price ?? priceSpecification?.price ?? record.price;
  const currencyValue = offers?.priceCurrency ?? priceSpecification?.priceCurrency ?? record.priceCurrency;
  const unit = priceSpecification?.unitText ?? priceSpecification?.unitCode ?? priceSpecification?.billingDuration ?? offers?.unitText;
  const locality = address?.addressLocality ?? address?.name;
  const availability = offers?.availability ?? offers?.availabilityStarts ?? offers?.validFrom ?? record.availabilityStarts;
  const facts: LocalSchemaFacts = {};
  const name = asText(record.name);
  if (name) facts.pageTitle = name.slice(0, 300);
  if (/apartment|apartmentcomplex/i.test(types)) facts.propertyType = 'apartment';
  else if (/\bhouse\b|singlefamilyresidence/i.test(types)) facts.propertyType = 'house';
  const price = normalizePrice(priceValue);
  if (price) facts.priceAmount = price;
  const currency = asText(currencyValue)?.toUpperCase();
  if (currency === 'CHF' || currency === 'EUR') facts.currency = currency;
  const period = pricePeriodFrom(unit);
  if (period) facts.pricePeriod = period;
  const localityName = asText(locality);
  if (localityName) facts.localityName = localityName;
  const availableFrom = asText(availability);
  if (availableFrom) facts.availability = availableFrom;
  return facts;
}
