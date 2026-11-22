#!/usr/bin/env node
/**
 * Quality yield fix: stop keeping rooms=0 / empty SERP pages;
 * parse French pièces; tighten listing_unavailable; reject empty-result titles.
 * Restores core/discovery/fetcher/pipeline from GOOD if any file is PLACEHOLDER-sized.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const GOOD = '8e0bbafc1245a4991f16fe6e34742830d2dadf61';
const show = (path) => execSync(`git show ${GOOD}:${path}`, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

function ensure(path, minLen) {
  let body = '';
  try { body = readFileSync(path, 'utf8'); } catch { body = ''; }
  if (body.length < minLen || body.trim() === 'PLACEHOLDER') {
    console.log('restoring', path, 'from', GOOD);
    writeFileSync(path, show(path));
    body = readFileSync(path, 'utf8');
  }
  if (body.length < minLen) throw new Error(path + ' still too small: ' + body.length);
  return body;
}

let core = ensure('server/immofinderCore.ts', 50000);
let disc = ensure('server/immofinderDiscovery.ts', 5000);
let fet = ensure('server/immofinderFetcher.ts', 5000);
let pipe = ensure('server/immofinderPipeline.ts', 20000);

// --- parseRooms: French pièces with accent ---
{
  const a = '/(?:zimmer|zi\\.?|rooms?|pieces?)\\s*[:=]?\\s*(\\d{1,2}(?:\\.\\d)?)/gi';
  const b = '/(?:zimmer|zi\\.?|rooms?|pi[eè]ces?)\\s*[:=]?\\s*(\\d{1,2}(?:\\.\\d)?)/gi';
  const a2 = '/(\\d{1,2}(?:\\.\\d)?)\\s*[- ]?\\s*(?:zimmer|zi\\b|zi\\.|rooms?|pieces?|-?zimmerwohnung)/gi';
  const b2 = '/(\\d{1,2}(?:\\.\\d)?)\\s*[- ]?\\s*(?:zimmer|zi\\b|zi\\.|rooms?|pi[eè]ces?|-?zimmerwohnung)/gi';
  if (!core.includes(a)) throw new Error('parseRooms pattern1 missing');
  if (!core.includes(a2)) throw new Error('parseRooms pattern2 missing');
  core = core.replace(a, b).replace(a2, b2);
}

// --- nonListingReason: empty-result / zero-offer titles ---
{
  const needle = "if (/^(just a moment|attention required|access denied|one more step|checking your browser|please wait|cf-browser-verification)\\b/i.test(t)) return 'list_or_search_page';";
  if (!core.includes(needle)) throw new Error('challenge needle missing');
  const insert = needle + "\n  // Empty SERP / zero-offer index pages must never become cards.\n  if (/\\b(aucun (appartement|maison|bien)|keine (wohnungen?|angebote|resultate|treffer)|no (results?|listings?|apartments?)|0\\s+(wohnungen|inserate|resultate|angebote)|aucun résultat)\\b/i.test(t)) return 'list_or_search_page';";
  core = core.replace(needle, insert);
}

// --- isListingUnavailable: drop overly broad "listing is not available" ---
{
  const broad = "if (/unfortunately,?\\s*this listing is currently not available|this listing is currently not available|listing is not available/i.test(h)) return true;";
  const tight = "if (/unfortunately,?\\s*this (listing|ad|property) is (currently )?not available|this (listing|ad|property) is (no longer|currently not) available/i.test(h)) return true;";
  if (!core.includes(broad)) {
    console.warn('broad unavailable pattern missing — skip tighten');
  } else {
    core = core.replace(broad, tight);
  }
}

// --- isPortalDetailUrl: reject canton/commune index tails without numeric id ---
{
  const check = "if (parts.some((p) => /^(search|suche|suchen|results|resultate|map|karte|unterkategorie)/.test(p) || /^in-[a-z0-9-]{2,}$/.test(p) || /^seite-\\d+$/.test(p) || /^page-?\\d+$/.test(p))) return false;";
  if (!core.includes(check)) throw new Error('isPortalDetailUrl check missing');
  const add = check + "\n  // Shallow portal index (…/louer/appartement-maison/grisons/landquart) has no listing id.\n  if (parts.length <= 4 && !parts.some((p) => /\\d{4,}/.test(p))) return false;";
  core = core.replace(check, add);
}

writeFileSync('server/immofinderCore.ts', core);
console.log('core ok', core.length);

// --- pipeline: rooms<=0 is rooms_unknown ---
{
  const old = "if (!ex.rooms) { await deny('rooms_unknown'); continue; }\n      if (ex.rooms.rooms > 0 && ex.rooms.rooms < cfg.minRooms) { await deny('rooms_below_min', String(ex.rooms.rooms)); continue; }";
  const neu = "if (!ex.rooms || !(ex.rooms.rooms > 0)) { await deny('rooms_unknown'); continue; }\n      if (ex.rooms.rooms < cfg.minRooms) { await deny('rooms_below_min', String(ex.rooms.rooms)); continue; }";
  if (!pipe.includes(old)) throw new Error('pipeline rooms gate missing');
  pipe = pipe.replace(old, neu);
  const invent = "if (snippetEvidence && !ex.rooms) {\n        ex.rooms = { rooms: 0, basis: 'not_stated_in_search_snippet', quote: 'nicht angegeben' };\n        ex.signals.push('rooms_unverified');\n      }";
  const invent2 = "if (snippetEvidence && !ex.rooms) {\n        // Leave rooms null — inventing 0 previously bypassed minRooms and produced garbage cards.\n        ex.signals.push('rooms_unverified');\n      }";
  if (!pipe.includes(invent)) throw new Error('snippet rooms invent missing');
  pipe = pipe.replace(invent, invent2);
  writeFileSync('server/immofinderPipeline.ts', pipe);
  console.log('pipeline ok', pipe.length);
}

// --- quality tests append ---
let test = readFileSync('tests/immofinder-quality.test.mjs', 'utf8');
const marker = "test('nonListingReason rejects portal list/index URLs and challenge titles'";
if (!test.includes("Aucun appartement")) {
  const extra = `
test('P130.6 rooms gate and empty SERP titles', async () => {
  const { nonListingReason, parseRooms, isListingUnavailable, isPortalDetailUrl } = await import('../server/immofinderCore.ts');
  assert.equal(nonListingReason('Aucun appartement ou maison à louer à Landquart (GR)', 'https://www.immobilier.ch/fr/louer/appartement-maison/grisons/landquart'), 'list_or_search_page');
  assert.equal(parseRooms('Appartement 3 pièces à louer à Landquart')?.rooms, 3);
  assert.equal(parseRooms('3 pièces appartement')?.rooms, 3);
  assert.equal(isListingUnavailable('Rent a 4 ½ rooms apartment', 'Modern apartment with balcony. Available now.'), false);
  const portals = ['immobilier.ch', 'flatfox.ch'];
  assert.equal(isPortalDetailUrl('https://www.immobilier.ch/fr/louer/appartement-maison/grisons/landquart', portals), false);
  assert.equal(isPortalDetailUrl('https://flatfox.ch/de/wohnung/landquart-kantonsstrasse-23-7302-landquart/86180998/', portals), true);
});

`;
  if (!test.includes(marker)) throw new Error('test marker missing');
  test = test.replace(marker, extra + marker);
  writeFileSync('tests/immofinder-quality.test.mjs', test);
  console.log('tests ok');
}

// --- version + CHANGELOG (P130.6 product BUGFIX) ---
{
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  pkg.patch = '130.6';
  writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  try {
    const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = pkg.version;
      lock.packages[''].patch = pkg.patch;
    }
    if (lock.version) lock.version = pkg.version;
    writeFileSync('package-lock.json', JSON.stringify(lock, null, 2) + '\n');
  } catch (e) { console.warn('lock sync skip', e.message); }
  const entry = `## P130.6 — ImmoFinder: stop garbage cards (rooms=0 / empty SERP)

- **PROBLEM:** Landquart run kept an immobilier index page ("Aucun appartement…") as a card with rooms 0 / price n/a; French "3 pièces" was rooms_unknown; Flatfox live ads were falsely listing_unavailable; rooms=0 from snippet invent bypassed minRooms.
- **CHANGE:** reject empty-result titles; require rooms>0 before minRooms; parse pièces; tighten unavailable phrases; reject shallow portal index URLs without an id. BUGFIX.

`;
  const cl = readFileSync('CHANGELOG.md', 'utf8');
  if (!cl.startsWith('## P130.6')) writeFileSync('CHANGELOG.md', entry + cl);
  console.log('version 130.6 + changelog');
}

console.log('apply-immofinder-yield-fix done');
