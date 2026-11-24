#!/usr/bin/env node
/** P130.13 P1: rooms_too_many threshold 8, soft-dedupe key helper */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;

const repairPath = join(root, 'server/immofinderRepair.ts');
if (existsSync(repairPath)) {
  let r = readFileSync(repairPath, 'utf8');
  if (r.includes("rooms >= 12) why = 'rooms_too_many'")) {
    r = r.replace("rooms >= 12) why = 'rooms_too_many'", "rooms >= 8) why = 'rooms_too_many'");
    n++;
    console.log('P1: rooms_too_many 12->8');
  }
  const r2 = r.replace(/REPAIR_RULES_VERSION = '130\.\d+\.\d+'/, "REPAIR_RULES_VERSION = '130.13.5'");
  if (r2 !== r) { r = r2; console.log('REPAIR_RULES_VERSION -> 130.13.5'); }
  writeFileSync(repairPath, r);
}

const pkgPath = join(root, 'package.json');
if (existsSync(pkgPath)) {
  let p = readFileSync(pkgPath, 'utf8');
  if (p.includes('"patch": "130.12"')) {
    p = p.replace('"patch": "130.12"', '"patch": "130.13"');
    writeFileSync(pkgPath, p);
    console.log('package patch 130.13');
    n++;
  }
}

console.log('P1 patches applied:', n);
