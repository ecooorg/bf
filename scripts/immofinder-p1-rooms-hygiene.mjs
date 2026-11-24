#!/usr/bin/env node
/** P130.13 P1: rooms_too_many threshold 8 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repairPath = join(root, 'server/immofinderRepair.ts');
if (!existsSync(repairPath)) { console.log('no repair'); process.exit(0); }
let r = readFileSync(repairPath, 'utf8');
let n = 0;
// Match both quote styles
const patterns = [
  ["rooms >= 12) why = 'rooms_too_many'", "rooms >= 8) why = 'rooms_too_many'"],
  ['rooms >= 12) why = "rooms_too_many"', 'rooms >= 8) why = "rooms_too_many"'],
  ['rooms >= 12)', 'rooms >= 8)'],
];
for (const [from, to] of patterns) {
  if (r.includes(from) && from.includes('12')) {
    r = r.replace(from, to);
    n++;
    console.log('P1 applied:', from, '->', to);
    break;
  }
}
r = r.replace(/REPAIR_RULES_VERSION = '130\.\d+\.\d+'/, "REPAIR_RULES_VERSION = '130.13.5'");
const pkgPath = join(root, 'package.json');
if (existsSync(pkgPath)) {
  let p = readFileSync(pkgPath, 'utf8');
  if (/"patch":\s*"130\.12"/.test(p)) {
    p = p.replace(/"patch":\s*"130\.12"/, '"patch": "130.13"');
    writeFileSync(pkgPath, p);
    console.log('package patch 130.13');
    n++;
  }
}
writeFileSync(repairPath, r);
console.log('P1 done, patches', n, 'rooms8', r.includes('rooms >= 8)'));
