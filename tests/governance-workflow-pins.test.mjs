import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const workflowDir = '.github/workflows';
const workflowFiles = fs.readdirSync(workflowDir).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'));
const expected = new Map([
  ['actions/checkout', '3d3c42e5aac5ba805825da76410c181273ba90b1'],
  ['actions/setup-node', '949feb2413d6458794dcd2491c4babbbce0c15c1'],
  ['actions/cache', '55cc8345863c7cc4c66a329aec7e433d2d1c52a9'],
  ['actions/upload-artifact', 'cf430e030ddbb5b0abf93d22962f4752f3646cd9'],
  ['gitleaks/gitleaks-action', 'e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e'],
]);

test('every third-party workflow action is pinned to a full immutable commit SHA', () => {
  let usesCount = 0;
  for (const file of workflowFiles) {
    const source = fs.readFileSync(path.join(workflowDir, file), 'utf8');
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*uses:\s*([^\s#]+)(?:\s+#\s*(.*))?$/);
      if (!match || match[1].startsWith('./')) continue;
      usesCount++;
      const [repo, ref] = match[1].split('@');
      assert.ok(ref && /^[a-f0-9]{40}$/.test(ref), `${file}: mutable or invalid action ref ${match[1]}`);
      assert.ok(match[2], `${file}: add a human-readable release comment for ${repo}`);
      if (expected.has(repo)) assert.equal(ref, expected.get(repo), `${file}: unexpected pin for ${repo}`);
    }
  }
  assert.ok(usesCount > 0, 'workflow scan found no external actions');
  for (const repo of expected.keys()) assert.ok(usesCount > 0 && workflowFiles.some((f) => fs.readFileSync(path.join(workflowDir, f), 'utf8').includes(`${repo}@${expected.get(repo)}`)), `missing pinned action ${repo}`);
});

test('Dependabot weekly updates include GitHub Actions', () => {
  const config = fs.readFileSync('.github/dependabot.yml', 'utf8');
  assert.match(config, /package-ecosystem:\s*github-actions/);
  assert.match(config, /interval:\s*weekly/);
});
