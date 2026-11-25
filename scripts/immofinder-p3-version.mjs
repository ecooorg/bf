#!/usr/bin/env node
/** Keep package.json as the sole patch-version authority and derive the repair-rule stamp from it. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = join(root, 'package.json');
const patch = String(JSON.parse(readFileSync(packagePath, 'utf8')).patch || '');
if (!/^\\d+\.\d+[a-z]?$/.test(patch)) throw new Error('Invalid package patch version for repair-rule stamp');
const repairVersion = `${patch}.5`;
const repairPath = join(root, 'server/immofinderRepair.ts');
if (existsSync(repairPath)) {
  let r = readFileSync(repairPath, 'utf8');
  r = r.replace(/REPAIR_RULES_VERSION = '[^']+'/, `REPAIR_RULES_VERSION = '${repairVersion}'`);
  writeFileSync(repairPath, r);
  console.log(`REPAIR ${repairVersion}`);
}
console.log('P3 done; package patch preserved');
