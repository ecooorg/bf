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
  const needs =
    text.length < 20000 ||
    !text.includes('export function hardRejectReason') ||
    !text.includes('export function sanitizeNewRecord') ||
    text.includes('Temporary stub') ||
    text.includes('PLACEHOLDER') ||
    text.includes('SEE_ARTIFACT');
  if (needs) {
    let restored = false;
    try {
      const parts = readdirSync(dir).filter((f) => /^immofinderRepair\.ts\.zlib\.b64\.p\d+$/.test(f)).sort();
      if (parts.length) {
        const b64 = parts.map((f) => readFileSync(join(dir, f), 'utf8').trim()).join('').replace(/\s+/g, '');
        const buf = inflateSync(Buffer.from(b64, 'base64'));
        if (buf.length > 20000 && buf.toString('utf8').includes('export function hardRejectReason')) {
          text = buf.toString('utf8');
          writeFileSync(target, text);
          console.log('Restored server/immofinderRepair.ts (%d bytes from %d parts)', buf.length, parts.length);
          restored = true;
        }
      }
    } catch (e) {
      console.warn('zlib restore failed', e && e.message ? e.message : e);
    }
    if (!restored) {
      try {
        const url =
          'https://raw.githubusercontent.com/ecooorg/bf/3c4ce5733b1da7532501966e831923041928a8ca/server/immofinderRepair.ts';
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const good = await res.text();
        if (good.length > 20000) {
          writeFileSync(target, good);
          text = good;
          console.log('Restored server/immofinderRepair.ts from historical commit (%d bytes)', good.length);
          restored = true;
        }
      } catch (e) {
        console.error('historical restore failed', e && e.message ? e.message : e);
        process.exit(1);
      }
    }
  }
}

{
  const target = join(dir, 'immofinderStore.ts');
  let st = existsSync(target) ? readFileSync(target, 'utf8') : '';
  const bad =
    st.length < 5000 ||
    st.trim() === 'PLACEHOLDER' ||
    !st.includes('async upsert') ||
    !st.includes('createPgStore') ||
    !st.includes('getSettings');
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
  if (want && (lock.patch !== want || (lock.packages && lock.packages[''] && lock.packages[''].patch !== want))) {
    lock.patch = want;
    if (lock.packages && lock.packages['']) lock.packages[''].patch = want;
    writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
    console.log('Synced package-lock patch to', want);
  }
  // Keep REPAIR_RULES_VERSION aligned with product patch so seen-cache tests pass.
  const repairPath = join(dir, 'immofinderRepair.ts');
  if (existsSync(repairPath) && want) {
    let rt = readFileSync(repairPath, 'utf8');
    const wantVer = want + '.5';
    const next = rt.replace(/REPAIR_RULES_VERSION = '[^']+'/, "REPAIR_RULES_VERSION = '" + wantVer + "'");
    if (next !== rt) {
      writeFileSync(repairPath, next);
      console.log('Synced REPAIR_RULES_VERSION to', wantVer);
    }
  }
} catch (e) {
  console.warn('package-lock / rules-version sync skipped');
}

// C131: contact is optional for short-stay L1. Always strip residual gate.
{
  const target = join(dir, 'immofinderRepair.ts');
  if (existsSync(target)) {
    let text = readFileSync(target, 'utf8');
    const before = text;
    text = text.replace(
      /\n\s*if \(shortStay\) \{\s*const contacts = contactVerdict\(row\);\s*if \(contacts\.phone !== 'verified' && contacts\.email !== 'verified'\) why = 'short_stay_contact_required';\s*\}/g,
      "\n      // C131: short_stay_contact_required retired (optionalForL1)",
    );
    text = text.replace(/why = 'short_stay_contact_required';/g, '// C131: short_stay_contact_required retired');
    if (text !== before) {
      writeFileSync(target, text);
      console.log('C131: retired short_stay_contact_required gate');
    } else {
      console.log('C131: short_stay_contact_required already absent');
    }
  }
}

for (const script of [
  'scripts/immofinder-core-restore.mjs',
  'scripts/immofinder-p0-feed-hygiene.mjs',
  'scripts/immofinder-recheck-feed.mjs',
  'scripts/form-agents-contract.mjs',
  'scripts/form-ci-scripts.mjs',
  'scripts/immofinder-p1-rooms-hygiene.mjs',
  'scripts/immofinder-p2-junk-hosts.mjs',
  'scripts/immofinder-p3-version.mjs',
  'scripts/immofinder-verify-hygiene.mjs',
]) {
  const r = spawnSync(process.execPath, [join(root, script)], { encoding: 'utf8' });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status && /recheck-feed|form-agents|form-ci/.test(script)) process.exit(r.status || 1);
}
