#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const HALF = '\u00BD';
const corePath = 'server/immofinderCore.ts';
let core = readFileSync(corePath, 'utf8');

const oldParseStart = "export function parseRooms(text: string): { rooms: number; basis: 'zimmer' | 'bedrooms' } | null {";
const oldParseEndMarker = "export function isStopAgency";
const start = core.indexOf(oldParseStart);
const end = core.indexOf(oldParseEndMarker);
if (start < 0 || end < 0 || end <= start) {
  console.error('parseRooms block not found', { start, end });
  process.exit(1);
}

const newParse = [
  "export function parseRooms(text: string): { rooms: number; basis: 'zimmer' | 'bedrooms' } | null {",
  "  // Normalize Swiss half-room spellings before matching so \"2 " + HALF + "\" / \"2 1/2\" become \"2.5\".",
  "  let t = String(text ?? '')",
  "    .replace(/(\\d{1,2})\\s*[" + HALF + "]/g, '$1.5')",
  "    .replace(/[" + HALF + "]/g, '.5')",
  "    .replace(/,(\\d)/g, '.$1');",
  "  t = t.replace(/(\\d{1,2})\\s+1\\/2/g, '$1.5');",
  "  type Hit = { rooms: number; index: number };",
  "  const hits: Hit[] = [];",
  "  for (const m of t.matchAll(/(?:zimmer|zi\\.?|rooms?|pieces?)\\s*[:=]?\\s*(\\d{1,2}(?:\\.\\d)?)/gi)) {",
  "    const n = Number(m[1]);",
  "    if (n > 0 && n < 20) hits.push({ rooms: n, index: m.index ?? 0 });",
  "  }",
  "  for (const m of t.matchAll(/(\\d{1,2}(?:\\.\\d)?)\\s*[- ]?\\s*(?:zimmer|zi\\b|zi\\.|rooms?|pieces?|-?zimmerwohnung)/gi)) {",
  "    const n = Number(m[1]);",
  "    if (n > 0 && n < 20) hits.push({ rooms: n, index: m.index ?? 0 });",
  "  }",
  "  if (hits.length) {",
  "    hits.sort((a, b) => a.index - b.index);",
  "    const first = hits[0].rooms;",
  "    const close = hits.filter((h) => Math.abs(h.rooms - first) <= 1.01).map((h) => h.rooms);",
  "    return { rooms: Math.max(...close), basis: 'zimmer' };",
  "  }",
  "  const bHits: Hit[] = [];",
  "  for (const m of t.matchAll(/(\\d{1,2})\\s*[- ]?\\s*(?:schlafzimmer|bedrooms?)/gi)) {",
  "    const n = Number(m[1]);",
  "    if (n > 0 && n < 15) bHits.push({ rooms: n, index: m.index ?? 0 });",
  "  }",
  "  if (!bHits.length) return null;",
  "  bHits.sort((a, b) => a.index - b.index);",
  "  return { rooms: bHits[0].rooms + 1, basis: 'bedrooms' };",
  "}",
  "",
  "",
].join('\n');

core = core.slice(0, start) + newParse + core.slice(end);

const oldNl = "export function nonListingReason(title: string, url: string): NonListing | null {\n  const t = String(title ?? '').trim();\n  if (WANTED.test(t)) return 'wanted_ad';";
const newNl = "export function nonListingReason(title: string, url: string): NonListing | null {\n  const t = String(title ?? '').trim();\n  // Bot-challenge / interstitial pages (Cloudflare etc.) are never a single rental offer.\n  if (/^(just a moment|attention required|access denied|one more step|checking your browser|please wait|cf-browser-verification)\\b/i.test(t)) return 'list_or_search_page';\n  if (WANTED.test(t)) return 'wanted_ad';";

if (!core.includes(oldNl)) {
  console.error('nonListingReason block not found');
  process.exit(1);
}
core = core.replace(oldNl, newNl);
writeFileSync(corePath, core);
console.log('patched', corePath, 'bytes', core.length);

const testPath = 'tests/immofinder-quality.test.mjs';
let test = readFileSync(testPath, 'utf8');
const marker = "test('isListingUnavailable detects CH portal offline phrases'";
const insert = [
  "",
  "test('parseRooms handles Swiss half-room spellings and prefers earliest Zimmer hit', async () => {",
  "  const { parseRooms, roomsEvidenceConflict } = await import('../server/immofinderCore.ts');",
  "  assert.equal(parseRooms('2 " + HALF + " Zimmer-Wohnung in Maladers mieten | Flatfox')?.rooms, 2.5);",
  "  assert.equal(parseRooms('2 1/2 Zimmer Wohnung in Chur')?.rooms, 2.5);",
  "  assert.equal(parseRooms('3.5 Zimmer Wohnung in Thusis')?.rooms, 3.5);",
  "  assert.equal(parseRooms('Zimmer: 4.5 · Miete CHF 1800')?.rooms, 4.5);",
  "  const mixed = parseRooms('2.5 Zimmer-Wohnung in Churwalden. Etage 5. Baujahr 1995. 65 m2.');",
  "  assert.equal(mixed?.rooms, 2.5);",
  "  assert.equal(roomsEvidenceConflict('2.5 Zimmer', 'Schöne 5.5 Zimmer Maisonette'), true);",
  "});",
  "",
  "",
].join('\n');

if (!test.includes(marker)) {
  console.error('test marker not found');
  process.exit(1);
}
if (!test.includes('parseRooms handles Swiss half-room')) {
  test = test.replace(marker, insert + marker);
  writeFileSync(testPath, test);
  console.log('patched', testPath);
} else {
  console.log('test already present');
}
