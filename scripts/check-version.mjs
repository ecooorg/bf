/**
 * Product version: only src/config.ts APP_VERSION and package.json "version".
 * Markdown is not version-gated.
 */
import { readFileSync, existsSync } from 'node:fs';

const read = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : null);
const errors = [];
const cfg = read('src/config.ts') || '';
const V = (cfg.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1];
if (!V) {
  console.error('APP_VERSION not found in src/config.ts');
  process.exit(1);
}
const pkgRaw = read('package.json');
if (!pkgRaw) {
  console.error('package.json missing');
  process.exit(1);
}
const pkg = JSON.parse(pkgRaw);
if (pkg.version !== V) errors.push(`package.json version ${pkg.version} != APP_VERSION ${V}`);

const server = read('server.ts') || '';
if (/const\s+APP_VERSION\s*=/.test(server)) errors.push('server.ts defines its own APP_VERSION');
if (!/import\s*\{[^}]*APP_VERSION[^}]*\}\s*from\s*'\.\/src\/config/.test(server)) {
  errors.push("server.ts does not import APP_VERSION from './src/config'");
}

// CHANGELOG.md is newest-first: its first "## P<major>[.<minor>] — title" heading is the exact release label.
const changelog = read('CHANGELOG.md'); // optional: trees without markdown (copied subsets) are still valid
const head = ((changelog || '').match(/^## (P(\d+)(?:\.\d+)*)\b/m) || []);
if (changelog !== null) {
  if (!head[1]) errors.push('CHANGELOG.md: first "## P<N>[.<M>]" heading not found');
  else if (head[2] !== V) errors.push(`CHANGELOG.md top entry ${head[1]} does not match APP_VERSION ${V}; add the new entry at the very top`);
  else if (changelog.search(/^## /m) !== changelog.search(/^## P\d/m)) errors.push('CHANGELOG.md: the first "## " heading must be the newest release entry');
}

if (errors.length) {
  console.error('Version check FAILED:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log(`Version check OK: ${V} (release ${head[1] ?? 'n/a: no CHANGELOG.md'})`);
