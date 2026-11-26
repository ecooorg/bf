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
  const needs = text.length < 20000 || !text.includes('export function hardRejectReason') || !text.includes('export function sanitizeNewRecord') || text.includes('PLACEHOLDER') || text.includes('SEE_ARTIFACT') || text.includes('Temporary stub');
  if (needs) {
    // Prefer historical known-good body (post-gate retirement) when local payload is corrupt/truncated.
    try {
      const histUrl = 'https://raw.githubusercontent.com/ecooorg/bf/3c4ce5733b1da7532501966e831923041928a8ca/server/immofinderRepair.ts';
      const res = await (async () => {
        const r = await fetch(histUrl);
        if (!r.ok) throw new Error('hist fetch ' + r.status);
        return await r.text();
      })();
      if (res && res.length > 20000 && res.includes('export function hardRejectReason') && res.includes('export function sanitizeNewRecord')) {
        writeFileSync(target, res);
        text = res;
        console.log('Restored server/immofinderRepair.ts from historical commit (%d bytes)', res.length);
      }
    } catch (e) {
      console.warn('Historical repair fetch failed:', String(e?.message || e).slice(0, 120));
    }
  }
  text = existsSync(target) ? readFileSync(target, 'utf8') : '';
  const stillNeeds = text.length < 20000 || !text.includes('export function hardRejectReason') || !text.includes('export function sanitizeNewRecord') || text.includes('PLACEHOLDER') || text.includes('SEE_ARTIFACT') || text.includes('Temporary stub');
  if (stillNeeds) {
    const parts = readdirSync(dir).filter((f) => /^immofinderRepair\.ts\.zlib\.b64\.p\d+$/.test(f)).sort();
    if (!parts.length) { console.error('immofinderRepair payload parts missing'); process.exit(1); }
    try {
      const b64 = parts.map((f) => readFileSync(join(dir, f), 'utf8').trim()).join('').replace(/\s+/g, '');
      const buf = inflateSync(Buffer.from(b64, 'base64'));
      text = buf.toString('utf8');
      writeFileSync(target, text);
      console.log('Restored server/immofinderRepair.ts (%d bytes from %d parts)', buf.length, parts.length);
    } catch (e) {
      console.error('immofinderRepair inflate failed:', String(e?.message || e).slice(0, 200));
      if (text.length < 1000) process.exit(1);
      console.warn('Keeping existing repair body despite inflate failure');
    }
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
  // Keep REPAIR_RULES_VERSION aligned with product patch so seen-cache tests pass.
  const rt = join(dir, 'immofinderRepair.ts');
  if (existsSync(rt) && want) {
    let text = readFileSync(rt, 'utf8');
    const wantVer = want + '.5';
    const next = text.replace(/REPAIR_RULES_VERSION = '[^']+'/, "REPAIR_RULES_VERSION = '" + wantVer + "'");
    if (next !== text) {
      writeFileSync(rt, next);
      console.log('Synced REPAIR_RULES_VERSION to', wantVer);
    }
  }
} catch (e) {
  console.warn('package-lock / version sync skipped');
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
    // Soft price ambiguity: never hard-reject on optional price
    const hardNeedle = "if (pv.status === 'suspect') why = pv.why.startsWith('price_') ? pv.why : `price_${pv.why}`;";
    if (text.includes(hardNeedle)) {
      text = text.replace(
        hardNeedle,
        `if (pv.status === 'suspect') {
      // C131: price optionalForL1 — ambiguity is soft, never hide a verified listing
      if (pv.why !== 'price_ambiguous_on_detail_page' && !/ambiguous/i.test(String(pv.why || ''))) {
        why = pv.why.startsWith('price_') ? pv.why : \`price_\${pv.why}\`;
      }
    }`,
      );
    }
    if (!text.includes('price_cleared:') && text.includes("if (pv.status === 'repair')")) {
      text = text.replace(
        "  const pv = priceVerdict(row);\n  if (pv.status === 'repair') {",
        `  const pv = priceVerdict(row);
  if (pv.status === 'suspect' && (pv.why === 'price_ambiguous_on_detail_page' || /ambiguous/i.test(String(pv.why || '')))) {
    next.rent_monthly_chf = null;
    next.pricing_unit = null;
    next.raw = { ...obj(rec.raw), price: null, price_quote: null };
    notes.push(\`price_cleared:\${pv.why}\`);
  } else if (pv.status === 'repair') {`,
      );
    }
    if (text !== before) {
      writeFileSync(target, text);
      console.log('C131: retired contact gate / soft price ambiguity applied');
    } else {
      console.log('C131: contact/price soft gates already applied');
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
  if (r.status && /recheck-feed|form-agents|form-ci/.test(script)) process.exit(r.status || 1);
}
