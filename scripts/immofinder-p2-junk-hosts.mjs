#!/usr/bin/env node
/** P130.14 P2: expand junk aggregator hosts */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const core = join(dirname(fileURLToPath(import.meta.url)), '../server/immofinderCore.ts');
let t = readFileSync(core, 'utf8');
let n = 0;
const from = '(moving24\\.ch|umzugsfirma-buchen\\.ch|rentumo\\.ch|umzug[^/]*\\.ch)$';
const to = '(moving24\\.ch|umzugsfirma-buchen\\.ch|rentumo\\.ch|umzug[^/]*\\.ch|rentola\\.ch|trovit\\.[a-z]+|feriwa\\.ch)$';
if (t.includes(from.replace(/\\\\/g, '\\')) || t.includes('(moving24\\.ch|umzugsfirma-buchen\\.ch|rentumo\\.ch|umzug[^/]*\\.ch)$')) {
  // try both escaped forms in source
}
// Direct match on file content as stored (single backslash before dots in the TS source string)
const from2 = '(moving24\\.ch|umzugsfirma-buchen\\.ch|rentumo\\.ch|umzug[^/]*\\.ch)$';
if (!t.includes('feriwa')) {
  const idx = t.indexOf('moving24\\.ch|umzugsfirma-buchen\\.ch|rentumo\\.ch|umzug');
  if (idx >= 0) {
    const end = t.indexOf(')$', idx);
    if (end > idx && end - idx < 120) {
      const old = t.slice(idx, end + 2);
      const neu = 'moving24\\.ch|umzugsfirma-buchen\\.ch|rentumo\\.ch|umzug[^/]*\\.ch|rentola\\.ch|trovit\\.[a-z]+|feriwa\\.ch)$';
      t = t.slice(0, idx) + neu + t.slice(end + 2);
      n++;
      console.log('P2: junk hosts expanded');
    }
  }
}
if (n) writeFileSync(core, t);
console.log('P2 patches', n);
