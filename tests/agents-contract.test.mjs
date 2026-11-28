/**
 * Category: agents — ModeMenu, routes, isolation of Simple / Expert / Project.
 * Add new agent UI/route contracts here (do not create per-patch files).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('ModeMenu exposes three agents with stable internal keys Simple | Expert | Project', () => {
  const menu = read('src/ModeMenu.tsx');
  assert.match(menu, /export type AppMode = 'Simple' \| 'Expert' \| 'Project'/);
  assert.match(menu, /mode: 'Simple'/);
  assert.match(menu, /mode: 'Expert'/);
  assert.match(menu, /mode: 'Project'/);
  assert.match(menu, /data-testid="mode-menu-button"/);
  assert.match(menu, /data-testid=\{`mode-item-\$\{it\.mode\.toLowerCase\(\)\}`\}/);
});

test('User-facing labels are Simple, Expert, Project (not Conversational / Architect)', () => {
  const menu = read('src/ModeMenu.tsx');
  const app = read('src/App.tsx');
  assert.match(menu, /label: 'Simple'/);
  assert.match(menu, /label: 'Expert'/);
  assert.match(menu, /label: 'Project'/);
  assert.doesNotMatch(menu, /label: 'Conversational'/);
  assert.doesNotMatch(menu, /label: 'Architect'/);
  assert.match(app, /<h2>Simple<\/h2>/);
  assert.match(app, /<h2>Expert<\/h2>/);
  assert.match(app, /<h2>Project<\/h2>/);
});

test('Project opens on dedicated routes; main entry has no Architectural Test Lab', () => {
  const main = read('src/main.tsx');
  const app = read('src/App.tsx');
  assert.match(main, /'\/project'/);
  assert.match(main, /ProjectMode/);
  assert.doesNotMatch(main, /path === '\/architect-lab'|isArchitectLab|ArchitectLab/);
  assert.ok(!existsSync(path.join(root, 'src/ArchitectLab.tsx')), 'ArchitectLab.tsx must be removed');
  assert.ok(!existsSync(path.join(root, 'src/ArchitectShellHeader.tsx')), 'ArchitectShellHeader.tsx must be removed');
  assert.match(app, /window\.location\.href = '\/project'/);
});

test('AppHeader and ProjectMode More menus share All Logs and omit legacy diagnostic dump items', () => {
  const header = read('src/AppHeader.tsx');
  const project = read('src/ProjectMode.tsx');
  assert.match(header, /data-testid="all-logs-menu-item"/);
  assert.match(project, /data-testid="all-logs-menu-item"/);
  assert.doesNotMatch(header, /Diagnostic log/);
  assert.doesNotMatch(project, /Run system diagnostics/);
  assert.doesNotMatch(project, /Download diagnostic logs/);
});

test('Commit badge is wired for all shells that show ModeMenu', () => {
  assert.match(read('src/CommitBadge.tsx'), /data-testid="commit-badge"/);
  assert.match(read('src/AppHeader.tsx'), /CommitBadge/);
  assert.match(read('src/ProjectMode.tsx'), /CommitBadge/);
});

test('ImmoGR is the only active property-search entry and its live search uses the acquisition pipeline', () => {
  const app = read('src/App.tsx');
  const main = read('src/main.tsx');
  const page = read('src/ImmoGR.tsx');
  const server = read('server.ts');
  const engine = read('server/immogr/index.ts');
  assert.match(app, /data-testid="start-immogr"/);
  assert.match(main, /path === '\/immogr'/);
  assert.match(page, /data-testid="immogr-search"/);
  assert.doesNotMatch(page, /Search engine status|Verified listing admission: disabled|Automated source-page acquisition: disabled/);
  assert.match(server, /registerImmoGRRoutes\(app,/);
  assert.match(server, /registerImmoGRRoutes\(app, \{ searchClient: pooledGeminiClient\(\)/);
  assert.doesNotMatch(server, /registerImmoGRRoutes\(app, \{ searchClient: ai as any/);
  assert.match(engine, /liveSearchEnabled: liveDiscoveryEnabled/);
  assert.match(engine, /\/api\/immogr\/discovery/);
  assert.match(engine, /fetchWebSearchDigest/);
  assert.match(engine, /status: 'discovery_only'/);
  assert.match(engine, /\/api\/immogr\/search/);\n  assert.match(engine, /fetchImmoGRPage/);\n  assert.match(engine, /parseImmoGRHtml/);\n  assert.match(engine, /INSERT INTO immogr_listings/);\n  assert.doesNotMatch(engine, /immofinder/i);
  assert.match(engine, /fetchSerperDigestMulti/);
  assert.match(engine, /fetchPages: false/);
  assert.match(page, /data-testid="immogr-search"/);
  assert.doesNotMatch(main, /import\('\.\/ImmoFinder\.tsx'\)/);
  assert.doesNotMatch(server, /registerImmoFinderRoutes|callImmoLlm|stopImmoFinderWorker/);
});

test('ImmoFinder is retired at the API boundary and cannot be restarted by old workflows', () => {
  const server = read('server.ts');
  const main = read('src/main.tsx');
  assert.match(server, /IMMOFINDER_RETIRED/);
  assert.match(server, /\/api\/immofinder/);
  assert.match(main, /ImmoFinder is permanently retired/);
  for (const workflow of ['immofinder-cron.yml', 'immofinder-diagnostics-poll.yml', 'immofinder-health.yml', 'restore-immofinder-routes.yml', 'ci-data-minimal.yml']) {
    assert.equal(existsSync(path.join(root, '.github/workflows', workflow)), false, workflow + ' must be retired');
  }
});

test('ImmoGR namespace is independent of legacy ImmoFinder modules and storage', () => {
  const engine = read('server/immogr/index.ts');
  const types = read('src/immogr/types.ts');
  const config = JSON.parse(read('config/immogr/sources.json'));
  assert.doesNotMatch(engine, /fetchPageText|fetchSerperDigest\(|immofinder/i);
  assert.doesNotMatch(types, /immofinder/i);
  assert.ok(config.sources.length >= 5);
  assert.ok(config.sources.every((source) => source.status !== 'active'));
});

test('ImmoGR runtime excludes archived ImmoFinder modules and migrations', () => {
  const migrationRunner = read('scripts/migrate.mjs');
  assert.match(migrationRunner, /isRetiredImmoFinderMigration/);
  assert.match(migrationRunner, /archived ImmoFinder migrations excluded/);
  const serverBuild = JSON.parse(read('tsconfig.server.json'));
  assert.ok(serverBuild.exclude.includes('server/immofinder/**'));
  assert.ok(serverBuild.exclude.includes('server/immofinder*.ts'));
  assert.ok(serverBuild.exclude.includes('src/immoCard.ts'));
});
