// P106/P107: deterministic check graph generated from code and docs/verification-manifest.json: check -> test/script files -> source modules.
//   node scripts/statusGraph.mjs                 write docs/generated-check-graph.json
//   node scripts/statusGraph.mjs --check         exit 1 when the committed file is stale
//   node scripts/statusGraph.mjs --overlay <dir> write artifacts/qa/status-graph-run.json with last statuses from <dir>/results.json
//   --out <file> overrides the output path.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapLegacyStatus } from './evidenceLib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const DEFAULT_OUT = path.join(root, 'docs', 'generated-check-graph.json');
const SOURCE_RE = /(?:server|src|scripts|appBuilder)\/[A-Za-z0-9_./-]+\.(?:ts|tsx|mjs)/g;
const FILE_RE = /(?:tests|scripts)\/[A-Za-z0-9_./-]+\.(?:mjs|ts)/g;
const exists = (rel) => fs.existsSync(path.join(root, rel));
const readText = (rel) => { try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch { return ''; } };

function importedModules(rel) {
  const text = readText(rel);
  const found = new Set();
  for (const m of text.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)["'](\.{1,2}\/[^"']+)["']/g)) {
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1]));
    for (const candidate of [resolved, `${resolved}.ts`, `${resolved}.mjs`, `${resolved}.tsx`]) if (exists(candidate) && /\.(ts|tsx|mjs)$/.test(candidate)) { found.add(candidate); break; }
  }
  for (const m of text.matchAll(SOURCE_RE)) if (exists(m[0])) found.add(m[0]);
  found.delete(rel);
  return [...found];
}

export function buildGraph() {
  const pkg = JSON.parse(readText('package.json'));
  const manifest = JSON.parse(readText('docs/verification-manifest.json'));
  const checks = manifest.checks.map((raw) => {
    const c = { ...manifest.defaults, ...raw };
    const npmScript = c.argv[0] === 'npm' && c.argv[1] === 'run' ? c.argv[2] : null;
    const command = npmScript && pkg.scripts?.[npmScript] ? String(pkg.scripts[npmScript]) : c.argv.join(' ');
    const files = [...new Set(command.match(FILE_RE) || [])].filter(exists).sort();
    const modules = new Set();
    for (const f of files) { for (const m of importedModules(f)) modules.add(m); if (/^scripts\//.test(f)) modules.add(f); }
    return { id: c.id, command, needs: c.needs, profiles: c.profiles, files, modules: [...modules].sort() };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const moduleIndex = {};
  for (const c of checks) for (const m of c.modules) (moduleIndex[m] ||= []).push(c.id);
  const modules = Object.fromEntries(Object.keys(moduleIndex).sort().map((k) => [k, moduleIndex[k].sort()]));
  return { schemaVersion: 1, kind: 'check-graph', description: 'check -> files run by the check -> source modules those files import or read. Deterministic; regenerate with npm run status:graph.', checks, modules };
}

const render = (graph) => JSON.stringify(graph, null, 2) + '\n';
const norm = (id) => String(id).replace(/:/g, '-');

function main() {
  const graph = buildGraph();
  if (args.includes('--check')) {
    const target = path.resolve(opt('--out') || DEFAULT_OUT);
    let current = '';
    try { current = fs.readFileSync(target, 'utf8'); } catch {}
    if (current !== render(graph)) { console.error(`${path.relative(root, target)} is stale or missing; run npm run status:graph`); process.exitCode = 1; return; }
    console.log('check graph is current'); return;
  }
  if (opt('--overlay')) {
    const dir = path.resolve(opt('--overlay'));
    let rows = [];
    try { rows = JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8')).results || []; } catch {}
    const byId = new Map(rows.map((r) => [norm(r.id), mapLegacyStatus(r.status)]));
    const run = { ...graph, kind: 'check-graph-run', checks: graph.checks.map((c) => ({ ...c, lastStatus: byId.get(norm(c.id)) || 'NOT_RUN' })) };
    const out = path.resolve(opt('--out') || path.join(root, 'artifacts', 'qa', 'status-graph-run.json'));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, render(run));
    console.log(`wrote ${path.relative(root, out)} (${run.checks.length} checks)`); return;
  }
  const out = path.resolve(opt('--out') || DEFAULT_OUT);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, render(graph));
  console.log(`wrote ${path.relative(root, out)} (${graph.checks.length} checks, ${Object.keys(graph.modules).length} modules)`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
