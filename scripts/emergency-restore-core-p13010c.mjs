#!/usr/bin/env node
/**
 * Restore immofinderCore.ts from last known good commit dadab30 + apply P130.10c category-end fix.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const GOOD = 'dadab30d76956fb573159fcc6a71ed2b025560a9';
const url = `https://raw.githubusercontent.com/ecooorg/bf/${GOOD}/server/immofinderCore.ts`;
console.log('fetch', url);
const res = await fetch(url);
if (!res.ok) throw new Error(`fetch ${res.status}`);
let t = await res.text();
if (t.length < 10000 || t.includes('PLACEHOLDER')) throw new Error('bad fetch body');

const old = `  // Category/list routes (no listing id): e.g. /de/mieten/wohnung, /mieten/wohnung
  if (/\\/(mieten|rent|louer|affittare)\\/(wohnung|apartment|haus|house|maison|flat)(?:\\/|$)/i.test(pathLower) && !/\\d{5,}/.test(pathLower)) return false;`;
const neu = `  // Category/list routes that END at the category (no listing id): /mieten/wohnung, /rent/flat
  // but /rent/flat/offer-77 or /mieten/wohnung/4001234567 remain detail pages.
  if (/\\/(mieten|rent|louer|affittare)\\/(wohnung|apartment|haus|house|maison|flat)\\/?$/i.test(pathLower)) return false;`;

if (!t.includes(old)) {
  if (t.includes('END at the category')) {
    console.log('already has END fix');
  } else {
    console.error('pattern missing');
    process.exit(1);
  }
} else {
  t = t.replace(old, neu);
  console.log('applied category-end fix');
}
writeFileSync('server/immofinderCore.ts', t);
console.log('wrote core', t.length);

// package + lock + changelog
const pj = JSON.parse(readFileSync('package.json', 'utf8'));
pj.patch = '130.10c';
writeFileSync('package.json', JSON.stringify(pj, null, 2) + '\n');

let lock = readFileSync('package-lock.json', 'utf8');
lock = lock.replaceAll('"patch": "130.10b"', '"patch": "130.10c"').replaceAll('"patch": "130.10"', '"patch": "130.10c"');
writeFileSync('package-lock.json', lock);

const cl = readFileSync('CHANGELOG.md', 'utf8');
if (!cl.startsWith('## P130.10c')) {
  writeFileSync('CHANGELOG.md', `## P130.10c — isPortalDetailUrl: only reject category paths that end at category

- **PROBLEM:** emergency category guard rejected real detail URLs like \`/rent/flat/offer-77\` (no 5+ digit id), so the Swiss-portal discovery test failed (1 FAIL in test:core).
- **CHANGE:** reject only paths that *end* at \`/mieten|rent/.../wohnung|flat\`; keep offer-id / numeric / longer slug segments. BUGFIX.

` + cl);
}
console.log('P130.10c restore complete');
