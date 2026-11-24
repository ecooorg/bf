#!/usr/bin/env node
/** Emergency restore of server/immofinderRepair.ts from split compressed payload. */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'server/immofinderRepair.ts');
const dir = join(root, 'server');

const MIN_BYTES = 20000;
if (existsSync(target)) {
  const cur = readFileSync(target, 'utf8');
  if (cur.length >= MIN_BYTES && cur.includes('export function hardRejectReason') && cur.includes('export function sanitizeNewRecord')) {
    process.exit(0);
  }
}

const parts = readdirSync(dir)
  .filter((f) => /^immofinderRepair\.ts\.zlib\.b64\.p\d+$/.test(f))
  .sort();
if (!parts.length) {
  console.error('immofinderRepair payload parts missing in server/');
  process.exit(1);
}
const b64 = parts.map((f) => readFileSync(join(dir, f), 'utf8').trim()).join('').replace(/\s+/g, '');
const buf = inflateSync(Buffer.from(b64, 'base64'));
writeFileSync(target, buf);
console.log('Restored server/immofinderRepair.ts (%d bytes from %d parts)', buf.length, parts.length);
