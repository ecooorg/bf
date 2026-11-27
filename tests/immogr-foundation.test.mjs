import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('ImmoGR persistence is additive and isolated from retired ImmoFinder', () => {
  const sql = read('migrations/031_immogr_core.sql').toLowerCase();
  for (const table of ['immogr_sources','immogr_runs','immogr_source_pages','immogr_listings','immogr_owners','immogr_contacts','immogr_evidence','immogr_events','immogr_reviews']) {
    assert.match(sql, new RegExp('create table if not exists ' + table));
  }
  assert.doesNotMatch(sql, /immofinder_/);
  assert.doesNotMatch(sql, /drop table|truncate table|alter table immofinder/i);
});

test('ImmoGR admission data model enforces evidence and explicit unknown owner state', () => {
  const sql = read('migrations/031_immogr_core.sql').toLowerCase();
  assert.match(sql, /owner_class.*unknown/);
  assert.match(sql, /quote text not null/);
  assert.match(sql, /source_url text not null/);
  assert.match(sql, /page_block text not null/);
  assert.match(sql, /extraction_method text not null/);
  assert.match(sql, /price_period.*month.*week.*night.*season.*unknown/);
  assert.match(sql, /canonical_url text not null unique/);
});

test('active migration runner quarantines only historical ImmoFinder migrations', () => {
  const runner = read('scripts/migrate.mjs');
  assert.match(runner, /isRetiredImmoFinderMigration/);
  assert.match(runner, /0\(\?:2\[0-9\]\|30\)_immofinder/);
  assert.doesNotMatch(runner, /immogr_/);
  assert.match(runner, /allFiles\.filter\(\(file\) => !isRetiredImmoFinderMigration\(file\)\)/);
});

test('official GR commune catalogue is complete and priority worksheet is editable', async () => {
  const { IMMOGR_COMMUNES } = await import('../server/immogr/communes.ts');
  const csv = read('config/immogr/commune-priorities.csv');
  assert.equal(IMMOGR_COMMUNES.length, 100);
  assert.equal(new Set(IMMOGR_COMMUNES.map((item) => item.bfsId)).size, 100);
  assert.equal(new Set(IMMOGR_COMMUNES.map((item) => item.name)).size, 100);
  const dataRows = csv.split(/\r?\n/).filter((line) => /^\d+,/.test(line));
  assert.equal(dataRows.length, 100);
  assert.match(csv, /priority_rating,target_44,aliases,notes/);
  assert.match(csv, /1 \(highest\) or 2 \(secondary\)/);
  assert.ok(IMMOGR_COMMUNES.some((item) => item.bfsId === 3901 && item.name === 'Chur'));
});

test('ImmoGR exposes official municipality catalogue and UI consumes it', () => {
  const routes = read('server/immogr/index.ts');
  const ui = read('src/ImmoGR.tsx');
  assert.match(routes, /app\.get\('\/api\/immogr\/communes'/);
  assert.match(routes, /IMMOGR_COMMUNES/);
  assert.match(ui, /fetch\('\/api\/immogr\/communes'/);
  assert.match(ui, /communes\.map/);
  assert.match(ui, /commune-priorities\.csv/);
});

test('database commune seed matches the official runtime catalogue and leaves user priorities blank', async () => {
  const { IMMOGR_COMMUNES } = await import('../server/immogr/communes.ts');
  const sql = read('migrations/032_immogr_communes.sql');
  const coreMigration = read('migrations/031_immogr_core.sql');
  assert.doesNotMatch(coreMigration, /immogr_communes/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS immogr_communes/);
  assert.match(sql, /commune_id integer REFERENCES immogr_communes\(bfs_id\)/);
  const seed = sql.split('INSERT INTO immogr_communes')[1].split('ON CONFLICT')[0];
  for (const commune of IMMOGR_COMMUNES) {
    assert.ok(seed.includes(`(${commune.bfsId}, '${commune.name}'`), `missing seed for ${commune.name}`);
  }
  assert.equal((seed.match(/\(\d+, '/g) || []).length, 100);
  assert.doesNotMatch(seed, /,\s*[12],\s*(?:true|false)/i);
  assert.doesNotMatch(seed, /\(\d+, "/);
});
