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

// Rooms gate: use provisionalSnippet (raw.provisional + evidence_kind snippet), not row.provisional.
// Verified page cards without rooms are rejected; provisional social/SERP snippets may omit rooms.
const roomsPatterns = [
  [
    /if \(!why && !row\.provisional && \(!Number\.isFinite\(rooms\) \|\| rooms <= 0\)\) why = 'rooms_unknown';/,
    "if (!why && !provisionalSnippet && (!Number.isFinite(rooms) || rooms <= 0)) why = 'rooms_unknown';",
  ],
  [
    /if \(!why && \(!Number\.isFinite\(rooms\) \|\| rooms <= 0\)\) why = 'rooms_unknown';/,
    "if (!why && !provisionalSnippet && (!Number.isFinite(rooms) || rooms <= 0)) why = 'rooms_unknown';",
  ],
];
let roomsPatched = false;
for (const [from, to] of roomsPatterns) {
  if (from.test(text)) {
    text = text.replace(from, to);
    roomsPatched = true;
    break;
  }
}
if (roomsPatched) {
  writeFileSync(target, text);
  console.log('Applied rooms_unknown provisionalSnippet exemption');
} else if (text.includes('!provisionalSnippet && (!Number.isFinite(rooms)')) {
  console.log('provisionalSnippet rooms_unknown exemption already present');
} else {
  console.log('rooms_unknown pattern not found (ok if rules already differ)');
}

// Keep package-lock patch in sync with package.json (test:project P127.11).
try {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const lockPath = join(root, 'package-lock.json');
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  const want = String(pkg.patch || '');
  if (want && (lock.patch !== want || lock.packages?.['']?.patch !== want)) {
    lock.patch = want;
    if (lock.packages && lock.packages['']) lock.packages[''].patch = want;
    writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
    console.log('Synced package-lock patch to', want);
  }
} catch (e) {
  console.warn('package-lock patch sync skipped:', e && e.message ? e.message : e);
}
