#!/usr/bin/env node
/** Fix: Tutti provisional rent=7000 was Swiss PLZ from "7000, Chur". */
import { readFileSync, writeFileSync } from 'node:fs';
function must(c, m) { if (!c) { console.error(m); process.exit(1); } }

let core = readFileSync('server/immofinderCore.ts', 'utf8');
const marker = `      // Bare 2026 with no currency and no month/night word — skip\n      if (!h.currency && unit === 'unknown') continue;\n    }\n    const cand: ParsedPrice = { amount: h.amount, unit, monthlyChf, quote: h.quote };`;
must(core.includes(marker), 'parsePrice marker not found');
if (!core.includes('Swiss PLZ (4-digit')) {
  core = core.replace(marker, `      // Bare 2026 with no currency and no month/night word — skip\n      if (!h.currency && unit === 'unknown') continue;\n    }\n    // Swiss PLZ (4-digit 1000–9999) before a place name is not rent — e.g. "7000, Chur".\n    if (h.amount >= 1000 && h.amount <= 9999 && Number.isInteger(h.amount)) {\n      const after = t.slice(h.idx + h.quote.length, h.idx + h.quote.length + 48);\n      const before = t.slice(Math.max(0, h.idx - 20), h.idx);\n      if (/^\\s*[,;./]?\\s*[A-ZÄÖÜ][A-Za-zÄÖÜäöüß' -]{2,}/.test(after) || /\\b(PLZ|postleitzahl)\\b/i.test(before + after)) {\n        if (!h.currency) continue;\n        if (!/monat|mtl|miete|rent|\\/mo/i.test(h.quote + after.slice(0, 20))) continue;\n      }\n    }\n    // HTTP / fetch status codes without currency are not rent.\n    if (!h.currency && [200, 403, 404, 429, 500, 502, 503].includes(h.amount)) continue;\n    // Floor area "60m2" is not rent.\n    {\n      const tail = t.slice(h.idx + Math.max(0, h.quote.length - 4), h.idx + h.quote.length + 10);\n      if (/\\d\\s*m(?:2|²)\\b/i.test(tail)) continue;\n    }\n    const cand: ParsedPrice = { amount: h.amount, unit, monthlyChf, quote: h.quote };`);
  console.log('parsePrice PLZ/status/m2 guards added');
}
writeFileSync('server/immofinderCore.ts', core);

let pipe = readFileSync('server/immofinderPipeline.ts', 'utf8');
const oldQ = `      const qualityReason = qualityRejectReason(quality, price, listedAt, seeker, !!(phone0 || email0), now());\n      const qReason = snippetEvidence ? null : qualityReason;\n      if (snippetEvidence && qualityReason) ex.signals.push('provisional_quality_gate:' + qualityReason);`;
const newQ = `      const qualityReason = qualityRejectReason(quality, price, listedAt, seeker, !!(phone0 || email0), now());\n      // Provisional snippet must not keep a price that would fail the real gate (PLZ/error codes as rent).\n      if (snippetEvidence && (qualityReason === 'price_above_max' || qualityReason === 'price_not_monthly')) {\n        price = null;\n        ex.priceQuote = null;\n        if (qualityReason) ex.signals.push('provisional_price_cleared:' + qualityReason);\n      }\n      const qReason = snippetEvidence ? null : qualityReason;\n      if (snippetEvidence && qualityReason) ex.signals.push('provisional_quality_gate:' + qualityReason);`;
must(pipe.includes(oldQ), 'qualityReason block not found');
pipe = pipe.replace(oldQ, newQ);
writeFileSync('server/immofinderPipeline.ts', pipe);
console.log('pipeline provisional price clear added');

const pj = JSON.parse(readFileSync('package.json', 'utf8'));
pj.patch = '130.10h';
writeFileSync('package.json', JSON.stringify(pj, null, 2) + '\n');
let lock = readFileSync('package-lock.json', 'utf8');
for (const p of ['130.10g', '130.10f', '130.10e']) lock = lock.replaceAll(`"patch": "${p}"`, '"patch": "130.10h"');
writeFileSync('package-lock.json', lock);
let repair = readFileSync('server/immofinderRepair.ts', 'utf8');
for (const v of ['130.10g.5', '130.10f.5']) {
  if (repair.includes(`REPAIR_RULES_VERSION = '${v}'`)) {
    repair = repair.replace(`REPAIR_RULES_VERSION = '${v}'`, "REPAIR_RULES_VERSION = '130.10h.5'");
    writeFileSync('server/immofinderRepair.ts', repair);
    break;
  }
}
const cl = readFileSync('CHANGELOG.md', 'utf8');
if (!cl.startsWith('## P130.10h')) {
  writeFileSync('CHANGELOG.md', `## P130.10h — PLZ/status/m2 not rent + provisional price clear\n\n- **PROBLEM:** Tutti Chur provisional keep stored rent=7000 from snippet "7000, Chur" (Swiss PLZ). User reported index/error codes in price.\n- **CHANGE:** parsePrice skips PLZ+city, HTTP status, m2; provisional clears price on price_above_max. BUGFIX.\n\n` + cl);
}
console.log('P130.10h applied');
