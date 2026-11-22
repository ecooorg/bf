#!/usr/bin/env node
/**
 * P130.9 — geo canton reject, municipality from URL, Homegate trefferliste keep for expansion
 */
import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, fn) {
  const before = readFileSync(path, 'utf8');
  const after = fn(before);
  if (after === before) console.log('unchanged', path);
  else { writeFileSync(path, after); console.log('patched', path); }
}

patch('server/immofinderCore.ts', (s) => {
  const old = "const OUTSIDE = /\\b(scuol|engadin|samnaun|sils|silvaplana|st\\.?\\s*moritz|pontresina|zuoz|madulain|celerina|samedan|zernez|guarda|arosa(?!\\s*[-–]?chur)|davos|klosters|val\\s*müstair|poschiavo|brusio)\\b/i;";
  if (s.includes('kanton\\s+bern')) { console.log('OUTSIDE already expanded'); return s; }
  if (!s.includes(old)) throw new Error('OUTSIDE not found');
  const neu = "const OUTSIDE = /\\b(scuol|engadin|samnaun|sils|silvaplana|st\\.?\\s*moritz|pontresina|zuoz|madulain|celerina|samedan|zernez|guarda|arosa(?!\\s*[-–]?chur)|davos|klosters|val\\s*müstair|poschiavo|brusio|kanton\\s+bern|im\\s+kanton\\s+bern|\\bbern\\b(?!\\s*hard)|kanton\\s+z[uü]rich|\\bz[uü]rich\\b(?!\\s*(see|gebiet))|\\bbasel\\b|\\bluzern\\b|\\blucerne\\b|\\bgenf\\b|\\bgeneva\\b|genève|obwalden|nidwalden|\\bwallis\\b|\\bvalais\\b|\\btessin\\b|\\bticino\\b|\\baargau\\b|\\bthurgau\\b|solothurn|schaffhausen|appenzell|st\\.?\\s*gallen)\\b/i;";
  return s.replace(old, neu);
});

patch('server/immofinderDiscovery.ts', (s) => {
  if (s.includes('accepted_expandable_index')) { console.log('discovery already patched'); return s; }
  const a2 = "    const nonListing = nonListingReason(h.title || '', h.link, portalHosts);\n    if (nonListing) { decide(false, `non_listing:${nonListing}`); continue; }";
  const a1 = "    const nonListing = nonListingReason(h.title || '', h.link);\n    if (nonListing) { decide(false, `non_listing:${nonListing}`); continue; }";
  const repl = "    const nonListing = nonListingReason(h.title || '', h.link, portalHosts);\n    const expandableIndex = /homegate\\.ch|immoscout24\\.ch/i.test(host) && /trefferliste|\\/liste(\\/|$)/i.test(h.link);\n    if (nonListing && !expandableIndex) { decide(false, `non_listing:${nonListing}`); continue; }";
  if (s.includes(a2)) s = s.replace(a2, repl);
  else if (s.includes(a1)) s = s.replace(a1, repl);
  else throw new Error('nonListing anchor missing');
  if (!s.includes('expandableIndex?: boolean')) {
    s = s.replace(
      'export interface DiscoveryItem { url: string; host: string; hit: SearchHit; snippetOnly: boolean }',
      'export interface DiscoveryItem { url: string; host: string; hit: SearchHit; snippetOnly: boolean; expandableIndex?: boolean }',
    );
  }
  s = s.replace(
    "    out.push({ url: h.link, host, hit: h, snippetOnly });\n    decide(true, snippetOnly ? 'accepted_snippet_only' : 'accepted_direct_fetch');",
    "    out.push({ url: h.link, host, hit: h, snippetOnly, expandableIndex: Boolean(typeof expandableIndex !== 'undefined' && expandableIndex) });\n    decide(true, (typeof expandableIndex !== 'undefined' && expandableIndex) ? 'accepted_expandable_index' : (snippetOnly ? 'accepted_snippet_only' : 'accepted_direct_fetch'));",
  );
  return s;
});

patch('server/immofinderPipeline.ts', (s) => {
  const muniDeny = "if (!ex.municipality) { await deny('municipality_not_whitelisted'); continue; }";
  if (s.includes(muniDeny) && !s.includes('placeFromUrl(url, cfg.municipalities)')) {
    s = s.replace(muniDeny,
      "if (!ex.municipality) {\n" +
      "        const fromUrl = placeFromUrl(url, cfg.municipalities);\n" +
      "        if (fromUrl.matched) ex.municipality = fromUrl.matched;\n" +
      "        else {\n" +
      "          const pathMuni = matchMunicipality(String(url).replace(/[-_/]/g, ' '), cfg.municipalities);\n" +
      "          if (pathMuni) ex.municipality = pathMuni;\n" +
      "        }\n" +
      "      }\n" +
      "      if (!ex.municipality) { await deny('municipality_not_whitelisted'); continue; }");
  } else console.log('muni fallback skip');

  if (!s.includes("placeFromTitleOrSnippet(meta.title, text.slice(0, 600)")) {
    const roomsCheck = "if (!ex.rooms || !(ex.rooms.rooms > 0)) { await deny('rooms_unknown'); continue; }";
    if (s.includes(roomsCheck)) {
      s = s.replace(roomsCheck,
        "const geoPre = placeFromTitleOrSnippet(meta.title, text.slice(0, 600), cfg.municipalities);\n" +
        "      if (geoPre.outside && !ex.municipality) { await deny('municipality_not_whitelisted', 'outside:' + (geoPre.hint || '')); continue; }\n" +
        "      if (!ex.rooms || !(ex.rooms.rooms > 0)) { await deny('rooms_unknown'); continue; }");
    }
  }

  if (s.includes('interface Item {') && !s.includes('expandableIndex?: boolean')) {
    s = s.replace(
      'interface Item { url: string; hit?: SearchHit; snippetOnly?: boolean; municipalityHint?: string | null }',
      'interface Item { url: string; hit?: SearchHit; snippetOnly?: boolean; municipalityHint?: string | null; expandableIndex?: boolean }',
    );
  }
  if (s.includes('snippetOnly: it.snippetOnly') && !s.includes('expandableIndex: Boolean')) {
    s = s.replace(/snippetOnly:\s*it\.snippetOnly/g, 'snippetOnly: it.snippetOnly, expandableIndex: Boolean((it as any).expandableIndex)');
  }

  if (!s.includes('expandable_index_expanded')) {
    const mark = "if (text.length < MIN_DIRECT_PAGE_TEXT_CHARS";
    if (s.includes(mark)) {
      const block =
        "if (it.expandableIndex && /homegate\\.ch|immoscout24\\.ch/i.test(hostOf(it.url))) {\n" +
        "        const links = candidateLinks(body || '', (it.url.startsWith('http') ? it.url : 'https://' + it.url), 15)\n" +
        "          .filter((u) => /\\/mieten\\/\\d{6,}/.test(u) || /immoscout24\\.ch.*\\/\\d{6,}/.test(u));\n" +
        "        diag('expandable_index_expanded', { source: src.id, url: safeDiagUrl(it.url), detailCount: links.length });\n" +
        "        res.counts.index_pages = (res.counts.index_pages || 0) + 1;\n" +
        "        for (const u of links.slice(0, Math.min(6, Math.max(0, maxPages - pages.length)))) {\n" +
        "          items.push({ url: u, hit: it.hit, snippetOnly: false });\n" +
        "        }\n" +
        "        await deny('list_or_search_page', 'expanded_index');\n" +
        "        continue;\n" +
        "      }\n      ";
      s = s.replace(mark, block + mark);
    } else console.log('no MIN_DIRECT inject point');
  }
  return s;
});

patch('package.json', (s) => {
  const j = JSON.parse(s);
  j.patch = '130.9';
  return JSON.stringify(j, null, 2) + '\n';
});
patch('package-lock.json', (s) => s.replace(/"patch": "130\.8"/g, '"patch": "130.9"'));
patch('CHANGELOG.md', (s) => {
  if (s.startsWith('## P130.9')) return s;
  return `## P130.9 — Homegate list expansion, geo canton reject, municipality from URL

- **PROBLEM:** site:homegate.ch SERP only returns trefferliste (0 detail candidates); Anibis Bern/Obwalden accepted for Chur; immobilier /chur/ URL lost municipality after LLM.
- **CHANGE:** keep Homegate/ImmoScout trefferliste and expand to /mieten/{id}; OUTSIDE covers other cantons; municipality fallback from URL path. BUGFIX.

` + s;
});

console.log('P130.9 applied');
