#!/usr/bin/env node
/**
 * Emergency restore of server/immofinderRepair.ts from compressed payload.
 * Runs before typecheck/build when the source is missing or truncated.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'server/immofinderRepair.ts');
const payload = join(root, 'server/immofinderRepair.ts.zlib.b64');

const MIN_BYTES = 20000;
let need = true;
if (existsSync(target)) {
  const cur = readFileSync(target, 'utf8');
  if (cur.length >= MIN_BYTES && cur.includes('export function hardRejectReason') && cur.includes('export function sanitizeNewRecord')) {
    need = false;
  }
}
if (!need) {
  process.exit(0);
}
if (!existsSync(payload)) {
  console.error('immofinderRepair payload missing:', payload);
  process.exit(1);
}
const b64 = readFileSync(payload, 'utf8').trim();
const buf = inflateSync(Buffer.from(b64, 'base64'));
writeFileSync(target, buf);
console.log('Restored server/immofinderRepair.ts (%d bytes)', buf.length);
