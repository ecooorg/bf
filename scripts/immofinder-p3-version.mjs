#!/usr/bin/env node
/** P130.16 P3: package 130.16 + REPAIR 130.16.5 stamp */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(root, 'package.json');
if (existsSync(pkgPath)) {
  let p = readFileSync(pkgPath, 'utf8');
  p = p.replace(/"patch":\s*"130\.\d+"/, '"patch": "130.16"');
  writeFileSync(pkgPath, p);
  console.log('package patch 130.16');
}
const repairPath = join(root, 'server/immofinderRepair.ts');
if (existsSync(repairPath)) {
  let r = readFileSync(repairPath, 'utf8');
  r = r.replace(/REPAIR_RULES_VERSION = '130\.\d+\.\d+'/, "REPAIR_RULES_VERSION = '130.16.5'");
  writeFileSync(repairPath, r);
  console.log('REPAIR 130.16.5');
}
console.log('P3 done');
