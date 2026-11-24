#!/usr/bin/env node
/** P130.12 P0 feed hygiene — restore core from payload parts if needed, then ensure markers. */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'server');
const corePath = join(dir, 'immofinderCore.ts');

function restoreCoreFromParts() {
  const parts = readdirSync(dir).filter((f) => /^immofinderCore\.ts\.zlib\.b64\.p\d+$/.test(f)).sort();
  if (!parts.length) {
    console.log('no core payload parts');
    return false;
  }
  const b64 = parts.map((f) => readFileSync(join(dir, f), 'utf8').trim()).join('').replace(/\s+/g, '');
  try {
    const buf = inflateSync(Buffer.from(b64, 'base64'));
    const text = buf.toString('utf8');
    if (!text.includes('export function nonListingReason') || text.length < 20000) {
      console.error('core payload inflate produced invalid file');
      return false;
    }
    writeFileSync(corePath, text);
    console.log('Restored server/immofinderCore.ts (%d bytes from %d parts)', buf.length, parts.length);
    return true;
  } catch (e) {
    console.error('core payload restore failed', e.message);
    return false;
  }
}

let cur = existsSync(corePath) ? readFileSync(corePath, 'utf8') : '';
const needRestore = cur.length < 20000 || !cur.includes('clearSerpTitle') || !cur.includes('kaufpreis');
if (needRestore) {
  if (!restoreCoreFromParts()) process.exit(1);
} else {
  console.log('immofinderCore.ts already has P0 markers (%d bytes)', cur.length);
}

// REPAIR version
const repairPath = join(dir, 'immofinderRepair.ts');
if (existsSync(repairPath)) {
  let r = readFileSync(repairPath, 'utf8');
  const r2 = r.replace(/REPAIR_RULES_VERSION = '130\.\d+\.\d+'/, "REPAIR_RULES_VERSION = '130.12.5'");
  if (r2 !== r) {
    writeFileSync(repairPath, r2);
    console.log('REPAIR_RULES_VERSION -> 130.12.5');
  }
}
