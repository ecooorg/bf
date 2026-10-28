/**
 * Version gate. The ONLY version source is package.json (AGENTS.md, "Version and patch numbering").
 *   "patch"   = number of the last applied patch, e.g. "118.3.2" (digits separated by dots).
 *   "version" = program version = the first number of "patch", e.g. "118".
 * Nothing else is read or compared: not src/config.ts, server.ts, CHANGELOG.md or any document.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function parsePatch(text) {
  const m = /^(\d+)(?:\.\d+)*$/.exec(String(text ?? ''));
  return m ? { text: m[0], major: m[1], parts: m[0].split('.').map(Number) } : null;
}

/** Negative / zero / positive like a comparator; missing trailing parts count as 0. */
export function comparePatch(a, b) {
  const n = Math.max(a.parts.length, b.parts.length);
  for (let i = 0; i < n; i++) { const d = (a.parts[i] ?? 0) - (b.parts[i] ?? 0); if (d) return d; }
  return 0;
}

export function versionErrors(pkg) {
  const errors = [];
  if (!pkg || typeof pkg !== 'object') return ['package.json is not a JSON object'];
  const patch = typeof pkg.patch === 'string' ? parsePatch(pkg.patch) : null;
  if (!patch) errors.push(`package.json "patch" must be a string of numbers separated by dots (e.g. "118.3.2"), got ${JSON.stringify(pkg.patch)}`);
  if (typeof pkg.version !== 'string' || !/^\d+$/.test(pkg.version)) errors.push(`package.json "version" must be a string of digits (e.g. "118"), got ${JSON.stringify(pkg.version)}`);
  if (patch && typeof pkg.version === 'string' && pkg.version !== patch.major) {
    errors.push(`package.json version ${pkg.version} must equal the first number of patch ${patch.text} (${patch.major}); set version to ${patch.major}`);
  }
  return errors;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let pkg;
  try { pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')); }
  catch (e) { console.error(`package.json unreadable: ${e.message}`); process.exit(1); }
  const errors = versionErrors(pkg);
  if (errors.length) { for (const e of errors) console.error(e); process.exit(1); }
  console.log(`Version check OK: version ${pkg.version}, patch ${pkg.patch}`);
}
