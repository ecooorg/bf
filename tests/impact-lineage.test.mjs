import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildImpactLineage } from '../scripts/architectureImpactLineageLib.mjs';

function fixture() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'biforge-p86-'));
  const put = (relative, text = '') => {
    const full = path.join(rootDir, relative);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, text, 'utf8');
  };
  put('scripts/docsGenerateInventories.mjs', 'export const generator = true;\n');
  put('scripts/architectureGenerateModuleMap.mjs', 'export const moduleMap = true;\n');
  put('scripts/docsCheckInventories.mjs', "const required = ['generated-route-inventory.json'];\n");
  put('scripts/acceptanceReport.mjs', "const name = 'generated-route-inventory.json';\n");
  put('server/routes.ts', "app.get('/health', handler);\n");
  put('server/env.ts', 'const x = process.env.APP_PASSWORD;\n');
  put('migrations/001_init.sql', 'CREATE TABLE projects(id text);\n');
  put('docs/generated-route-inventory.json', JSON.stringify({
    generator: 'scripts/docsGenerateInventories.mjs', count: 1,
    routes: [{ method: 'GET', path: '/health', file: 'server/routes.ts' }],
  }));
  put('docs/generated-env-inventory.json', JSON.stringify({
    generator: 'scripts/docsGenerateInventories.mjs', count: 1,
    variables: [{ name: 'APP_PASSWORD', files: ['server/env.ts'] }],
  }));
  put('docs/generated-migration-inventory.json', JSON.stringify({
    generator: 'scripts/docsGenerateInventories.mjs', count: 1,
    migrations: [{ file: 'migrations/001_init.sql' }],
  }));
  put('docs/generated-module-map.json', JSON.stringify({
    generator: 'scripts/architectureGenerateModuleMap.mjs', modules: [],
  }));
  return { rootDir, put, cleanup: () => fs.rmSync(rootDir, { recursive: true, force: true }) };
}

function plan(fx, changedFiles, extra = {}) {
  return buildImpactLineage({ rootDir: fx.rootDir, changedFiles, ...extra });
}

test('P86: generator change traces declared outputs and known consumers', () => {
  const fx = fixture();
  try {
    const report = plan(fx, ['scripts/docsGenerateInventories.mjs']);
    assert.equal(report.status, 'PARTIAL');
    assert.ok(report.intentDiff.observedImpact.includes('docs/generated-route-inventory.json'));
    assert.ok(report.intentDiff.observedImpact.includes('scripts/docsCheckInventories.mjs'));
    assert.ok(report.intentDiff.observedImpact.includes('scripts/acceptanceReport.mjs'));
    assert.ok(report.edges.some((e) => e.type === 'generatedBy' && e.from === 'scripts/docsGenerateInventories.mjs'));
  } finally { fx.cleanup(); }
});

test('P86: module-map generator has an explicit output lineage', () => {
  const fx = fixture();
  try {
    const report = plan(fx, ['scripts/architectureGenerateModuleMap.mjs']);
    assert.ok(report.intentDiff.observedImpact.includes('docs/generated-module-map.json'));
    assert.ok(report.edges.some((e) => e.type === 'generatedBy' && e.from === 'scripts/architectureGenerateModuleMap.mjs' && e.to === 'docs/generated-module-map.json'));
  } finally { fx.cleanup(); }
});

test('P86: generated route inventory edit points back to generator, multiple consumers and its regression test', () => {
  const fx = fixture();
  try {
    const report = plan(fx, ['docs/generated-route-inventory.json']);
    for (const expected of ['scripts/docsGenerateInventories.mjs', 'scripts/docsCheckInventories.mjs', 'scripts/acceptanceReport.mjs', 'tests/impact-lineage.test.mjs']) {
      assert.ok(report.intentDiff.observedImpact.includes(expected), `missing impact ${expected}`);
    }
    assert.ok(report.edges.some((e) => e.type === 'registers' && e.from === 'server/routes.ts' && e.to === 'route:GET /health'));
  } finally { fx.cleanup(); }
});

test('P86: absent generator is reported as unknown, not as verified lineage', () => {
  const fx = fixture();
  try {
    fs.rmSync(path.join(fx.rootDir, 'scripts/docsGenerateInventories.mjs'));
    const report = plan(fx, ['docs/generated-route-inventory.json']);
    assert.equal(report.generatedArtifacts['docs/generated-route-inventory.json'].status, 'UNKNOWN');
    assert.match(report.generatedArtifacts['docs/generated-route-inventory.json'].reason, /missing/);
  } finally { fx.cleanup(); }
});

test('P86: mismatched generator metadata marks artifact stale', () => {
  const fx = fixture();
  try {
    fx.put('docs/generated-route-inventory.json', JSON.stringify({
      generator: 'scripts/renamed-generator.mjs', count: 1,
      routes: [{ method: 'GET', path: '/health', file: 'server/routes.ts' }],
    }));
    const report = plan(fx, ['docs/generated-route-inventory.json']);
    assert.equal(report.generatedArtifacts['docs/generated-route-inventory.json'].status, 'STALE');
  } finally { fx.cleanup(); }
});

test('P86: source inventory edges connect route, environment and migration evidence', () => {
  const fx = fixture();
  try {
    const report = plan(fx, ['server/env.ts', 'server/routes.ts', 'migrations/001_init.sql']);
    assert.ok(report.edges.some((e) => e.type === 'readsEnv' && e.from === 'server/env.ts' && e.to === 'env:APP_PASSWORD'));
    assert.ok(report.edges.some((e) => e.type === 'declaresMigration' && e.from === 'migrations/001_init.sql'));
    assert.ok(report.intentDiff.observedImpact.includes('docs/generated-route-inventory.json'));
  } finally { fx.cleanup(); }
});

test('P86: cyclic static imports terminate and include each importer once', () => {
  const fx = fixture();
  try {
    const report = plan(fx, ['src/a.mjs'], {
      modules: ['src/a.mjs', 'src/b.mjs'],
      importEdges: [
        { from: 'src/a.mjs', to: 'src/b.mjs' },
        { from: 'src/b.mjs', to: 'src/a.mjs' },
      ],
    });
    assert.deepEqual(report.staticImportImpact.affectedModules, ['src/a.mjs', 'src/b.mjs']);
  } finally { fx.cleanup(); }
});

test('P86: dynamic imports create uncertainty rather than inferred edges', () => {
  const fx = fixture();
  try {
    fx.put('scripts/dynamic-loader.mjs', 'const mod = await import(moduleName);\n');
    const report = plan(fx, ['scripts/dynamic-loader.mjs']);
    assert.ok(report.uncertainties.some((item) => item.includes('dynamic import/require')));
    assert.ok(!report.edges.some((e) => e.from === 'scripts/dynamic-loader.mjs' && e.type === 'generatedBy'));
  } finally { fx.cleanup(); }
});

test('P86: filename similarity alone does not invent generator lineage', () => {
  const fx = fixture();
  try {
    fx.put('scripts/route-inventory-generator.mjs', 'export const unrelated = true;\n');
    const report = plan(fx, ['scripts/route-inventory-generator.mjs']);
    assert.equal(report.status, 'UNKNOWN');
    assert.ok(!report.intentDiff.observedImpact.includes('docs/generated-route-inventory.json'));
    assert.ok(report.uncertainties.some((item) => item.includes('no explicit generator-lineage mapping')));
  } finally { fx.cleanup(); }
});
