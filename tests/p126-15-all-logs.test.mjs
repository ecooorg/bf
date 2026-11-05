/**
 * P126.15 — All Logs menu item + archive shape (unit-level, no live server required for structure helpers).
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { describe, it } from 'node:test';
import path from 'node:path';

const root = process.cwd();

function read(rel) {
  return readFileSync(path.join(root, rel), 'utf8');
}

describe('P126.15 All Logs + mode labels + commit badge', () => {
  it('ModeMenu labels are Simple / Expert / Project', () => {
    const src = read('src/ModeMenu.tsx');
    assert.match(src, /label: 'Simple'/);
    assert.match(src, /label: 'Project'/);
    assert.doesNotMatch(src, /label: 'Conversational'/);
    assert.doesNotMatch(src, /label: 'Architect'/);
  });

  it('CommitBadge component exists and reads /api/health', () => {
    const src = read('src/CommitBadge.tsx');
    assert.match(src, /data-testid="commit-badge"/);
    assert.match(src, /\/api\/health/);
    assert.match(src, /Commit /);
  });

  it('all-logs client helper downloads without rendering body', () => {
    const src = read('src/allLogs.ts');
    assert.match(src, /\/api\/diagnostics\/all-logs/);
    assert.match(src, /link\.download/);
  });

  it('AppHeader / ProjectMode / ArchitectShellHeader expose all-logs-menu-item', () => {
    for (const f of ['src/AppHeader.tsx', 'src/ProjectMode.tsx', 'src/ArchitectShellHeader.tsx']) {
      const src = read(f);
      assert.match(src, /data-testid="all-logs-menu-item"/, f);
      assert.doesNotMatch(src, /Diagnostic log/, f);
      assert.doesNotMatch(src, /Run system diagnostics/, f);
    }
  });

  it('server allLogs module and route exist', () => {
    assert.ok(existsSync(path.join(root, 'server/allLogs.ts')));
    const server = read('server.ts');
    assert.match(server, /\/api\/diagnostics\/all-logs/);
    assert.match(server, /buildAllLogsZip/);
  });

  it('package patch is 126.15', () => {
    const pkg = JSON.parse(read('package.json'));
    assert.equal(pkg.patch, '126.15');
  });

  it('ArchitectShellHeader no longer requires diagnostics callbacks', () => {
    const src = read('src/ArchitectShellHeader.tsx');
    assert.doesNotMatch(src, /onDiagnostics/);
    assert.doesNotMatch(src, /onDownloadDiagnostics/);
  });

  it('User-facing start cards use Simple and Project', () => {
    const src = read('src/App.tsx');
    assert.match(src, /<h2>Simple<\/h2>/);
    assert.match(src, /<h2>Project<\/h2>/);
  });
});
