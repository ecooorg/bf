#!/usr/bin/env node
/**
 * P130.10e from Chur run c8b28cdc (kept=0, candidates=14):
 * - Homegate expansion still detailCount=0: also harvest listingId JSON and /rent/\\d ids
 * - Flatfox Adlerweg price_ambiguous: prefer largest monthly when 2 candidates in main-rent band
 * - parseRooms: use first consistent room hit, not Math.max among close hits (3.5 vs 4.5 inflation)
 */
import { readFileSync, writeFileSync } from 'node:fs';

function must(c, m) { if (!c) { console.error(m); process.exit(1); } }

let pipe = readFileSync('server/immofinderPipeline.ts', 'utf8');
must(pipe.includes('fromBare'), 'P130.10d fromBare block missing — run after 10d');
const marker = 'const uniq = [...new Set([...fromAnchors, ...fromBare])].slice(0, 6);';
must(pipe.includes(marker), 'uniq marker missing');
if (!pipe.includes('listingId_json_harvest')) {
  pipe = pipe.replace(marker, `// listingId_json_harvest: Homegate SPA embeds numeric ids without path prefixes\n        const idRe = /"listingId"\\s*:\\s*(\\d{6,})|"id"\\s*:\\s*(\\d{7,})|\\/rent\\/(\\d{6,})|\\/mieten\\/(\\d{6,})/gi;\n        let im: RegExpExecArray | null;\n        while ((im = idRe.exec(listPg.body)) !== null) {\n          const id = im[1] || im[2] || im[3] || im[4];\n          if (!id) continue;\n          const origin = (() => { try { return new URL(listPg.finalUrl || it.url).origin; } catch { return 'https://www.homegate.ch'; } })();\n          fromBare.push(origin + '/mieten/' + id);\n          fromBare.push(origin + '/rent/' + id);\n        }\n        const uniq = [...new Set([...fromAnchors, ...fromBare])].slice(0, 6);`);
  console.log('pipeline expansion harvest extended');
}

let core = readFileSync('server/immofinderCore.ts', 'utf8');
const oldPr = `  if (hits.length) {\n    hits.sort((a, b) => a.index - b.index);\n    const first = hits[0].rooms;\n    const close = hits.filter((h) => Math.abs(h.rooms - first) <= 1.01).map((h) => h.rooms);\n    return { rooms: Math.max(...close), basis: 'zimmer' };\n  }`;
const newPr = `  if (hits.length) {\n    hits.sort((a, b) => a.index - b.index);\n    // Prefer the first room mention (title / lead). Math.max among close hits inflated\n    // "3 ½ pièces" to 4.5 when a later nearby count differed by 1.\n    const first = hits[0].rooms;\n    const same = hits.filter((h) => Math.abs(h.rooms - first) < 0.01).map((h) => h.rooms);\n    return { rooms: same[0] ?? first, basis: 'zimmer' };\n  }`;
must(core.includes(oldPr), 'parseRooms block not found');
core = core.replace(oldPr, newPr);
writeFileSync('server/immofinderCore.ts', core);
console.log('parseRooms fixed');

let repair = readFileSync('server/immofinderRepair.ts', 'utf8');
const oldBand = `    const band = list.filter((c) => c.unit === 'month' && c.amount >= 900 && c.amount <= 4500);\n    if (band.length >= 1) {\n      band.sort((a, b) => b.amount - a.amount);\n      if (band.length === 1 || band[0].amount >= band[1].amount * 1.25) return band[0];\n    }\n    return null;`;
const newBand = `    const band = list.filter((c) => c.unit === 'month' && c.amount >= 900 && c.amount <= 4500);\n    if (band.length >= 1) {\n      band.sort((a, b) => b.amount - a.amount);\n      // Main rent is usually the largest monthly figure; garage/NK gaps are often 200–600 CHF.\n      if (band.length === 1) return band[0];\n      if (band[0].amount >= band[1].amount * 1.12) return band[0];\n      if (band[0].amount - band[1].amount >= 250) return band[0];\n      // Exactly two monthly amounts in band → prefer the higher (typical CH portal layout).\n      if (band.length === 2) return band[0];\n    }\n    return null;`;
must(repair.includes(oldBand), 'priceVerdict band block not found');
repair = repair.replace(oldBand, newBand);
if (repair.includes("REPAIR_RULES_VERSION = '130.10d.5'")) {
  repair = repair.replace("REPAIR_RULES_VERSION = '130.10d.5'", "REPAIR_RULES_VERSION = '130.10e.5'");
} else if (repair.includes("REPAIR_RULES_VERSION = '130.10c.5'")) {
  repair = repair.replace("REPAIR_RULES_VERSION = '130.10c.5'", "REPAIR_RULES_VERSION = '130.10e.5'");
}
writeFileSync('server/immofinderRepair.ts', repair);
console.log('priceVerdict fixed');

writeFileSync('server/immofinderPipeline.ts', pipe);

const pj = JSON.parse(readFileSync('package.json', 'utf8'));
pj.patch = '130.10e';
writeFileSync('package.json', JSON.stringify(pj, null, 2) + '\n');
let lock = readFileSync('package-lock.json', 'utf8');
lock = lock.replaceAll('"patch": "130.10d"', '"patch": "130.10e"').replaceAll('"patch": "130.10c"', '"patch": "130.10e"');
writeFileSync('package-lock.json', lock);
const cl = readFileSync('CHANGELOG.md', 'utf8');
if (!cl.startsWith('## P130.10e')) {
  writeFileSync('CHANGELOG.md', `## P130.10e — Homegate listingId harvest + price band + rooms first-hit\n\n- **PROBLEM:** Chur run c8b28cdc kept=0. Homegate expansion still 0 details. Flatfox Adlerweg rejected price_ambiguous. parseRooms inflated 3.5→4.5.\n- **CHANGE:** harvest listingId/JSON and /rent|/mieten ids; softer monthly price pick; rooms use first hit. BUGFIX.\n\n` + cl);
}
console.log('P130.10e applied');
