#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'server/immofinderPipeline.ts';
let t = readFileSync(p, 'utf8');
const old = 'const price = priceFromEvidence(evidenceText, ex.priceQuote) || resolveListingPrice(priceHay, ex.priceQuote);';
const neu = 'let price = priceFromEvidence(evidenceText, ex.priceQuote) || resolveListingPrice(priceHay, ex.priceQuote);';
if (!t.includes(old)) {
  if (t.includes(neu)) { console.log('already fixed'); process.exit(0); }
  console.error('const price line not found');
  process.exit(1);
}
t = t.replace(old, neu);
writeFileSync(p, t);
console.log('price const -> let');
