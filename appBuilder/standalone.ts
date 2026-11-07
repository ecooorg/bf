/**
 * P127.30 — "tap index.html and it runs" (no web server).
 *
 * Browsers refuse external `<script type="module" src>` from file:// and Android `content://` hands the page over
 * without its sibling files, so a multi-file package shows an unstyled, dead page. This builds ONE self-contained
 * index.html: local stylesheets inlined, local classic scripts inlined, and every local ES module compiled into a
 * small CommonJS registry inside a single inline script. Bare/URL imports (for example three.js through the import
 * map) stay real ES imports of one inline module script, which file:// allows.
 *
 * Pure and deterministic: no model calls, no network, no filesystem.
 */
import ts from 'typescript';
import vm from 'node:vm';

export type StandaloneMode = 'unchanged' | 'classic' | 'module';
export interface StandaloneResult {
  html: string;
  mode: StandaloneMode;
  changed: boolean;
  modules: number;
  externals: string[];
  warnings: string[];
}

type Files = Map<string, string>;

const isRemote = (s: string): boolean => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(s);

function resolveLocal(fromPath: string, spec: string, files: Files): string | null {
  const clean = spec.split(/[?#]/)[0];
  const parts = clean.startsWith('/') ? [] : fromPath.split('/').slice(0, -1);
  for (const seg of clean.replace(/^\/+/, '').split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  const p = parts.join('/');
  for (const cand of [p, `${p}.js`, `${p}.mjs`, `${p}/index.js`]) if (files.has(cand)) return cand;
  return null;
}

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
}

const escScript = (code: string): string => code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const escStyle = (css: string): string => css.replace(/<\/style/gi, '<\\/style');

function compileModules(entries: string[], files: Files, warnings: string[]): { defs: Map<string, string>; externals: string[] } {
  const defs = new Map<string, string>();
  const externals = new Set<string>();
  const queue = [...entries];
  while (queue.length) {
    const path = queue.shift()!;
    if (defs.has(path)) continue;
    const source = files.get(path);
    if (source === undefined) { warnings.push(`module not found: ${path}`); continue; }
    if (/\bimport\.meta\b/.test(source)) throw new Error(`import.meta is used in ${path}; it cannot be bundled`);
    const out = ts.transpileModule(source, {
      fileName: path,
      reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true, allowJs: true, newLine: ts.NewLineKind.LineFeed, removeComments: false },
    });
    const bad = (out.diagnostics ?? []).find((d) => d.category === ts.DiagnosticCategory.Error);
    if (bad) throw new Error(`${path}: ${ts.flattenDiagnosticMessageText(bad.messageText, ' ').slice(0, 160)}`);
    defs.set(path, out.outputText);
    for (const m of out.outputText.matchAll(/\brequire\(\s*(["'])([^"']+)\1\s*\)/g)) {
      const spec = m[2];
      if (isRemote(spec) || !/^(?:\.{1,2}\/|\/)/.test(spec)) { externals.add(spec); continue; }
      const resolved = resolveLocal(path, spec, files);
      if (!resolved) warnings.push(`unresolved import '${spec}' in ${path}`);
      else queue.push(resolved);
    }
  }
  return { defs, externals: [...externals] };
}

function registrySource(defs: Map<string, string>, entries: string[], externals: string[]): { body: string; header: string } {
  const defText = [...defs].map(([p, code]) => `${JSON.stringify(p)}: function (module, exports, require) {\n${code}\n}`).join(',\n');
  const header = externals.map((e, i) => `import * as __x${i} from ${JSON.stringify(e)};`).join('\n');
  const extText = externals.map((e, i) => `${JSON.stringify(e)}: __ns(__x${i})`).join(', ');
  const body = `(function () {
"use strict";
function __ns(n) { return Object.assign({ __esModule: true }, n); }
var __ext = {${extText}};
var __defs = {
${defText}
};
var __cache = {};
function __resolve(from, spec) {
  var clean = spec.split(/[?#]/)[0];
  var parts = clean.charAt(0) === "/" ? [] : from.split("/").slice(0, -1);
  clean.replace(/^\\/+/, "").split("/").forEach(function (seg) {
    if (seg === "" || seg === ".") return;
    if (seg === "..") parts.pop(); else parts.push(seg);
  });
  var p = parts.join("/");
  var cands = [p, p + ".js", p + ".mjs", p + "/index.js"];
  for (var i = 0; i < cands.length; i++) if (Object.prototype.hasOwnProperty.call(__defs, cands[i])) return cands[i];
  return null;
}
function __req(from, spec) {
  if (Object.prototype.hasOwnProperty.call(__ext, spec)) return __ext[spec];
  var r = __resolve(from, spec);
  if (!r) throw new Error("Cannot find module '" + spec + "' from '" + from + "'");
  return __load(r);
}
function __load(path) {
  if (__cache[path]) return __cache[path].exports;
  var m = (__cache[path] = { exports: {} });
  __defs[path].call(m.exports, m, m.exports, function (spec) { return __req(path, spec); });
  return m.exports;
}
${JSON.stringify(entries)}.forEach(__load);
})();`;
  return { body, header };
}

function scanWarnings(files: Files, warnings: string[]): void {
  for (const [path, src] of files) {
    if (!/\.(?:m?js)$/i.test(path)) continue;
    if (/\bfetch\(\s*['"`](?!https?:|data:|blob:|\/\/)/.test(src)) warnings.push(`${path}: fetch() of a local file does not work when index.html is opened directly`);
    if (/\bnew\s+Worker\(\s*['"`](?!https?:|data:|blob:)/.test(src)) warnings.push(`${path}: Web Worker from a local file does not work when index.html is opened directly`);
    if (/\bXMLHttpRequest\b/.test(src) && /\.open\(\s*['"`]GET['"`]\s*,\s*['"`](?!https?:)/.test(src)) warnings.push(`${path}: XMLHttpRequest of a local file does not work when index.html is opened directly`);
  }
}

/** Returns null only when there is no index.html; throws nothing (failures become mode 'unchanged' + warnings). */
export function buildStandaloneIndex(files: Files): StandaloneResult | null {
  const original = files.get('index.html');
  if (original === undefined) return null;
  const warnings: string[] = [];
  const unchanged = (): StandaloneResult => ({ html: original, mode: 'unchanged', changed: false, modules: 0, externals: [], warnings });
  try {
    let html = original;
    let changed = false;
    const moduleEntries: string[] = [];
    let inlineIndex = 0;

    html = html.replace(/<link\b[^>]*>/gi, (tag) => {
      const rel = attr(tag, 'rel') ?? '';
      const href = attr(tag, 'href');
      if (!/\bstylesheet\b/i.test(rel) || !href || isRemote(href)) return tag;
      const target = resolveLocal('index.html', href, files);
      const css = target ? files.get(target) : undefined;
      if (css === undefined) { warnings.push(`stylesheet not found: ${href}`); return tag; }
      if (/@import\s+(?:url\()?['"]?(?!https?:|data:)/i.test(css)) warnings.push(`${target}: @import of a local stylesheet is not inlined`);
      changed = true;
      return `<style data-source="${target}">\n${escStyle(css)}\n</style>`;
    });

    html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, (whole, attrs: string, inner: string) => {
      const tag = `<script${attrs}>`;
      const type = (attr(tag, 'type') ?? '').toLowerCase();
      const src = attr(tag, 'src');
      if (type === 'importmap') return whole;
      const isModule = type === 'module';
      if (src) {
        if (isRemote(src)) return whole;
        const target = resolveLocal('index.html', src, files);
        if (!target) { warnings.push(`script not found: ${src}`); return whole; }
        changed = true;
        if (isModule) { moduleEntries.push(target); return ''; }
        return `<script data-source="${target}">\n${escScript(files.get(target)!)}\n</script>`;
      }
      if (isModule && inner.trim()) {
        const virtual = `__inline_${inlineIndex++}.js`;
        files.set(virtual, inner);
        moduleEntries.push(virtual);
        changed = true;
        return '';
      }
      return whole;
    });

    let mode: StandaloneMode = changed ? 'classic' : 'unchanged';
    let modules = 0;
    let externals: string[] = [];
    if (moduleEntries.length) {
      const { defs, externals: ext } = compileModules(moduleEntries, files, warnings);
      externals = ext;
      modules = defs.size;
      const { body, header } = registrySource(defs, moduleEntries, ext);
      try { new vm.Script(body); } catch (e) { throw new Error(`generated bundle does not parse: ${(e as Error).message}`); }
      const useModule = ext.length > 0;
      mode = useModule ? 'module' : 'classic';
      const script = `<script${useModule ? ' type="module"' : ''} data-bundle="${moduleEntries.join(',')}">\n${escScript(useModule ? `${header}\n${body}` : body)}\n</script>`;
      html = /<\/body\s*>/i.test(html) ? html.replace(/<\/body\s*>(?![\s\S]*<\/body\s*>)/i, `${script}\n</body>`) : `${html}\n${script}\n`;
    }
    for (const k of [...files.keys()]) if (k.startsWith('__inline_')) files.delete(k);
    if (!changed) return unchanged();
    scanWarnings(files, warnings);
    return { html, mode, changed, modules, externals, warnings };
  } catch (e) {
    for (const k of [...files.keys()]) if (k.startsWith('__inline_')) files.delete(k);
    warnings.push(`standalone build skipped: ${String((e as Error).message).slice(0, 200)}`);
    return unchanged();
  }
}

/** Archive layout helper: standalone index.html at the root, original sources under source/. */
export const STANDALONE_SOURCE_DIR = 'source/';

/** Continuation helper: which archive paths are the editable sources, and what are they called in the project. */
export function continuationPathMap(paths: string[]): Map<string, string> {
  const map = new Map<string, string>();
  const hasSourceDir = paths.includes(`${STANDALONE_SOURCE_DIR}index.html`);
  for (const p of paths) {
    if (!hasSourceDir) { map.set(p, p); continue; }
    if (p.startsWith(STANDALONE_SOURCE_DIR)) map.set(p, p.slice(STANDALONE_SOURCE_DIR.length));
  }
  return map;
}
