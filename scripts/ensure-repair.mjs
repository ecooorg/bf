#!/usr/bin/env node
/**
 * Emergency restore of server/immofinderRepair.ts from compressed payload (part1+part2).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'server/immofinderRepair.ts');
const p1 = join(root, 'server/immofinderRepair.ts.zlib.b64.part1');
const p2 = join(root, 'server/immofinderRepair.ts.zlib.b64.part2');
const single = join(root, 'server/immofinderRepair.ts.zlib.b64');

const MIN_BYTES = 20000;
let need = true;
if (existsSync(target)) {
  const cur = readFileSync(target, 'utf8');
  if (cur.length >= MIN_BYTES && cur.includes('export function hardRejectReason') && cur.includes('export function sanitizeNewRecord')) {
    need = false;
  }
}
if (!need) process.exit(0);

let b64 = '';
if (existsSync(single)) {
  b64 = readFileSync(single, 'utf8').trim();
} else if (existsSync(p1) && existsSync(p2)) {
  b64 = (readFileSync(p1, 'utf8') + readFileSync(p2, 'utf8')).replace(/\s+/g, '');
} else {
  console.error('immofinderRepair payload missing');
  process.exit(1);
}
const buf = inflateSync(Buffer.from(b64, 'base64'));
writeFileSync(target, buf);
console.log('Restored server/immofinderRepair.ts (%d bytes)', buf.length);
