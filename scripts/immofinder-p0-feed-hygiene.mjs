#!/usr/bin/env node
/** P130.12 P0 feed hygiene patches — idempotent string patches on immofinderCore.ts */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const corePath = join(root, 'server/immofinderCore.ts');
let t = readFileSync(corePath, 'utf8');
let n = 0;

function once(label, from, to) {
  if (typeof from === 'string') {
    if (!t.includes(from)) { console.log('skip (no match):', label); return; }
    if (to.length > 30 && t.includes(to.slice(0, 40))) { console.log('skip (already):', label); return; }
    t = t.replace(from, to);
    n++;
    console.log('applied:', label);
    return;
  }
  if (!from.test(t)) { console.log('skip (no match):', label); return; }
  t = t.replace(from, to);
  n++;
  console.log('applied:', label);
}

// 1) clearSerpTitle + hotel + acheter/rentola in nonListingReason
if (!t.includes('clearSerpTitle')) {
  once('clearSerpTitle',
    `  // Homegate/ImmoScout detail ads often use titles like "Wohnung mieten in X" — do not treat those as list pages when the URL is a concrete portal detail.
  const detailLike = isSpecificLink(url) || (portalHosts.length > 0 && isPortalDetailUrl(url, portalHosts));
  if (!detailLike && (LIST_TITLE.test(t) || LIST_URL.test(url) || LIST_URL_MORE.test(url))) return 'list_or_search_page';
  if (detailLike && (LIST_URL.test(url) || LIST_URL_MORE.test(url))) return 'list_or_search_page';`,
    `  // Google Travel / Hotels entities are never long-term rentals.
  if (/google\\.[a-z.]+\\/travel\\/hotels\\//i.test(url) || /\\/travel\\/hotels\\/entity\\//i.test(url)) return 'hotel_or_guesthouse';
  // Category / sale index pages on aggregators.
  if (/acheter-louer\\.ch\\/(acheter|fr\\/achat)/i.test(url) || /rentola\\.ch\\/listings\\//i.test(url)) return 'list_or_search_page';
  // Homegate/ImmoScout detail ads often use titles like "Wohnung mieten in X" — do not treat those as list pages when the URL is a concrete portal detail.
  const detailLike = isSpecificLink(url) || (portalHosts.length > 0 && isPortalDetailUrl(url, portalHosts));
  const clearSerpTitle = /\\d+\\s+treffer|treffer\\s*-|^(wohnung(en)? mieten in\\s+\\w+\\s*$)|bei homegate\\.ch findest/i.test(t);
  if (!detailLike && (LIST_TITLE.test(t) || LIST_URL.test(url) || LIST_URL_MORE.test(url))) return 'list_or_search_page';
  if (detailLike && (LIST_URL.test(url) || LIST_URL_MORE.test(url) || clearSerpTitle)) return 'list_or_search_page';`);
}

// 2) rentola host
if (!t.includes('|rentola.ch)$')) {
  once('rentola-host',
    '(moving24\\.ch|umzugsfirma-buchen\\.ch|rentumo\\.ch|umzug[^/]*\\.ch)$',
    '(moving24\\.ch|umzugsfirma-buchen\\.ch|rentumo\\.ch|umzug[^/]*\\.ch|rentola\\.ch)$');
}

// 3) Kaufpreis in isForSaleListing
if (!t.includes('kaufpreis')) {
  once('kaufpreis-for-sale',
    'export function isForSaleListing(title: string, text: string, url: string): boolean {\n',
    `export function isForSaleListing(title: string, text: string, url: string): boolean {\n  const hSale = \\$\{title}\\n\$\{String(text ?? '').slice(0, 2500)}\`;\n  if (/\\bkaufpreis\\b/i.test(hSale) || /\\bverkaufspreis\\b/i.test(hSale)) return true;\n  if (/urbanhome\\.ch\\/.*\\/kaufen\\//i.test(url) || /\\/kaufen\\//i.test(url)) return true;\n`);
}

// 4) FB group root
if (!t.includes('Group root without a specific post')) {
  once('fb-group-root',
    `    if (/\\/photo\\.php/i.test(p) || /\\/photos\\//i.test(p)) return true;\n    if (/fbid=/i.test(u.search) && /set=gm\\./i.test(u.search) && !/\\/posts\\//i.test(p)) return true;`,
    `    if (/\\/photo\\.php/i.test(p) || /\\/photos\\//i.test(p)) return true;\n    // Group root without a specific post is the whole board, not one ad.\n    if (/\\/groups\\/\\d+\\/?$/i.test(p) || /\\/groups\\/[^/]+\\/?$/i.test(p)) return true;\n    if (/fbid=/i.test(u.search) && /set=gm\\./i.test(u.search) && !/\\/posts\\//i.test(p)) return true;`);
}

// 5) year as price stronger
if (!t.includes("unit === 'month' && h.amount >= 2020")) {
  once('year-as-price',
    `    // Calendar years in "ab 01.11.2026" must not become rent (was keeping amount=2026).\n    if (h.amount >= 2020 && h.amount <= 2035) {\n      const near = t.slice(Math.max(0, h.idx - 30), h.idx + h.quote.length + 20);\n      if (/(?:^|\\D)(20[2-3]\\d)(?:\\D|$)/.test(near) && /(?:per|ab|vom|verfügbar|bezug|frei|ab\\s*dem|ab\\s*sofort|\\d{1,2}[./]\\d{1,2}[./])/.test(near)) {\n        continue;\n      }\n      // Bare 2026 with no currency and no month/night word — skip\n      if (!h.currency && unit === 'unknown') continue;\n    }`,
    `    // Calendar years in "ab 01.11.2026" / "Per 01. November 2026" must not become rent (was keeping amount=2026).\n    if (h.amount >= 2020 && h.amount <= 2035) {\n      const near = t.slice(Math.max(0, h.idx - 40), h.idx + h.quote.length + 30);\n      if (/(?:^|\\D)(20[2-3]\\d)(?:\\D|$)/.test(near) && /(?:per|ab|vom|verfügbar|bezug|frei|ab\\s*dem|ab\\s*sofort|november|dezember|januar|februar|märz|april|mai|juni|juli|august|september|oktober|\\d{1,2}[./]\\d{1,2}[./]|einzug|bezugstermin)/i.test(near)) {\n        continue;\n      }\n      if (unit === 'unknown' || !h.currency) continue;\n      if (unit === 'month' && h.amount >= 2020 && h.amount <= 2035) continue;\n    }`);
}

if (n > 0) {
  writeFileSync(corePath, t);
  console.log('Wrote server/immofinderCore.ts with', n, 'patches');
} else {
  console.log('immofinderCore.ts already has P0 patches or no matches');
}

const repairPath = join(root, 'server/immofinderRepair.ts');
if (existsSync(repairPath)) {
  let r = readFileSync(repairPath, 'utf8');
  const r2 = r.replace(/REPAIR_RULES_VERSION = '130\\.\\d+\\.\\d+'/, "REPAIR_RULES_VERSION = '130.12.5'");
  if (r2 !== r) {
    writeFileSync(repairPath, r2);
    console.log('REPAIR_RULES_VERSION -> 130.12.5');
  }
}
