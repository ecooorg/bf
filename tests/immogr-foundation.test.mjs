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
});
