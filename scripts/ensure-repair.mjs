#!/usr/bin/env node
/** Restore server/immofinderRepair.ts from compressed payload; apply quality patches. */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'server/immofinderRepair.ts');
const dir = join(root, 'server');

const MIN_BYTES = 20000;
let text = existsSync(target) ? readFileSync(target, 'utf8') : '';
const needsRestore = text.length < MIN_BYTES
  || !text.includes('export function hardRejectReason')
  || !text.includes('export function sanitizeNewRecord');

if (needsRestore) {
  const parts = readdirSync(dir)
    .filter((f) => /^immofinderRepair\.ts\.zlib\.b64\.p\d+$/.test(f))
    .sort();
  if (!parts.length) {
    console.error('immofinderRepair payload parts missing in server/');
    process.exit(1);
  }
  const b64 = parts.map((f) => readFileSync(join(dir, f), 'utf8').trim()).join('').replace(/\s+/g, '');
  const buf = inflateSync(Buffer.from(b64, 'base64'));
  text = buf.toString('utf8');
  writeFileSync(target, text);
  console.log('Restored server/immofinderRepair.ts (%d bytes from %d parts)', buf.length, parts.length);
}

// Quality gate: require rooms on verified cards only; provisional/snippet cards may lack a parseable room count.
const before = text;
text = text.replace(
  /if \(!why && \(!Number\.isFinite\(rooms\) \|\| rooms <= 0\)\) why = 'rooms_unknown';/,
  "if (!why && !row.provisional && (!Number.isFinite(rooms) || rooms <= 0)) why = 'rooms_unknown';",
);
if (text !== before) {
  writeFileSync(target, text);
  console.log('Applied provisional exemption for rooms_unknown');
} else if (text.includes("!row.provisional && (!Number.isFinite(rooms)")) {
  console.log('provisional rooms_unknown exemption already present');
} else {
  console.log('rooms_unknown pattern not found (ok if rules already differ)');
}
