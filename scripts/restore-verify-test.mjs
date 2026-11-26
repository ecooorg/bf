#!/usr/bin/env node
/** Restore tests/immofinder-verify.test.mjs if PLACEHOLDER/truncated; append dryRunBatch test. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'tests', 'immofinder-verify.test.mjs');
const GOOD_SHA = '15da432895b54be419bcf3dc54d386791f75937a';
const GOOD_URL = `https://raw.githubusercontent.com/ecooorg/bf/${GOOD_SHA}/tests/immofinder-verify.test.mjs`;

const DRY = `
import { dryRunBatch } from '../server/immofinder/dryRun.ts';

test('P131.8i dryRunBatch aggregates levels and optional legacy agreement', () => {
  const items = [
    { snapshot: snap(), sourceId: 'happyholiday', legacyKept: true },
    { snapshot: snap({ title: 'Studio Zürich', pageText: '1 Zimmer Studio in Zürich zu mieten. Ruhige Lage mit Balkon und Küche.' }), legacyKept: false },
    { snapshot: snap({ provisional: true }), legacyKept: false },
  ];
  const r = dryRunBatch(items, CFG);
  assert.equal(r.total, 3);
  assert.ok(r.byLevel.L0 >= 2);
  assert.ok((r.byLevel.L1 || 0) + (r.byLevel.L2 || 0) >= 1);
  assert.equal(r.agreeCount + r.disagreeCount, 3);
  assert.ok(r.rows.every((row) => typeof row.level === 'string'));
});
`;

async function main() {
  let text = existsSync(target) ? readFileSync(target, 'utf8') : '';
  const bad = text.includes('PLACEHOLDER') || text.includes('SEE_ARTIFACT') || text.length < 500 || !text.includes('classifyPage');
  if (bad) {
    const res = await fetch(GOOD_URL);
    if (!res.ok) throw new Error('fetch good verify test failed: ' + res.status);
    text = await res.text();
    console.log('Fetched good immofinder-verify.test.mjs', text.length);
  }
  if (!text.includes('dryRunBatch')) {
    // insert import after processSnapshot import
    if (text.includes("from '../server/immofinder/pipeline.ts';") && !text.includes('dryRunBatch')) {
      text = text.replace(
        "from '../server/immofinder/pipeline.ts';",
        "from '../server/immofinder/pipeline.ts';\nimport { dryRunBatch } from '../server/immofinder/dryRun.ts';",
      );
    }
    if (!text.includes("dryRunBatch aggregates")) {
      text = text.trimEnd() + '\n' + DRY.split('import { dryRunBatch }')[1]; // append test only (import already added)
      // if import line still needed at top of DRY we already handled it
      if (!text.includes('dryRunBatch aggregates')) {
        text = text.trimEnd() + `\n\ntest('P131.8i dryRunBatch aggregates levels and optional legacy agreement', () => {
  const items = [
    { snapshot: snap(), sourceId: 'happyholiday', legacyKept: true },
    { snapshot: snap({ title: 'Studio Zürich', pageText: '1 Zimmer Studio in Zürich zu mieten. Ruhige Lage mit Balkon und Küche.' }), legacyKept: false },
    { snapshot: snap({ provisional: true }), legacyKept: false },
  ];
  const r = dryRunBatch(items, CFG);
  assert.equal(r.total, 3);
  assert.ok(r.byLevel.L0 >= 2);
  assert.ok((r.byLevel.L1 || 0) + (r.byLevel.L2 || 0) >= 1);
  assert.equal(r.agreeCount + r.disagreeCount, 3);
  assert.ok(r.rows.every((row) => typeof row.level === 'string'));
});\n`;
      }
    }
  }
  writeFileSync(target, text);
  console.log('Wrote', target, text.length);
}

main().catch((e) => { console.error(e); process.exit(1); });
