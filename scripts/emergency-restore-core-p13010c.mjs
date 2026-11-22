#!/usr/bin/env node
/**
 * Restore immofinderCore.ts + package metadata from dadab30, apply P130.10c.
 */
import { writeFileSync } from 'node:fs';

const GOOD = 'dadab30d76956fb573159fcc6a71ed2b025560a9';
async function get(path) {
  const url = `https://raw.githubusercontent.com/ecooorg/bf/${GOOD}/${path}`;
  console.log('fetch', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${path} ${res.status}`);
  return await res.text();
}

let t = await get('server/immofinderCore.ts');
if (t.length < 10000 || t.includes('PLACEHOLDER')) throw new Error('bad core body');

const old = `  // Category/list routes (no listing id): e.g. /de/mieten/wohnung, /mieten/wohnung\n  if (/\\/(mieten|rent|louer|affittare)\\/(wohnung|apartment|haus|house|maison|flat)(?:\\/|$)/i.test(pathLower) && !/\\d{5,}/.test(pathLower)) return false;`;
const neu = `  // Category/list routes that END at the category (no listing id): /mieten/wohnung, /rent/flat\n  // but /rent/flat/offer-77 or /mieten/wohnung/4001234567 remain detail pages.\n  if (/\\/(mieten|rent|louer|affittare)\\/(wohnung|apartment|haus|house|maison|flat)\\/?$/i.test(pathLower)) return false;`;

if (t.includes(old)) {
  t = t.replace(old, neu);
  console.log('applied category-end fix');
} else if (t.includes('END at the category')) {
  console.log('already has END fix');
} else {
  console.error('pattern missing, applying via line replace');
  // fallback: replace the regex line only
  const re = /if \(\/\\\/\(mieten\|rent\|louer\|affittare\)\\\/\(wohnung\|apartment\|haus\|house\|maison\|flat\)\(\?:\\\/\|\$\)\/i\.test\(pathLower\) && !\/\\\d\{5,\}\/\.test\(pathLower\)\) return false;/;
  if (re.test(t)) {
    t = t.replace(re, "if (/\\/(mieten|rent|louer|affittare)\\/(wohnung|apartment|haus|house|maison|flat)\\/?$/i.test(pathLower)) return false;");
    console.log('regex-line fallback applied');
  } else {
    process.exit(1);
  }
}
writeFileSync('server/immofinderCore.ts', t);
console.log('wrote core', t.length);

let pjText = await get('package.json');
if (pjText.includes('PLACEHOLDER')) throw new Error('bad package.json from good');
const pj = JSON.parse(pjText);
pj.patch = '130.10c';
writeFileSync('package.json', JSON.stringify(pj, null, 2) + '\n');
console.log('wrote package.json patch', pj.patch);

let lock = await get('package-lock.json');
lock = lock.replaceAll('"patch": "130.10b"', '"patch": "130.10c"');
writeFileSync('package-lock.json', lock);
console.log('wrote package-lock');

let cl = await get('CHANGELOG.md');
if (!cl.startsWith('## P130.10c')) {
  cl = `## P130.10c — isPortalDetailUrl: only reject category paths that end at category\n\n- **PROBLEM:** emergency category guard rejected real detail URLs like \\/rent/flat/offer-77 (no 5+ digit id), so the Swiss-portal discovery test failed (1 FAIL in test:core).\n- **CHANGE:** reject only paths that *end* at \\/mieten|rent/.../wohnung|flat; keep offer-id / numeric / longer slug segments. BUGFIX.\n\n` + cl;
}
writeFileSync('CHANGELOG.md', cl);
console.log('P130.10c restore complete');
