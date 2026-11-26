#!/usr/bin/env node
/** Restore server/immofinderRepair.ts and immofinderStore.ts from payloads; apply quality patches. */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'server');

{
  const target = join(dir, 'immofinderRepair.ts');
  let text = existsSync(target) ? readFileSync(target, 'utf8') : '';
  const needs = text.length < 20000 || !text.includes('export function hardRejectReason') || !text.includes('export function sanitizeNewRecord');
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
      console.log('Restored server/immofinderStore.ts (%d bytes)', full.length);
    } else {
      console.error('immofinderStore parts missing');
      process.exit(1);
    }
  } else {
    console.log('immofinderStore.ts ok (%d bytes)', st.length);
  }
}

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
  console.warn('package-lock patch sync skipped');
}

// C131: contact is optional for short-stay L1 (agents-contract seasonal admission).
{
  const target = join(dir, 'immofinderRepair.ts');
  if (existsSync(target)) {
    let text = readFileSync(target, 'utf8');
    const needle = `if (shortStay) {\n        const contacts = contactVerdict(row);\n        if (contacts.phone !== 'verified' && contacts.email !== 'verified') why = 'short_stay_contact_required';\n      }`;
    if (text.includes(needle)) {
      text = text.replace(needle, '// C131: short_stay_contact_required retired (optionalForL1)');
      writeFileSync(target, text);
      console.log('C131: retired short_stay_contact_required gate');
    } else if (text.includes("why = 'short_stay_contact_required'")) {
      text = text.replace(
        /if \(shortStay\) \{[\s\S]*?why = 'short_stay_contact_required';\s*\}/,
        '// C131: short_stay_contact_required retired (optionalForL1)',
      );
      writeFileSync(target, text);
      console.log('C131: retired short_stay_contact_required gate (regex)');
    } else {
      console.log('C131: short_stay_contact_required already absent');
    }
  }
}

for (const script of [
  'scripts/immofinder-core-restore.mjs',
  'scripts/immofinder-p0-feed-hygiene.mjs',
  'scripts/immofinder-recheck-feed.mjs',
  'scripts/fix-agents-contract.mjs',
  'scripts/fix-ci-scripts.mjs',
  'scripts/immofinder-p1-rooms-hygiene.mjs',
  'scripts/immofinder-p2-junk-hosts.mjs',
  'scripts/immofinder-p3-version.mjs',
  'scripts/immofinder-verify-hygiene.mjs',
]) {
  const r = spawnSync(process.execPath, [join(root, script)], { encoding: 'utf8' });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status && /recheck-feed|fix-agents|fix-ci/.test(script)) process.exit(r.status || 1);
}
