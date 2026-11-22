#!/usr/bin/env node
/**
 * P130.10 — real Homegate/ImmoScout list→detail expansion, priceVerdict prefer labelled/main rent,
 * Tutti/challenge force Jina, pass expandableIndex into processItems.
 */
import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, fn) {
  const before = readFileSync(path, 'utf8');
  const after = fn(before);
  if (after === before) console.log('unchanged', path);
  else {
    writeFileSync(path, after);
    console.log('patched', path);
  }
}

// --- 1) repair.ts: priceVerdict — only suspect when pick() cannot choose; prefer labelled / largest main rent
patch('server/immofinderRepair.ts', (s) => {
  if (s.includes('prefer_labelled_or_largest_main_rent')) {
    console.log('priceVerdict already P130.10');
    return s;
  }
  const old = `  if (Number.isFinite(stored) && stored > 0 && distinct.length > 1 && grossCandidates.length !== 1) {\n    return { status: 'suspect', why: 'price_ambiguous_on_detail_page' };\n  }\n  if (Number.isFinite(stored) && stored > 0 && grossCandidates.length === 1 && stored !== grossCandidates[0].amount) {\n    const gross = grossCandidates[0];\n    return { status: 'repair', price: { amount: gross.amount, unit: gross.unit as 'month' | 'week' | 'night' | 'season' }, why: 'gross_rent_preferred' };\n  }`;
  if (!s.includes(old)) throw new Error('priceVerdict suspect block not found');
  const neu = `  // P130.10: prefer labelled/gross/largest main rent; only mark ambiguous when pick cannot choose.\n  if (Number.isFinite(stored) && stored > 0 && distinct.length > 1) {\n    const one = pick(distinct);\n    if (!one) return { status: 'suspect', why: 'price_ambiguous_on_detail_page' };\n    if (one.amount !== stored) {\n      return { status: 'repair', price: { amount: one.amount, unit: one.unit as 'month' | 'week' | 'night' | 'season' }, why: 'prefer_labelled_or_largest_main_rent' };\n    }\n  }\n  if (Number.isFinite(stored) && stored > 0 && grossCandidates.length === 1 && stored !== grossCandidates[0].amount) {\n    const gross = grossCandidates[0];\n    return { status: 'repair', price: { amount: gross.amount, unit: gross.unit as 'month' | 'week' | 'night' | 'season' }, why: 'gross_rent_preferred' };\n  }`;
  s = s.replace(old, neu);

  const oldPick = `  const pick = (list: PriceCandidate[]): PriceCandidate | null => {\n    const gross = list.filter((c) => /\\b(bruttomiete|bruttomietzins|warmmiete)\\b/i.test(evidence.slice(Math.max(0, c.index - 60), c.index)));\n    if (gross.length === 1) return gross[0];\n    if (list.length === 1) return list[0];\n    const labelled = list.filter((c) => c.rentLabelled);\n    const labelledDistinct = [...new Map(labelled.map((c) => [\`\${c.amount}:\${c.unit}\`, c])).values()];\n    return labelledDistinct.length === 1 ? labelledDistinct[0] : null;\n  };`;
  if (!s.includes(oldPick)) throw new Error('pick() not found');
  const neuPick = `  const pick = (list: PriceCandidate[]): PriceCandidate | null => {\n    const gross = list.filter((c) => /\\b(bruttomiete|bruttomietzins|warmmiete)\\b/i.test(evidence.slice(Math.max(0, c.index - 60), c.index)));\n    if (gross.length === 1) return gross[0];\n    if (list.length === 1) return list[0];\n    const labelled = list.filter((c) => c.rentLabelled);\n    const labelledDistinct = [...new Map(labelled.map((c) => [\`\${c.amount}:\${c.unit}\`, c])).values()];\n    if (labelledDistinct.length === 1) return labelledDistinct[0];\n    // Two+ explicitly labelled rents (e.g. CHF 1450 and CHF 1650 both "Miete") stay ambiguous.\n    if (labelledDistinct.length > 1) return null;\n    // P130.10: unlabelled monthly amounts — main rent is almost always the largest in the 900–4500 band (garage/NK are smaller).\n    const band = list.filter((c) => c.unit === 'month' && c.amount >= 900 && c.amount <= 4500);\n    if (band.length >= 1) {\n      band.sort((a, b) => b.amount - a.amount);\n      if (band.length === 1 || band[0].amount >= band[1].amount * 1.25) return band[0];\n    }\n    return null;\n  };`;
  s = s.replace(oldPick, neuPick);

  if (s.includes("REPAIR_RULES_VERSION = '130.6.5'")) {
    s = s.replace("REPAIR_RULES_VERSION = '130.6.5'", "REPAIR_RULES_VERSION = '130.10.0'");
  } else if (s.includes("REPAIR_RULES_VERSION = '130.9")) {
    s = s.replace(/REPAIR_RULES_VERSION = '130\.9[^']*'/, "REPAIR_RULES_VERSION = '130.10.0'");
  } else {
    console.log('REPAIR_RULES_VERSION stamp already updated or unknown');
  }
  return s;
});

// --- 2) pipeline: pass expandableIndex + expand Homegate/ImmoScout trefferliste into detail URLs
patch('server/immofinderPipeline.ts', (s) => {
  if (s.includes('P130.10 expandable expansion')) {
    console.log('pipeline expansion already present');
    return s;
  }

  const dropMap = `await processItems({ id: currentSourceId }, items.map((i) => ({ url: i.url, hit: i.hit, snippetOnly: i.snippetOnly, municipalityHint: currentQueryMunicipality })), remaining);`;
  const keepMap = `await processItems({ id: currentSourceId }, items.map((i) => ({ url: i.url, hit: i.hit, snippetOnly: i.snippetOnly, municipalityHint: currentQueryMunicipality, expandableIndex: Boolean((i as any).expandableIndex) })), remaining);`;
  if (!s.includes(dropMap)) {
    if (s.includes('expandableIndex: Boolean((i as any).expandableIndex)')) {
      console.log('processItems map already passes expandableIndex');
    } else throw new Error('processItems map anchor missing');
  } else {
    s = s.replace(dropMap, keepMap);
  }

  const processStart = `  async function processItems(src: SrcMeta, items: Item[], maxPages: number) {\n    res.counts.candidates += items.length;\n    const st = getStat(src.id);\n    st.candidates += items.length;\n    const isDiscoverySource = src.id === 'search' || src.id.startsWith('portal-');\n    const stage: ProgressEvent['stage'] = isDiscoverySource ? 'search' : 'catalogue'; let idx = 0;`;
  if (!s.includes(processStart)) throw new Error('processItems start not found');
  if (s.includes('P130.10 expandable expansion')) return s;

  const expansion = `  async function processItems(src: SrcMeta, items: Item[], maxPages: number) {\n    // P130.10 expandable expansion: Homegate/ImmoScout trefferliste → concrete /mieten/{id} (or en/fr flat) detail URLs\n    const expanded: Item[] = [];\n    for (const it of items) {\n      if (!(it as any).expandableIndex) { expanded.push(it); continue; }\n      try {\n        const listPg = await withStepTimeout('fetch', () => deps.fetchPage(it.url));\n        if (!listPg.ok || !listPg.body || listPg.body.length < 80) {\n          diag('expandable_index_fetch_failed', { source: src.id, url: safeDiagUrl(it.url), status: listPg.status });\n          continue;\n        }\n        const detailRe = /homegate\\.ch|immoscout24\\.ch/i.test(it.url)\n          ? /\\/(mieten|rent)\\/\\d{5,}|\\/(de|en|fr)\\/flat\\/[^"'\\s]+\\/\\d{5,}/i\n          : /\\/\\d{6,}(?:\\/|$)|\\/(mieten|rent)\\/\\d{5,}/i;\n        const links = candidateLinks(listPg.body, listPg.finalUrl || it.url, 40, detailRe);\n        const uniq = [...new Set(links)].slice(0, 6);\n        diag('expandable_index_expanded', { source: src.id, listUrl: safeDiagUrl(it.url), detailCount: uniq.length, sample: uniq.slice(0, 3).map(safeDiagUrl) });\n        for (const u of uniq) {\n          expanded.push({ url: u, hit: it.hit ? { ...it.hit, link: u, title: it.hit.title || 'Homegate detail' } : undefined, snippetOnly: false, municipalityHint: it.municipalityHint, expandableIndex: false });\n        }\n      } catch (e) {\n        diag('expandable_index_error', { source: src.id, url: safeDiagUrl(it.url), error: safeDiagText((e as Error)?.message || e, 200) });\n      }\n    }\n    items = expanded.length ? expanded : items.filter((it) => !(it as any).expandableIndex);\n\n    res.counts.candidates += items.length;\n    const st = getStat(src.id);\n    st.candidates += items.length;\n    const isDiscoverySource = src.id === 'search' || src.id.startsWith('portal-');\n    const stage: ProgressEvent['stage'] = isDiscoverySource ? 'search' : 'catalogue'; let idx = 0;`;

  s = s.replace(processStart, expansion);
  return s;
});

// --- 3) fetcher: treat Tutti "Security check" / generic interstitial as challenge → Jina
patch('server/immofinderFetcher.ts', (s) => {
  if (s.includes('security check|access denied|one more step|please wait')) {
    console.log('fetcher challenge already broad');
    return s;
  }
  const old = `const challengeLike = /just a moment|attention required|cf-browser-verification|checking your browser|enable javascript and cookies|ddos protection by/i.test(direct.body || '');`;
  const neu = `const challengeLike = /just a moment|attention required|cf-browser-verification|checking your browser|enable javascript and cookies|ddos protection by|security check|access denied|one more step|please wait|verify you are human|captcha/i.test((direct.body || '') + ' ' + ((direct as any).title || ''));`;
  if (s.includes(old)) {
    s = s.replace(old, neu);
  } else {
    const m = s.match(/const challengeLike = \/[^\n]+/);
    if (!m) throw new Error('challengeLike not found');
    s = s.replace(m[0], neu);
  }
  return s;
});

// --- 4) core: reject "Security check" / short challenge titles as non-listing early
patch('server/immofinderCore.ts', (s) => {
  if (s.includes('security check|tutti.ch - security')) {
    console.log('nonListing challenge titles already present');
    return s;
  }
  const old = `  if (/^(just a moment|attention required|access denied|one more step|checking your browser|please wait|cf-browser-verification)\\b/i.test(t)) return 'list_or_search_page';`;
  if (!s.includes(old)) throw new Error('challenge title reject not found');
  const neu = `  if (/^(just a moment|attention required|access denied|one more step|checking your browser|please wait|cf-browser-verification|security check|tutti\\.ch - security)\\b/i.test(t)) return 'list_or_search_page';`;
  return s.replace(old, neu);
});

// --- 5) version bump
patch('package.json', (s) => {
  const j = JSON.parse(s);
  j.patch = '130.10';
  return JSON.stringify(j, null, 2) + '\n';
});

try {
  patch('package-lock.json', (s) => {
    const j = JSON.parse(s);
    if (j.version) j.version = '130';
    if (j.packages && j.packages['']) {
      j.packages[''].version = '130';
      if (j.packages[''].patch != null) j.packages[''].patch = '130.10';
    }
    if (j.patch != null) j.patch = '130.10';
    return JSON.stringify(j, null, 2) + '\n';
  });
} catch (e) {
  console.log('package-lock skip', e.message);
}

// --- 6) CHANGELOG
patch('CHANGELOG.md', (s) => {
  if (s.includes('## P130.10')) return s;
  const entry = `## P130.10 — Homegate list→detail expansion, price main-rent preference, challenge Jina\n\n- **PROBLEM:** Chur run 852a2499 kept 0: Homegate trefferliste tagged expandableIndex but never expanded (flag dropped before processItems); Flatfox Adlerweg CHF 1510+garage rejected as price_ambiguous; Tutti "Security check" skipped Jina and burned an LLM call as not_single_listing.\n- **CHANGE:** expand Homegate/ImmoScout index pages into up to 6 detail URLs; priceVerdict only suspects when pick cannot choose (prefer gross/labelled/largest 900–4500); challenge phrases include Security check → Jina; early nonListing on challenge titles. BUGFIX.\n\n`;
  return entry + s;
});

console.log('P130.10 apply done');
