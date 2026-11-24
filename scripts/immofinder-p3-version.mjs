#!/usr/bin/env node
/** Keep package.json as the sole patch-version authority; preserve the P130.16 repair-rule stamp. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repairPath = join(root, 'server/immofinderRepair.ts');
if (existsSync(repairPath)) {
  let r = readFileSync(repairPath, 'utf8');
  r = r.replace(/REPAIR_RULES_VERSION = '130\.\d+\.\d+'/, "REPAIR_RULES_VERSION = '130.16.5'");
  writeFileSync(repairPath, r);
  console.log('REPAIR 130.16.5');
}
console.log('P3 done; package patch preserved');
