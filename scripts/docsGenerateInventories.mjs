#!/usr/bin/env node
/**
 * Phase 4 (p77) — generate route / env / migration inventories from source.
 * Static analysis only. Deterministic (stable sort). Does not invent product facts.
 *
 * Output (under docs/):
 *   route-inventory.json
 *   env-inventory.json
 *   migration-inventory.json
 *
 * Usage:
 *   node scripts/docsGenerateInventories.mjs
 *   npm run docs:generate
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs');

const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-server', '.git', 'artifacts', 'coverage']);

function walkTs(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.') && ent.name !== '.') continue;
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTs(full, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(ent.name) && !ent.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

/** Express-style route registrations: app.METHOD('path' or "path" */
const ROUTE_RE =
  /\b(?:app|router)\.(get|post|put|patch|delete|options|head|all)\s*\(\s*['"`]([^'"`]+)['"`]/g;

function collectRoutes() {
  const files = [
    path.join(root, 'server.ts'),
    ...fs.readdirSync(path.join(root, 'server'))
      .filter((n) => /Routes\.ts$/.test(n) || n === 'server.ts')
      .map((n) => path.join(root, 'server', n)),
  ].filter((f) => fs.existsSync(f));

  const routes = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const fileRel = rel(file);
    ROUTE_RE.lastIndex = 0;
    let m;
    while ((m = ROUTE_RE.exec(text)) !== null) {
      routes.push({
        method: m[1].toUpperCase(),
        path: m[2],
        file: fileRel,
      });
    }
  }
  routes.sort((a, b) => {
    const c = a.path.localeCompare(b.path);
    if (c !== 0) return c;
    return a.method.localeCompare(b.method) || a.file.localeCompare(b.file);
  });
  return {
    generatedAt: null, // filled below
    generator: 'scripts/docsGenerateInventories.mjs',
    sourceFiles: [...new Set(routes.map((r) => r.file))].sort(),
    count: routes.length,
    routes,
  };
}

/** process.env.NAME and process.env['NAME'] / process.env["NAME"] */
const ENV_DOT_RE = /process\.env\.([A-Z][A-Z0-9_]*)/g;
const ENV_BRACKET_RE = /process\.env\[\s*['"]([A-Z][A-Z0-9_]*)['"]\s*\]/g;

function collectEnv() {
  const files = walkTs(root).filter((f) => {
    const r = rel(f);
    return !r.startsWith('tests/') && !r.startsWith('scripts/');
  });
  /** @type {Map<string, Set<string>>} */
  const byName = new Map();
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const fileRel = rel(file);
    for (const re of [ENV_DOT_RE, ENV_BRACKET_RE]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        const name = m[1];
        if (!byName.has(name)) byName.set(name, new Set());
        byName.get(name).add(fileRel);
      }
    }
  }
  const variables = [...byName.entries()]
    .map(([name, filesSet]) => ({
      name,
      files: [...filesSet].sort(),
      fileCount: filesSet.size,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    generatedAt: null,
    generator: 'scripts/docsGenerateInventories.mjs',
    note: 'Names discovered via static scan of process.env in application sources (excludes tests/ and scripts/). Not a claim that every name is required at runtime.',
    count: variables.length,
    variables,
  };
}

function collectMigrations() {
  const dir = path.join(root, 'migrations');
  if (!fs.existsSync(dir)) {
    return {
      generatedAt: null,
      generator: 'scripts/docsGenerateInventories.mjs',
      count: 0,
      migrations: [],
    };
  }
  const migrations = fs
    .readdirSync(dir)
    .filter((n) => n.endsWith('.sql'))
    .sort()
    .map((name) => {
      const full = path.join(dir, name);
      const text = fs.readFileSync(full, 'utf8');
      return {
        file: `migrations/${name}`,
        bytes: Buffer.byteLength(text, 'utf8'),
        lines: text.split(/\r?\n/).length,
      };
    });
  return {
    generatedAt: null,
    generator: 'scripts/docsGenerateInventories.mjs',
    count: migrations.length,
    migrations,
  };
}

function writeJson(name, data) {
  const stamped = { ...data, generatedAt: new Date().toISOString().slice(0, 19) + 'Z' };
  const target = path.join(outDir, name);
  fs.mkdirSync(outDir, { recursive: true });
  // Stable stringify: pretty, trailing newline
  fs.writeFileSync(target, JSON.stringify(stamped, null, 2) + '\n', 'utf8');
  return { file: rel(target), count: data.count };
}

const routes = collectRoutes();
const env = collectEnv();
const migrations = collectMigrations();

const written = [
  writeJson('generated-route-inventory.json', routes),
  writeJson('generated-env-inventory.json', env),
  writeJson('generated-migration-inventory.json', migrations),
];

console.log('docs:generate inventories');
for (const w of written) {
  console.log(`  ${w.file} (${w.count})`);
}
console.log('docs:generate OK');
