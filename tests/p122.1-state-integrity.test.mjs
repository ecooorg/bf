/**
 * P122.1 — State Integrity & Persistence
 * Deterministic tests for decision validation, save/load, recovery, revision, import.
 * Runs with node:test; mocks localStorage.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Minimal localStorage mock
function createLocalStorage() {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) {
      if (typeof v !== 'string') throw new TypeError('value must be string');
      map.set(String(k), String(v));
    },
    removeItem(k) { map.delete(String(k)); },
    clear() { map.clear(); },
    get length() { return map.size; },
    key(i) { return [...map.keys()][i] ?? null; },
    _map: map,
  };
}

const storage = createLocalStorage();
globalThis.localStorage = storage;

// Dynamic import after mock is installed
const storageMod = await import(pathToFileURL(path.join(root, 'src/storage.ts')).href);
const decisionMod = await import(pathToFileURL(path.join(root, 'src/decision.ts')).href);
const exportMod = await import(pathToFileURL(path.join(root, 'src/exportZip.ts')).href);

const {
  validateDecision,
  getStoredDecisions,
  saveDecisions,
  detectRevisionConflicts,
  mergeByRevision,
  bumpRevision,
  getLastSaveMeta,
} = storageMod;
const { emptyDecision, SCHEMA_VERSION } = decisionMod;
const { exportDecisionJson, parseImportedJson, parseImportedBackup } = exportMod;

function makeDecision(overrides = {}) {
  const d = emptyDecision();
  return { ...d, ...overrides, brief: { ...d.brief, ...(overrides.brief || {}) } };
}

beforeEach(() => {
  storage.clear();
});

describe('P122.1 validateDecision', () => {
  it('accepts a well-formed empty decision', () => {
    const d = emptyDecision();
    const v = validateDecision(d);
    assert.equal(v.ok, true);
    assert.ok(v.decision);
    assert.equal(v.decision.revision, 1);
  });

  it('rejects missing id', () => {
    const d = makeDecision({ id: '' });
    const v = validateDecision(d);
    assert.equal(v.ok, false);
    assert.ok(v.errors.includes('missing_or_invalid_id'));
  });

  it('rejects invalid step', () => {
    const d = makeDecision({ step: 'NOT_A_STAGE' });
    const v = validateDecision(d);
    assert.equal(v.ok, false);
    assert.ok(v.errors.includes('invalid_step'));
  });

  it('rejects missing brief.decision', () => {
    const d = makeDecision({ brief: { decision: undefined } });
    const v = validateDecision(d);
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => e.includes('brief')));
  });

  it('detects dangling preferredOptionId', () => {
    const d = makeDecision({
      preferredOptionId: 'opt_missing',
      options: [{ id: 'opt_1', title: 'A', description: '', byUser: true, keyAssumption: '', exitCost: '', cheapestTest: '', door: 'TWO_WAY', realistic: 'UNKNOWN', linkedUnknownIds: [] }],
    });
    const v = validateDecision(d);
    assert.equal(v.ok, false);
    assert.ok(v.errors.includes('preferredOptionId_dangling'));
  });

  it('normalizes missing revision to 1', () => {
    const d = makeDecision({ revision: undefined });
    delete d.revision;
    const v = validateDecision(d);
    assert.equal(v.ok, true);
    assert.equal(v.decision.revision, 1);
  });
});

describe('P122.1 save / load / recovery', () => {
  it('Create decision — Decision is saved', () => {
    const d = makeDecision({ title: 'Hire or build' });
    const r = saveDecisions([d]);
    assert.equal(r.ok, true);
    assert.equal(r.status, 'saved');
    const loaded = getStoredDecisions();
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].title, 'Hire or build');
    assert.equal(loaded[0].id, d.id);
  });

  it('Reload (getStoredDecisions) restores full state', () => {
    const d = makeDecision({
      title: 'Long session',
      step: 'ATTACK',
      options: [{ id: 'o1', title: 'A', description: 'desc', byUser: false, keyAssumption: 'k', exitCost: 'e', cheapestTest: 't', door: 'TWO_WAY', realistic: 'YES', linkedUnknownIds: [] }],
      evidence: [{ id: 'ev1', claim: 'c', sourceType: 'USER_DOCUMENT', sourceLabel: 'doc', verified: false }],
    });
    saveDecisions([d]);
    const loaded = getStoredDecisions();
    assert.equal(loaded[0].step, 'ATTACK');
    assert.equal(loaded[0].options.length, 1);
    assert.equal(loaded[0].evidence[0].id, 'ev1');
  });

  it('Failed save leaves previous state intact (quota simulation)', () => {
    const good = makeDecision({ title: 'Good' });
    saveDecisions([good]);
    // Force failure by making setItem throw on primary key
    const orig = storage.setItem.bind(storage);
    storage.setItem = (k, v) => {
      if (k === 'bifurcation_decisions_v11') throw new Error('QuotaExceededError');
      return orig(k, v);
    };
    const bad = makeDecision({ title: 'Should not stick' });
    const r = saveDecisions([bad]);
    assert.equal(r.ok, false);
    assert.equal(r.status, 'failed');
    // Restore setItem
    storage.setItem = orig;
    const loaded = getStoredDecisions();
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].title, 'Good');
  });

  it('Corrupt primary is recovered from backup', () => {
    const d = makeDecision({ title: 'Recovered' });
    saveDecisions([d]);
    // Corrupt primary
    storage.setItem('bifurcation_decisions_v11', '{not-json');
    const loaded = getStoredDecisions();
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].title, 'Recovered');
  });

  it('Invalid items are dropped on load without destroying the rest', () => {
    const good = makeDecision({ title: 'Keep me' });
    const payload = JSON.stringify([good, { id: 'x', title: 'bad' }]); // missing many required fields
    storage.setItem('bifurcation_decisions_v11', payload);
    // Also set backup to same so recovery path is not used for the bad one
    storage.setItem('bifurcation_decisions_backup_v11', payload);
    const loaded = getStoredDecisions();
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].title, 'Keep me');
  });
});

describe('P122.1 revision / concurrency', () => {
  it('bumpRevision increments revision', () => {
    const d = makeDecision({ revision: 3 });
    const next = bumpRevision(d);
    assert.equal(next.revision, 4);
    assert.ok(next.updatedAt >= d.updatedAt);
  });

  it('detectRevisionConflicts finds older incoming', () => {
    const local = [makeDecision({ id: 'a', revision: 5 })];
    const incoming = [makeDecision({ id: 'a', revision: 2 })];
    const c = detectRevisionConflicts(local, incoming);
    assert.equal(c.length, 1);
    assert.equal(c[0].currentRev, 5);
    assert.equal(c[0].incomingRev, 2);
  });

  it('mergeByRevision keeps newer local on conflict', () => {
    const local = [makeDecision({ id: 'a', revision: 5, title: 'local' })];
    const incoming = [makeDecision({ id: 'a', revision: 2, title: 'stale' })];
    const { merged, conflicts } = mergeByRevision(local, incoming);
    assert.equal(conflicts.length, 1);
    assert.equal(merged[0].title, 'local');
    assert.equal(merged[0].revision, 5);
  });

  it('mergeByRevision accepts higher incoming revision', () => {
    const local = [makeDecision({ id: 'a', revision: 2, title: 'old' })];
    const incoming = [makeDecision({ id: 'a', revision: 4, title: 'newer' })];
    const { merged, conflicts } = mergeByRevision(local, incoming);
    assert.equal(conflicts.length, 0);
    assert.equal(merged[0].title, 'newer');
  });
});

describe('P122.1 export / import round-trip', () => {
  it('Export/import preserves structured state', () => {
    const d = makeDecision({
      title: 'Round trip',
      step: 'SYNTHESIS',
      revision: 7,
      options: [{ id: 'o1', title: 'Opt', description: 'd', byUser: true, keyAssumption: 'a', exitCost: 'c', cheapestTest: 't', door: 'ONE_WAY', realistic: 'YES', linkedUnknownIds: [] }],
      evidence: [{ id: 'e1', claim: 'fact', sourceType: 'EXTERNAL_SOURCE', sourceLabel: 'src', verified: true }],
    });
    const blob = exportDecisionJson(d);
    // Node Blob has text()
    return blob.text().then((text) => {
      const imported = parseImportedJson(text);
      assert.equal(imported.length, 1);
      assert.equal(imported[0].title, 'Round trip');
      assert.equal(imported[0].step, 'SYNTHESIS');
      assert.equal(imported[0].revision, 7);
      assert.equal(imported[0].options[0].id, 'o1');
      assert.equal(imported[0].evidence[0].id, 'e1');
    });
  });

  it('Invalid imported data is rejected safely', () => {
    assert.throws(() => parseImportedJson('{not json'), /Invalid JSON/);
    assert.throws(() => parseImportedJson('{"decisions":[]}'), /no decisions/);
    assert.throws(
      () => parseImportedJson(JSON.stringify({ decisions: [{ id: 'x', title: 't' }] })),
      /Invalid decision/
    );
  });

  it('Import does not mutate existing storage until caller saves', () => {
    const existing = makeDecision({ title: 'Existing' });
    saveDecisions([existing]);
    const foreign = makeDecision({ title: 'Foreign', id: 'foreign_1' });
    const text = JSON.stringify({ schemaVersion: 11, decisions: [foreign] });
    const imported = parseImportedJson(text);
    assert.equal(imported.length, 1);
    // Storage still has only original until explicit save
    const still = getStoredDecisions();
    assert.equal(still.length, 1);
    assert.equal(still[0].title, 'Existing');
  });
});

describe('P122.1 save meta', () => {
  it('records last successful save meta', () => {
    saveDecisions([makeDecision()]);
    const meta = getLastSaveMeta();
    assert.ok(meta);
    assert.equal(meta.status, 'saved');
    assert.equal(meta.count, 1);
    assert.ok(meta.at > 0);
  });
});
