#!/usr/bin/env node
/** P130.14 P2: expand junk aggregator hosts */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const core = join(dirname(fileURLToPath(import.meta.url)), '../server/immofinderCore.ts');
let t = readFileSync(core, 'utf8');
let n = 0;
if (!t.includes('feriwa')) {
  const marker = 'moving24\\.ch|umzugsfirma-buchen\\.ch|rentumo\\.ch|umzug';
  const idx = t.indexOf(marker);
  if (idx >= 0) {
    const end = t.indexOf(')$', idx);
    if (end > idx && end - idx < 150) {
      const neu = 'moving24\\.ch|umzugsfirma-buchen\\.ch|rentumo\\.ch|umzug[^/]*\\.ch|rentola\\.ch|trovit\\.[a-z]+|feriwa\\.ch)$';
      t = t.slice(0, idx) + neu + t.slice(end + 2);
      n++;
      console.log('P2: junk hosts expanded');
    }
  }
}
if (n) writeFileSync(core, t);
console.log('P2 patches', n);
