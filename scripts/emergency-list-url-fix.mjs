#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const GOOD = 'e11157b353c0c95bc5da3d3d657df317293a6e19';
const sh = (c) => { console.log('+', c); return execSync(c, { encoding: 'utf8' }); };

for (const p of ['server/immofinderCore.ts', 'server/immofinderDiscovery.ts', 'server/immofinderFetcher.ts']) {
  sh(`git show ${GOOD}:${p} > ${p}`);
  console.log('restored', p);
}

let core = readFileSync('server/immofinderCore.ts', 'utf8');
const a = '\\/liste(\\/|$)|gruppenhaus\\.ch|\\/_join_/i;';
const b = '\\/liste(\\/|$)|\\/seite-\\d+|\\/page\\/\\d+|gruppenhaus\\.ch|\\/_join_/i;';
if (!core.includes(a)) throw new Error('LIST_URL_MORE anchor missing');
core = core.replace(a, b);

const needle = "if (/^(just a moment|attention required|access denied|one more step|checking your browser|please wait|cf-browser-verification)\\b/i.test(t)) return 'list_or_search_page';\n  if (WANTED.test(t)) return 'wanted_ad';";
const insert = "if (/^(just a moment|attention required|access denied|one more step|checking your browser|please wait|cf-browser-verification)\\b/i.test(t)) return 'list_or_search_page';\n  if (/\\b(inserat nicht mehr|nicht mehr verfügbar|objekt nicht (mehr )?verfügbar)\\b/i.test(t)) return 'list_or_search_page';\n  if (/\\b(tiefgarage|parkhaus|parkplatz|stellplatz|einstellplatz|garagenplatz|garage|parking)\\b/i.test(t) && !/\\b(wohnung|haus|chalet|zimmer)\\b/i.test(t)) return 'list_or_search_page';\n  if (/\\.pdf(?:\\?|$)/i.test(url)) return 'list_or_search_page';\n  if (WANTED.test(t)) return 'wanted_ad';";
if (!core.includes(needle)) throw new Error('nonListing needle missing');
core = core.replace(needle, insert);

const hostNeedle = "if (/\\bumzug|moving\\s*company|offerten?\\s*vergleich|stündlich\\s*\\d+\\s*mietportale/i.test(t)) return 'service_or_aggregator';\n  } catch { /* ignore */ }";
const hostIns = "if (/\\bumzug|moving\\s*company|offerten?\\s*vergleich|stündlich\\s*\\d+\\s*mietportale/i.test(t)) return 'service_or_aggregator';\n    if (/\\/(zuerich|zurich|zürich|bern|basel|luzern|lucerne|genf|geneva|genève)\\b/i.test(url)) return 'list_or_search_page';\n  } catch { /* ignore */ }";
if (!core.includes(hostNeedle)) throw new Error('host needle missing');
core = core.replace(hostNeedle, hostIns);

const pOld = "if (parts.some((p) => /^(search|suche|suchen|results|resultate|map|karte|unterkategorie)/.test(p) || /^in-[a-z0-9-]{2,}$/.test(p))) return false;";
const pNew = "if (parts.some((p) => /^(search|suche|suchen|results|resultate|map|karte|unterkategorie)/.test(p) || /^in-[a-z0-9-]{2,}$/.test(p) || /^seite-\\d+$/.test(p) || /^page-?\\d+$/.test(p))) return false;";
if (!core.includes(pOld)) throw new Error('portal detail filter missing');
core = core.replace(pOld, pNew);
writeFileSync('server/immofinderCore.ts', core);
console.log('core patched', core.length);

let disc = readFileSync('server/immofinderDiscovery.ts', 'utf8');
const dOld = `    try {\n      const pathParts = new URL(h.link).pathname.split('/').filter(Boolean);\n      if (pathParts.length === 0 && !snippetOnly) { decide(false, 'site_root_not_listing'); continue; }\n    } catch { /* invalid URL already filtered */ }`;
const dNew = `    try {\n      const u = new URL(h.link);\n      const pathParts = u.pathname.split('/').filter(Boolean);\n      if (pathParts.length === 0 && !snippetOnly) { decide(false, 'site_root_not_listing'); continue; }\n      if (/\\.pdf$/i.test(u.pathname)) { decide(false, 'non_listing:list_or_search_page'); continue; }\n    } catch { /* invalid URL already filtered */ }`;
if (!disc.includes(dOld)) throw new Error('discovery block missing');
writeFileSync('server/immofinderDiscovery.ts', disc.replace(dOld, dNew));
console.log('discovery patched');

let fet = readFileSync('server/immofinderFetcher.ts', 'utf8');
const fOld = "const directTextChars = htmlToText(direct.body).trim().length;\n    logFetch('direct_result'";
const fNew = "const directTextChars = htmlToText(direct.body).trim().length;\n    const challengeLike = /just a moment|attention required|cf-browser-verification|checking your browser|enable javascript and cookies|ddos protection by/i.test(direct.body || '');\n    logFetch('direct_result'";
if (!fet.includes(fOld)) throw new Error('fetcher block missing');
fet = fet.replace(fOld, fNew);
fet = fet.replace('if (!direct.ok || directTextChars < 30) {', 'if (!direct.ok || directTextChars < 30 || challengeLike) {');
writeFileSync('server/immofinderFetcher.ts', fet);
console.log('fetcher patched');

const cfg = JSON.parse(readFileSync('config/immofinder.json', 'utf8'));
for (const h of ['ferienhausmiete.de', 'adankanhaenger.ch', 'happyholiday.ch', 'traum-ferienwohnungen.ch', 'fewo-direkt.de', 'hometogo.de']) {
  if (!cfg.discovery.skipHosts.includes(h)) cfg.discovery.skipHosts.push(h);
}
writeFileSync('config/immofinder.json', JSON.stringify(cfg, null, 2) + '\n');
console.log('skipHosts updated');
console.log('DONE');
