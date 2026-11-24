#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const core = join(dirname(fileURLToPath(import.meta.url)), '../server/immofinderCore.ts');
let t = readFileSync(core, 'utf8');
let n = 0;
if (!t.includes('clearSerpTitle')) {
  const a = "  const detailLike = isSpecificLink(url) || (portalHosts.length > 0 && isPortalDetailUrl(url, portalHosts));\n  if (!detailLike && (LIST_TITLE.test(t) || LIST_URL.test(url) || LIST_URL_MORE.test(url))) return 'list_or_search_page';\n  if (detailLike && (LIST_URL.test(url) || LIST_URL_MORE.test(url))) return 'list_or_search_page';";
  const b = "  if (/google\\.[a-z.]+\\/travel\\/hotels\\//i.test(url) || /\\/travel\\/hotels\\/entity\\//i.test(url)) return 'hotel_or_guesthouse';\n  if (/acheter-louer\\.ch\\/(acheter|fr\\/achat)/i.test(url) || /rentola\\.ch\\/listings\\//i.test(url)) return 'list_or_search_page';\n  const detailLike = isSpecificLink(url) || (portalHosts.length > 0 && isPortalDetailUrl(url, portalHosts));\n  const clearSerpTitle = /\\d+\\s+treffer|treffer\\s*-|^(wohnung(en)? mieten in\\s+\\w+\\s*$)|bei homegate\\.ch findest/i.test(t);\n  if (!detailLike && (LIST_TITLE.test(t) || LIST_URL.test(url) || LIST_URL_MORE.test(url))) return 'list_or_search_page';\n  if (detailLike && (LIST_URL.test(url) || LIST_URL_MORE.test(url) || clearSerpTitle)) return 'list_or_search_page';";
  if (t.includes(a)) { t = t.replace(a, b); n++; }
}
if (!t.includes('kaufpreis')) {
  const a = "export function isForSaleListing(title: string, text: string, url: string): boolean {\n  const hay = `${title}\\n${text}\\n${url}`;\n  if (/flat-to-buy|zu-kaufen|einfamilienhaus-zu-kaufen|\\/kaufen\\//i.test(url)) return true;";
  const b = "export function isForSaleListing(title: string, text: string, url: string): boolean {\n  const hay = `${title}\\n${text}\\n${url}`;\n  if (/\\bkaufpreis\\b/i.test(hay) || /\\bverkaufspreis\\b/i.test(hay)) return true;\n  if (/flat-to-buy|zu-kaufen|einfamilienhaus-zu-kaufen|\\/kaufen\\//i.test(url)) return true;";
  if (t.includes(a)) { t = t.replace(a, b); n++; }
}
if (!t.includes('Group root without')) {
  const a = "    if (/\\/photo\\.php/i.test(p) || /\\/photos\\//i.test(p)) return true;\n    if (/fbid=/i.test(u.search) && /set=gm\\./i.test(u.search) && !/\\/posts\\//i.test(p)) return true;";
  const b = "    if (/\\/photo\\.php/i.test(p) || /\\/photos\\//i.test(p)) return true;\n    if (/\\/groups\\/\\d+\\/?$/i.test(p) || /\\/groups\\/[^/]+\\/?$/i.test(p)) return true;\n    if (/fbid=/i.test(u.search) && /set=gm\\./i.test(u.search) && !/\\/posts\\//i.test(p)) return true;";
  if (t.includes(a)) { t = t.replace(a, b); n++; }
}
if (n) writeFileSync(core, t);
console.log('P0 patches', n);
