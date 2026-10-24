/**
 * Shared helpers for architecture map, boundary checks and change impact.
 * Static analysis only — does not execute application code.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))?\s*from\s+['"]([^'"]+)['"]/g;
const SIDE_IMPORT_RE = /import\s+['"]([^'"]+)['"]/g;

const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-server', '.git', 'artifacts']);

/** @returns {string[]} relative paths of .ts/.tsx under root */
export function listSourceFiles() {
  const out = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name.startsWith('.') && ent.name !== '.') continue;
      if (SKIP_DIRS.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(ent.name) && !ent.name.endsWith('.d.ts')) {
        out.push(path.relative(root, full).replace(/\\/g, '/'));
      }
    }
  }
  walk(root);
  return out.sort();
}

function tryResolve(baseDir, imp) {
  if (!imp.startsWith('.')) return null;
  const abs = path.normalize(path.join(baseDir, imp));
  const candidates = [
    abs,
    abs + '.ts',
    abs + '.tsx',
    abs + '.js',
    abs + '.mjs',
    path.join(abs, 'index.ts'),
    path.join(abs, 'index.tsx'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return path.relative(root, c).replace(/\\/g, '/');
    }
  }
  return path.relative(root, abs).replace(/\\/g, '/');
}

/**
 * @param {string} relPath module path relative to root
 * @returns {{ imports: string[], unresolved: string[] }}
 */
export function parseImports(relPath) {
  const full = path.join(root, relPath);
  const text = fs.readFileSync(full, 'utf8');
  const baseDir = path.dirname(full);
  const imports = new Set();
  const unresolved = [];
  const specs = [];
  for (const re of [IMPORT_RE, SIDE_IMPORT_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) specs.push(m[1]);
  }
  for (const spec of specs) {
    if (!spec.startsWith('.')) continue;
    const resolved = tryResolve(baseDir, spec);
    if (!resolved) {
      unresolved.push(spec);
      continue;
    }
    if (resolved !== relPath) imports.add(resolved);
  }
  return { imports: [...imports].sort(), unresolved };
}

/**
 * Build directed import graph for all source files.
 * @returns {{ modules: string[], edges: Record<string, string[]>, lines: Record<string, number> }}
 */
export function buildGraph() {
  const modules = listSourceFiles();
  const edges = {};
  const lines = {};
  for (const mod of modules) {
    const full = path.join(root, mod);
    const text = fs.readFileSync(full, 'utf8');
    lines[mod] = text.split(/\r?\n/).length;
    const { imports } = parseImports(mod);
    edges[mod] = imports.filter((i) => modules.includes(i) || fs.existsSync(path.join(root, i)));
  }
  return { modules, edges, lines };
}

/**
 * Find simple cycles via DFS. Returns unique cycle path arrays (node sequences ending at start).
 * @param {Record<string, string[]>} edges
 * @returns {string[][]}
 */
export function findCycles(edges) {
  const cycles = [];
  const seenKeys = new Set();
  const visited = new Set();

  function dfs(node, path, pathSet) {
    if (pathSet.has(node)) {
      const idx = path.indexOf(node);
      const cyc = path.slice(idx).concat(node);
      if (new Set(cyc).size > 1) {
        const key = [...new Set(cyc)].sort().join('\0');
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          cycles.push(cyc);
        }
      }
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    path.push(node);
    pathSet.add(node);
    for (const nei of edges[node] || []) {
      dfs(nei, path, pathSet);
    }
    path.pop();
    pathSet.delete(node);
  }

  for (const n of Object.keys(edges)) {
    dfs(n, [], new Set());
  }
  return cycles;
}

/** Canonical cycle key for ratchet comparison */
export function cycleKey(cyclePath) {
  return [...new Set(cyclePath)].sort().join(' | ');
}

/**
 * Layer of a module path for boundary rules.
 * @param {string} rel
 * @returns {'server'|'src'|'test'|'script'|'appBuilder'|'other'}
 */
export function layerOf(rel) {
  if (rel === 'server.ts' || rel.startsWith('server/')) return 'server';
  if (rel.startsWith('src/')) return 'src';
  if (rel.startsWith('tests/')) return 'test';
  if (rel.startsWith('scripts/')) return 'script';
  if (rel.startsWith('appBuilder/')) return 'appBuilder';
  return 'other';
}

export function readJson(rel, fallback = null) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return fallback;
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

export function writeJson(rel, data) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export function ensureDir(rel) {
  fs.mkdirSync(path.join(root, rel), { recursive: true });
}
