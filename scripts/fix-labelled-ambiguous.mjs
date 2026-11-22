#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'server/immofinderRepair.ts';
let t = readFileSync(p, 'utf8');
const old = `    // Two+ labelled rents: soft-pick dominant monthly main-rent in the CH band (Adlerweg / Flatfox).\n    if (labelledDistinct.length > 1) {\n      const labBand = labelledDistinct.filter((c) => c.unit === 'month' && c.amount >= 900 && c.amount <= 4500);\n      if (labBand.length >= 1) {\n        labBand.sort((a, b) => b.amount - a.amount);\n        if (labBand.length === 1) return labBand[0];\n        if (labBand[0].amount >= labBand[1].amount * 1.08) return labBand[0];\n        if (labBand[0].amount - labBand[1].amount >= 200) return labBand[0];\n        if (labBand.length === 2) return labBand[0];\n      }\n      return null;\n    }`;
const neu = `    // Two+ explicitly labelled rents (e.g. CHF 1450 and CHF 1650 both "Miete") stay ambiguous (P129.49).\n    if (labelledDistinct.length > 1) return null;`;
if (!t.includes(old)) {
  if (t.includes('labelledDistinct.length > 1) return null')) { console.log('already strict'); process.exit(0); }
  console.error('block not found');
  process.exit(1);
}
t = t.replace(old, neu);
writeFileSync(p, t);
console.log('labelled multi-rent ambiguous restored');
