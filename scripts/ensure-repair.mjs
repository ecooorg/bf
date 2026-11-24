#!/usr/bin/env node
/** Restore server/immofinderRepair.ts and immofinderStore.ts from payloads; apply quality patches. */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'server');

// --- Repair module ---
{
  const target = join(dir, 'immofinderRepair.ts');
  let text = existsSync(target) ? readFileSync(target, 'utf8') : '';
  const needs = text.length < 20000
    || !text.includes('export function hardRejectReason')
    || !text.includes('export function sanitizeNewRecord');
  if (needs) {
    const parts = readdirSync(dir).filter((f) => /^immofinderRepair\.ts\.zlib\.b64\.p\d+$/.test(f)).sort();
    if (!parts.length) { console.error('immofinderRepair payload parts missing'); process.exit(1); }
    const b64 = parts.map((f) => readFileSync(join(dir, f), 'utf8').trim()).join('').replace(/\s+/g, '');
    const buf = inflateSync(Buffer.from(b64, 'base64'));
    text = buf.toString('utf8');
    writeFileSync(target, text);
    console.log('Restored server/immofinderRepair.ts (%d bytes from %d parts)', buf.length, parts.length);
  }
}

// --- Store module (PLACEHOLDER / truncated recovery) ---
{
  const target = join(dir, 'immofinderStore.ts');
  let st = existsSync(target) ? readFileSync(target, 'utf8') : '';
  const bad = st.length < 5000 || st.trim() === 'PLACEHOLDER' || !st.includes('async upsert') || !st.includes('createPgStore') || !st.includes('getSettings');
  if (bad) {
    const names = ['part0', 'part1', 'part2', 'part3a', 'part3b'];
    const paths = names.map((n) => join(dir, `immofinderStore.ts.${n}`));
    if (paths.every((p) => existsSync(p))) {
      const full = paths.map((p) => readFileSync(p, 'utf8')).join('');
      writeFileSync(target, full);
      console.log('Restored server/immofinderStore.ts from part0+1+2+3a+3b (%d bytes)', full.length);
    } else {
      console.error('immofinderStore parts missing:', names.filter((_, i) => !existsSync(paths[i])));
      process.exit(1);
    }
  } else {
    console.log('immofinderStore.ts ok (%d bytes)', st.length);
  }
}

// Rooms gate on repair
{
  const target = join(dir, 'immofinderRepair.ts');
  let text = readFileSync(target, 'utf8');
  const roomsPatterns = [
    [/if \(!why && !row\.provisional && \(!Number\.isFinite\(rooms\) \|\| rooms <= 0\)\) why = 'rooms_unknown';/,
     "if (!why && !provisionalSnippet && (!Number.isFinite(rooms) || rooms <= 0)) why = 'rooms_unknown';"],
    [/if \(!why && \(!Number\.isFinite\(rooms\) \|\| rooms <= 0\)\) why = 'rooms_unknown';/,
     "if (!why && !provisionalSnippet && (!Number.isFinite(rooms) || rooms <= 0)) why = 'rooms_unknown';"],
  ];
  let roomsPatched = false;
  for (const [from, to] of roomsPatterns) {
    if (from.test(text)) { text = text.replace(from, to); roomsPatched = true; break; }
  }
  if (roomsPatched) {
    writeFileSync(target, text);
    console.log('Applied rooms_unknown provisionalSnippet exemption');
  } else if (text.includes('!provisionalSnippet && (!Number.isFinite(rooms)')) {
    console.log('provisionalSnippet rooms_unknown exemption already present');
  } else {
    console.log('rooms_unknown pattern not found (ok if rules already differ)');
  }
}

// package-lock patch sync
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

// P130.12 P0 feed hygiene (SERP Homegate, hotels, FB group roots, Kaufpreis, year-as-price)
{
  const r = spawnSync(process.execPath, [join(root, 'scripts/immofinder-p0-feed-hygiene.mjs')], { encoding: 'utf8' });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status) process.exit(r.status || 1);
}

// P130.11 single Recheck feed (idempotent UI + routes merge)
{
  const r = spawnSync(process.execPath, [join(root, 'scripts/immofinder-recheck-feed.mjs')], { encoding: 'utf8' });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status) process.exit(r.status || 1);
}

// agents-contract: restore + Recheck feed assertion
{
  const r = spawnSync(process.execPath, [join(root, 'scripts/fix-agents-contract.mjs')], { encoding: 'utf8' });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status) process.exit(r.status || 1);
}

// package.json critical scripts + REPAIR_RULES_VERSION
{
  const r = spawnSync(process.execPath, [join(root, 'scripts/fix-ci-scripts.mjs')], { encoding: 'utf8' });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status) process.exit(r.status || 1);
}
