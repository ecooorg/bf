#!/usr/bin/env node
/** One-shot P130.7: Homegate detail titles + FR pièces rooms fallback. Delete after green CI. */
import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, fn) {
  const before = readFileSync(path, 'utf8');
  const after = fn(before);
  if (after === before) {
    console.log('unchanged', path);
    return;
  }
  writeFileSync(path, after);
  console.log('patched', path);
}

patch('server/immofinderCore.ts', (text) => {
  const oldSig = 'export function nonListingReason(title: string, url: string): NonListing | null {';
  const newSig = 'export function nonListingReason(title: string, url: string, portalHosts: string[] = []): NonListing | null {';
  if (text.includes(newSig) && text.includes('detailLike')) return text;
  if (!text.includes(oldSig)) throw new Error('nonListingReason signature not found');
  text = text.replace(oldSig, newSig);
  const oldGate = "  if (LIST_TITLE.test(t) || LIST_URL.test(url) || LIST_URL_MORE.test(url)) return 'list_or_search_page';";
  const newGate = `  // Homegate/ImmoScout detail ads often use titles like "Wohnung mieten in X" — do not treat those as list pages when the URL is a concrete portal detail.\n  const detailLike = isSpecificLink(url) || (portalHosts.length > 0 && isPortalDetailUrl(url, portalHosts));\n  if (!detailLike && (LIST_TITLE.test(t) || LIST_URL.test(url) || LIST_URL_MORE.test(url))) return 'list_or_search_page';\n  if (detailLike && (LIST_URL.test(url) || LIST_URL_MORE.test(url))) return 'list_or_search_page';`;
  if (!text.includes(oldGate)) throw new Error('LIST_TITLE gate not found');
  return text.replace(oldGate, newGate);
});

patch('server/immofinderDiscovery.ts', (text) => {
  const neu = "const nonListing = nonListingReason(h.title || '', h.link, portalHosts);";
  if (text.includes(neu)) return text;
  const old = "const nonListing = nonListingReason(h.title || '', h.link);";
  if (!text.includes(old)) throw new Error('discovery nonListing call not found');
  return text.replace(old, neu);
});

patch('server/immofinderPipeline.ts', (text) => {
  if (text.includes('Fallback: LLM often omits rooms_quote')) return text;
  text = text
    .replace(/nonListingReason\(it\.hit\.title, it\.url\)/g, "nonListingReason(it.hit.title, it.url, cfg.discovery?.portalHosts || [])")
    .replace(/nonListingReason\(meta!\.title, it\.url\)/g, "nonListingReason(meta!.title, it.url, cfg.discovery?.portalHosts || [])")
    .replace(/nonListingReason\(meta\.title, url\)/g, "nonListingReason(meta.title, url, cfg.discovery?.portalHosts || [])");
  const oldR = "const rq = q('rooms_quote'); const pr = rq ? parseRooms(rq) : null; const addressQuote = q('address_quote');";
  const newR = `const rq = q('rooms_quote'); let pr = rq ? parseRooms(rq) : null;\n  // Fallback: LLM often omits rooms_quote on FR titles ("3 pièces") or DE titles already in the head.\n  if (!pr) {\n    const detR = parseRooms(\`\${head}\\n\${text.slice(0, 3000)}\`);\n    if (detR) pr = detR;\n  }\n  const addressQuote = q('address_quote');`;
  if (!text.includes(oldR)) throw new Error('rooms_quote line not found');
  text = text.replace(oldR, newR);
  text = text.replace(
    "rooms: pr ? { rooms: pr.rooms, basis: pr.basis, quote: rq! } : null",
    "rooms: pr ? { rooms: pr.rooms, basis: pr.basis, quote: rq || '' } : null",
  );
  return text;
});

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
pkg.patch = '130.7';
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
let lock = readFileSync('package-lock.json', 'utf8');
lock = lock.replace(/"patch": "130\.6"/, '"patch": "130.7"');
writeFileSync('package-lock.json', lock);

const entry = `## P130.7 — Homegate detail titles + FR pièces rooms fallback\n\n- **PROBLEM:** Homegate SERP titles "Wohnung mieten in X" were rejected as list pages, so real detail ads never entered the fetch queue; French "3 pièces" titles stayed rooms_unknown when LLM omitted rooms_quote.\n- **CHANGE:** nonListingReason skips LIST_TITLE for specific/portal-detail URLs; extract falls back to deterministic parseRooms on title+body. BUGFIX.\n\n`;
const cl = readFileSync('CHANGELOG.md', 'utf8');
if (!cl.startsWith('## P130.7')) writeFileSync('CHANGELOG.md', entry + cl);

console.log('P130.7 applied');
