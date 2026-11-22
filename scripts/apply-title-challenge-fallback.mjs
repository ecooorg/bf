#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
function must(c, m) { if (!c) { console.error(m); process.exit(1); } }

let pipe = readFileSync('server/immofinderPipeline.ts', 'utf8');
must(pipe.includes('pageMeta(pg.body, evidenceUrl)'), 'pageMeta call missing');
if (!pipe.includes('serp_title_preferred_over_brand')) {
  for (const form of ['      const meta = pageMeta(pg.body, evidenceUrl);', '      let meta = pageMeta(pg.body, evidenceUrl);']) {
    if (!pipe.includes(form)) continue;
    const replacement = form.replace('const meta', 'let meta') + `\n      // serp_title_preferred_over_brand: portal shells often set <title> to the site name only\n      if (it.hit?.title) {\n        const brandLike = /^(icasa|flatfox|homegate|immoscout|tutti|anibis|urbanhome)\\b/i.test(String(meta.title || '').replace(/\\.ch.*/i, '').trim())\n          || String(meta.title || '').trim().length < 12;\n        const serpHasRooms = /\\d([.,]\\d)?\\s*(zimmer|zi\\b|pi[eè]ces?|rooms?)/i.test(it.hit.title);\n        if (brandLike && serpHasRooms) {\n          meta = { ...meta, title: String(it.hit.title).slice(0, 180), description: meta.description || String(it.hit.snippet || '') };\n        }\n      }`;
    pipe = pipe.replace(form, replacement);
    console.log('brand title preference added');
    break;
  }
}
writeFileSync('server/immofinderPipeline.ts', pipe);

let core = readFileSync('server/immofinderCore.ts', 'utf8');
const oldCh = `  // Bot-challenge / interstitial pages (Cloudflare etc.) are never a single rental offer.\n  if (/^(just a moment|attention required|access denied|one more step|checking your browser|please wait|cf-browser-verification|security check|tutti\\.ch - security)\\b/i.test(t)) return 'list_or_search_page';`;
const newCh = `  // Bot-challenge: reject unless URL is already a portal detail (Homegate /mieten/400… + SERP facts).\n  if (/^(just a moment|attention required|access denied|one more step|checking your browser|please wait|cf-browser-verification|security check|tutti\\.ch - security)\\b/i.test(t)) {\n    if (!(portalHosts.length && isPortalDetailUrl(url, portalHosts))) return 'list_or_search_page';\n  }`;
must(core.includes(oldCh), 'challenge nonListing block not found');
core = core.replace(oldCh, newCh);
writeFileSync('server/immofinderCore.ts', core);
console.log('core challenge+detail patched');

const pj = JSON.parse(readFileSync('package.json', 'utf8'));
pj.patch = '130.10g';
writeFileSync('package.json', JSON.stringify(pj, null, 2) + '\n');
let lock = readFileSync('package-lock.json', 'utf8');
for (const p of ['130.10f', '130.10e', '130.10d']) lock = lock.replaceAll(`"patch": "${p}"`, '"patch": "130.10g"');
writeFileSync('package-lock.json', lock);
let repair = readFileSync('server/immofinderRepair.ts', 'utf8');
for (const v of ['130.10f.5', '130.10e.5']) {
  if (repair.includes(`REPAIR_RULES_VERSION = '${v}'`)) {
    repair = repair.replace(`REPAIR_RULES_VERSION = '${v}'`, "REPAIR_RULES_VERSION = '130.10g.5'");
    writeFileSync('server/immofinderRepair.ts', repair);
    break;
  }
}
const cl = readFileSync('CHANGELOG.md', 'utf8');
if (!cl.startsWith('## P130.10g')) {
  writeFileSync('CHANGELOG.md', `## P130.10g — SERP title over brand + challenge on portal detail\n\n- **PROBLEM:** Run 1bcba049 kept=1 (iCasa) with brand-only title; Homegate detail challenged as list_or_search.\n- **CHANGE:** prefer SERP title when page title is brand-like; challenge on portal detail URL is not auto list. BUGFIX.\n\n` + cl);
}
console.log('P130.10g applied');
