import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mod = await import(pathToFileURL(path.join(root, 'server/modelSourcesCatalog.ts')).href);
const { loadModelSourcesCatalog, enabledSources, runnableSources, sourceHasCredentials } = mod;

describe('P123.3 model sources catalog', () => {
  it('loads schema_version 1 catalog with gemini enabled', () => {
    const cat = loadModelSourcesCatalog(path.join(root, 'config/model-sources.json'));
    assert.equal(cat.schema_version, 1);
    assert.ok(cat.sources.length >= 5);
    const gemini = cat.sources.find((s) => s.id === 'gemini-free-pool');
    assert.ok(gemini);
    assert.equal(gemini.enabled, true);
    assert.ok(gemini.models.some((m) => m.id === 'gemini-3.5-flash-lite'));
  });

  it('enabledSources sorts by priority and skips disabled', () => {
    const cat = loadModelSourcesCatalog(path.join(root, 'config/model-sources.json'));
    const en = enabledSources(cat, 'public');
    assert.ok(en.every((s) => s.enabled));
    assert.equal(en[0].id, 'gemini-free-pool');
    for (let i = 1; i < en.length; i++) {
      assert.ok(en[i - 1].priority >= en[i].priority);
    }
  });

  it('runnableSources requires credentials in env', () => {
    const cat = loadModelSourcesCatalog(path.join(root, 'config/model-sources.json'));
    const none = runnableSources(cat, {}, 'public');
    assert.equal(none.length, 0);
    const withKey = runnableSources(cat, { GEMINI_API_KEY: 'test-key' }, 'public');
    assert.ok(withKey.some((s) => s.id === 'gemini-free-pool'));
    assert.equal(sourceHasCredentials(withKey[0], { GEMINI_API_KEY: 'test-key' }), true);
  });

  it('inventory document lists 20+ providers', () => {
    const text = readFileSync(path.join(root, 'docs/MODEL_SOURCES_INVENTORY.md'), 'utf8');
    assert.match(text, /OpenRouter/);
    assert.match(text, /Groq/);
    assert.match(text, /GitHub Models/);
    assert.match(text, /retired/);
    const rows = text.split('\n').filter((l) => /^\| \d+ \|/.test(l));
    assert.ok(rows.length >= 20, `expected >=20 inventory rows, got ${rows.length}`);
  });
});
