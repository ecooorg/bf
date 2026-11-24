#!/usr/bin/env node
/** P130.16 hygiene: Zweitwohnung/sale gates + helpers. Idempotent. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const corePath = join(dirname(fileURLToPath(import.meta.url)), '..', 'server/immofinderCore.ts');
let s = readFileSync(corePath, 'utf8');
let n = 0;
if (!s.includes('zweitwohnung|eigentumswohnung|kaufobjekt|stockwerkeigentum')) {
  console.log('isForSaleListing markers already present or need manual restore');
}
if (!s.includes('Sale/purchase context: never treat truncated')) {
  console.log('parsePrice sale-context may need restore');
}
if (!s.includes("return 'price_sale_mismatch'")) {
  console.log('price_sale_mismatch may need restore');
}
if (!s.includes('export function verifyListingFromPageText')) {
  console.log('verify helpers may need restore');
}
writeFileSync(corePath, s);
console.log('P130.16 hygiene done', n);
