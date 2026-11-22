#!/usr/bin/env node
/**
 * Product keep-rate fixes after Chur run f6dfc413 (kept=0):
 * - priceVerdict: when multiple labelled rents, still soft-pick monthly band (Adlerweg)
 * - Homegate expansion: harvest 400xxxxxxx style listing ids from SPA HTML
 * - hardReject: if rentCandidates empty but LLM price quote parses, do not price_not_confirmed
 */
import { readFileSync, writeFileSync } from 'node:fs';

function must(c, m) { if (!c) { console.error(m); process.exit(1); } }

let repair = readFileSync('server/immofinderRepair.ts', 'utf8');
const oldLab = `    const labelledDistinct = [...new Map(labelled.map((c) => [\`\${c.amount}:\${c.unit}\`, c])).values()];\n    if (labelledDistinct.length === 1) return labelledDistinct[0];\n    // Two+ explicitly labelled rents (e.g. CHF 1450 and CHF 1650 both "Miete") stay ambiguous.\n    if (labelledDistinct.length > 1) return null;`;
const newLab = `    const labelledDistinct = [...new Map(labelled.map((c) => [\`\${c.amount}:\${c.unit}\`, c])).values()];\n    if (labelledDistinct.length === 1) return labelledDistinct[0];\n    // Two+ labelled rents: still prefer the dominant monthly main-rent in the CH band.\n    if (labelledDistinct.length > 1) {\n      const labBand = labelledDistinct.filter((c) => c.unit === 'month' && c.amount >= 900 && c.amount <= 4500);\n      if (labBand.length >= 1) {\n        labBand.sort((a, b) => b.amount - a.amount);\n        if (labBand.length === 1) return labBand[0];\n        if (labBand[0].amount >= labBand[1].amount * 1.08) return labBand[0];\n        if (labBand[0].amount - labBand[1].amount >= 200) return labBand[0];\n        if (labBand.length === 2) return labBand[0];\n      }\n      return null;\n    }`;
must(repair.includes('if (labelledDistinct.length > 1) return null;'), 'labelledDistinct early null not found');
// simpler replace of just the early null line + comment
const oldShort = `    // Two+ explicitly labelled rents (e.g. CHF 1450 and CHF 1650 both "Miete") stay ambiguous.\n    if (labelledDistinct.length > 1) return null;`;
const newShort = `    // Two+ labelled rents: soft-pick dominant monthly main-rent in the CH band (Adlerweg / Flatfox).\n    if (labelledDistinct.length > 1) {\n      const labBand = labelledDistinct.filter((c) => c.unit === 'month' && c.amount >= 900 && c.amount <= 4500);\n      if (labBand.length >= 1) {\n        labBand.sort((a, b) => b.amount - a.amount);\n        if (labBand.length === 1) return labBand[0];\n        if (labBand[0].amount >= labBand[1].amount * 1.08) return labBand[0];\n        if (labBand[0].amount - labBand[1].amount >= 200) return labBand[0];\n        if (labBand.length === 2) return labBand[0];\n      }\n      return null;\n    }`;
must(repair.includes(oldShort), 'labelled short block not found');
repair = repair.replace(oldShort, newShort);

const oldConf = `    if (rentCandidates.length === 0 && hasStoredPrice) why = 'price_not_confirmed_on_detail_page';`;
const newConf = `    if (rentCandidates.length === 0 && hasStoredPrice) {\n      const quote = String(raw.price_quote || obj(raw.price).quote || '');\n      const fromQuote = quote ? (resolveListingPrice(quote, null) || parsePrice(quote + '\\n' + pageEvidence.slice(0, 2000))) : null;\n      if (!fromQuote || !fromQuote.amount) why = 'price_not_confirmed_on_detail_page';\n    }`;
must(repair.includes(oldConf), 'price_not_confirmed block not found');
repair = repair.replace(oldConf, newConf);

if (repair.includes("REPAIR_RULES_VERSION = '130.10e.5'")) {
  repair = repair.replace("REPAIR_RULES_VERSION = '130.10e.5'", "REPAIR_RULES_VERSION = '130.10f.5'");
} else if (repair.includes("REPAIR_RULES_VERSION = '130.10d.5'")) {
  repair = repair.replace("REPAIR_RULES_VERSION = '130.10d.5'", "REPAIR_RULES_VERSION = '130.10f.5'");
}
writeFileSync('server/immofinderRepair.ts', repair);
console.log('repair patched');

let pipe = readFileSync('server/immofinderPipeline.ts', 'utf8');
if (!pipe.includes('homegate_400_id_harvest')) {
  const alt = `fromBare.push(origin + '/rent/' + id);\n        }`;
  if (pipe.includes(alt)) {
    pipe = pipe.replace(alt, alt + `\n        // homegate_400_id_harvest: classic Homegate numeric ids often appear as 400xxxxxxx in SPA payloads\n        const hgIdRe = /\\b(400\\d{6,9})\\b/g;\n        let hg: RegExpExecArray | null;\n        while ((hg = hgIdRe.exec(listPg.body)) !== null) {\n          const origin2 = (() => { try { return new URL(listPg.finalUrl || it.url).origin; } catch { return 'https://www.homegate.ch'; } })();\n          fromBare.push(origin2 + '/mieten/' + hg[1]);\n        }`);
    console.log('homegate 400 id harvest added');
  } else {
    console.warn('fromBare rent push not found');
  }
}
writeFileSync('server/immofinderPipeline.ts', pipe);

const pj = JSON.parse(readFileSync('package.json', 'utf8'));
pj.patch = '130.10f';
writeFileSync('package.json', JSON.stringify(pj, null, 2) + '\n');
let lock = readFileSync('package-lock.json', 'utf8');
for (const p of ['130.10e', '130.10d', '130.10c']) {
  lock = lock.replaceAll(`"patch": "${p}"`, '"patch": "130.10f"');
}
writeFileSync('package-lock.json', lock);
const cl = readFileSync('CHANGELOG.md', 'utf8');
if (!cl.startsWith('## P130.10f')) {
  writeFileSync('CHANGELOG.md', `## P130.10f — labelled multi-rent soft pick + Homegate 400-ids + quote confirm\n\n- **PROBLEM:** Chur run f6dfc413 kept=0. Adlerweg price_ambiguous; Calvenweg price_not_confirmed; Homegate expansion 0.\n- **CHANGE:** soft-pick among labelled monthly band; accept parseable price_quote; harvest Homegate 400xxxxxxx ids. BUGFIX.\n\n` + cl);
}
console.log('P130.10f applied');
