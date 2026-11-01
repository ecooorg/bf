/** Static validators for the static_site stack. Source is parsed/compiled only, never run. */
import ts from 'typescript';
import { isSafePath } from './core-plan.ts';
import type { ReportValidator, Spec } from './core-types.ts';
import { MAX_FILES, MAX_TOTAL_BYTES } from './stack-static-site.ts';

export type FileMap = Map<string, string>;
export const REQUIRED_VALIDATORS = ['html-structure', 'js-syntax', 'module-contracts', 'refs', 'size', 'secrets', 'acceptance', 'dom-wiring'] as const;
type Issue = ReportValidator['issues'][number];
const result = (name: string, issues: Issue[]): ReportValidator => ({ name, ok: issues.length === 0, issues });
const VOID = new Set(['meta', 'link', 'br', 'hr', 'img', 'input', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr']);
const strip = (h: string) => h.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, (m) => m.replace(/>[\s\S]*<\/(script|style)\s*>$/i, '></$1>'));

export function validateHtml(files: FileMap): ReportValidator {
  const issues: Issue[] = [];
  for (const [path, src] of files) {
    if (!/\.html?$/i.test(path)) continue;
    if (!/<!doctype html/i.test(src)) issues.push({ path, message: 'missing <!doctype html>' });
    for (const t of ['html', 'body']) if (!new RegExp(`<${t}[\\s>]`, 'i').test(src) || !new RegExp(`</${t}\\s*>`, 'i').test(src)) issues.push({ path, message: `missing or unclosed <${t}>` });
    const stack: string[] = [];
    for (const m of strip(src).matchAll(/<(\/?)([a-z][a-z0-9-]*)\b[^>]*?(\/?)>/gi)) {
      const [, close, raw, self] = m; const tag = raw.toLowerCase();
      if (VOID.has(tag) || self) continue;
      if (!close) { stack.push(tag); continue; }
      const i = stack.lastIndexOf(tag);
      if (i < 0) { issues.push({ path, message: `unexpected </${tag}>` }); continue; }
      for (const open of stack.splice(i).slice(1)) issues.push({ path, message: `unclosed <${open}>` });
    }
    for (const open of stack) issues.push({ path, message: `unclosed <${open}>` });
  }
  return result('html-structure', issues);
}

export function validateJs(files: FileMap): ReportValidator {
  const issues: Issue[] = [];
  for (const [path, src] of files) {
    if (!/\.(?:m?js|cjs)$/i.test(path)) continue;
    // Parse as an ES module. vm.Script treated valid import/export syntax as a syntax
    // error ("Cannot use import statement outside a module"), causing destructive repairs.
    const parsed = ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    for (const diagnostic of (parsed as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics) {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
      const at = diagnostic.start == null ? '' : ` at offset ${diagnostic.start}`;
      issues.push({ path, message: `${message}${at}` });
    }
  }
  return result('js-syntax', issues);
}

/** Resolve local ES-module imports against generated files and verify named exports. */
export function validateModuleContracts(files: FileMap): ReportValidator {
  const issues: Issue[] = [];
  const resolve = (from: string, spec: string): string | null => {
    if (!spec.startsWith('.')) return null; // browser/bare imports are checked by deployment policy
    const base = spec.startsWith('/') ? spec.slice(1) : `${from.split('/').slice(0, -1).join('/')}/${spec}`;
    const normalized: string[] = [];
    for (const part of base.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') { if (!normalized.length) return null; normalized.pop(); }
      else normalized.push(part);
    }
    const candidate = normalized.join('/');
    for (const p of [candidate, candidate + '.js', candidate + '.mjs', candidate + '/index.js']) if (files.has(p)) return p;
    return null;
  };
  const exportNames = (src: ts.SourceFile): Set<string> => {
    const names = new Set<string>();
    for (const st of src.statements) {
      const mods = ts.canHaveModifiers(st) ? ts.getModifiers(st) : undefined;
      const exported = !!mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      const isDefault = !!mods?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
      if (exported) {
        if (isDefault) names.add('default');
        if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) && st.name) names.add(st.name.text);
        if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) names.add(d.name.text);
      }
      if (ts.isExportAssignment(st)) names.add('default');
      if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause)) {
        for (const el of st.exportClause.elements) names.add(el.name.text);
      }
    }
    return names;
  };
  const parsed = new Map<string, ts.SourceFile>();
  for (const [path, src] of files) if (/\.(?:m?js)$/i.test(path)) parsed.set(path, ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS));
  // Module syntax must be loaded by a module script; classic script tags cannot execute imports.
  for (const [htmlPath, html] of files) {
    if (!/\.html?$/i.test(htmlPath)) continue;
    for (const m of html.matchAll(/<script\b([^>]*)\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
      const attrs = m[1] + m[0].slice(m[0].indexOf('src'));
      const src = m[2].replace(/^\.\//, '').split(/[?#]/)[0];
      const jsPath = resolve(htmlPath, m[2]) ?? (files.has(src) ? src : null);
      if (!jsPath || !parsed.has(jsPath)) continue;
      const source = files.get(jsPath) || '';
      if (/\b(?:import\s+(?:[^(']|\()|export\s+(?:default|\{|const|let|var|function|class|async))/.test(source) && !/\btype\s*=\s*["']module["']/i.test(attrs)) {
        issues.push({ path: htmlPath, message: `module file '${m[2]}' must be loaded with <script type="module">` });
      }
    }
  }
  for (const [path, sf] of parsed) {
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
      const spec = st.moduleSpecifier.text;
      if (!spec.startsWith('.')) continue;
      const target = resolve(path, spec);
      if (!target) { issues.push({ path, message: `unresolved local module import: ${spec}` }); continue; }
      const clause = st.importClause;
      if (!clause) continue;
      const available = exportNames(parsed.get(target) ?? ts.createSourceFile(target, files.get(target)!, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS));
      if (clause.name && !available.has('default')) issues.push({ path, message: `${spec} has no default export` });
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const el of clause.namedBindings.elements) {
          const imported = (el.propertyName ?? el.name).text;
          if (!available.has(imported)) issues.push({ path, message: `${spec} does not export '${imported}'` });
        }
      }
    }
  }
  return result('module-contracts', issues);
}

export function validateRefs(files: FileMap): ReportValidator {
  const issues: Issue[] = [];
  for (const [path, src] of files) {
    if (!/\.html?$/i.test(path)) continue;
    for (const m of src.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
      const ref = m[1].trim();
      if (/^(#|mailto:|tel:|data:|javascript:)/i.test(ref)) { if (/^javascript:/i.test(ref)) issues.push({ path, message: `javascript: URL not allowed: ${ref}` }); continue; }
      if (/^(https?:)?\/\//i.test(ref)) { issues.push({ path, message: `external reference not allowed: ${ref}` }); continue; }
      const target = ref.replace(/^\.\//, '').split(/[?#]/)[0];
      if (!isSafePath(target) || !files.has(target)) issues.push({ path, message: `reference does not resolve to a generated file: ${ref}` });
    }
  }
  return result('refs', issues);
}

export function validateSize(files: FileMap): ReportValidator {
  const issues: Issue[] = []; let total = 0;
  const enc = new TextEncoder();
  for (const [path, src] of files) {
    const n = enc.encode(src).byteLength; total += n;
    if (!isSafePath(path)) issues.push({ path, message: 'unsafe path' });
    if (src.trim() === '') issues.push({ path, message: 'file is empty' });
  }
  if (files.size > MAX_FILES) issues.push({ message: `too many files: ${files.size} > ${MAX_FILES}` });
  if (total > MAX_TOTAL_BYTES) issues.push({ message: `total size ${total} exceeds ${MAX_TOTAL_BYTES}` });
  return result('size', issues);
}

const SECRET_RES: Array<[RegExp, string]> = [
  [/AIza[0-9A-Za-z_-]{30,}/, 'Google API key'], [/\bsk-[A-Za-z0-9_-]{20,}/, 'secret key (sk-)'], [/\bgh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'], [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\b(?:api[_-]?key|secret|password|token)\b\s*[:=]\s*["'][A-Za-z0-9_\-/+=]{16,}["']/i, 'credential-like assignment'],
];
export function validateSecrets(files: FileMap): ReportValidator {
  const issues: Issue[] = [];
  for (const [path, src] of files) for (const [re, label] of SECRET_RES) if (re.test(src)) issues.push({ path, message: `possible ${label}` });
  return result('secrets', issues);
}

/** Optional: keywords from the task; never required for goalImplemented. */
export function validateGoalKeywords(files: FileMap, keywords: string[]): ReportValidator {
  const all = [...files.values()].join('\n').toLowerCase();
  return result('goal-keywords', keywords.filter((k) => !all.includes(k.toLowerCase())).map((k) => ({ message: `keyword not found: ${k}` })));
}

/** Deterministic acceptance predicates: has_file:p, html_has:p:token, js_contains:p:token. Unknown → unsupported (fails). */
export function checkAcceptance(files: FileMap, acceptance: string[]): ReportValidator {
  const issues: Issue[] = [];
  for (const raw of acceptance) {
    const p = raw.trim();
    const has = /^has_file:(.+)$/.exec(p);
    const html = /^html_has:([^:]+):(.+)$/.exec(p);
    const js = /^js_contains:([^:]+):(.+)$/.exec(p);
    if (has) { if (!files.has(has[1])) issues.push({ path: has[1], message: `${p}: file missing` }); }
    else if (html || js) {
      const m = (html ?? js)!; const src = files.get(m[1]);
      if (src === undefined) issues.push({ path: m[1], message: `${p}: file missing` });
      else if (!src.includes(m[2]) && !(html && /^[#.][\w-]+$/.test(m[2]) && new RegExp(`${m[2][0] === '#' ? 'id' : 'class'}\\s*=\\s*["'][^"']*\\b${m[2].slice(1)}\\b`, 'i').test(src)) && !(html && /^[a-z][a-z0-9]*$/i.test(m[2]) && new RegExp(`<${m[2]}\\b`, 'i').test(src))) issues.push({ path: m[1], message: `${p}: not found` });
    } else if (/^[a-z_]+:/.test(p)) issues.push({ message: `${p}: unsupported predicate` });
    // free-text human criteria are not machine-checked; they are not silently counted as passed in goal text.
  }
  return result('acceptance', issues);
}


/** IDs referenced via getElementById / querySelector('#id') / querySelectorAll('#id') must exist in some HTML file. Static literals only; dynamic or class selectors are ignored. */
export function validateDomWiring(files: FileMap): ReportValidator {
  const issues: Issue[] = [];
  const htmlIds = new Set<string>();
  for (const [path, src] of files) {
    if (!/\.html?$/i.test(path)) continue;
    for (const m of src.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) htmlIds.add(m[1]);
  }
  const idFromSelector = (sel: string): string | null => {
    const s = sel.trim();
    if (/^#[\w-]+$/.test(s)) return s.slice(1);
    return null;
  };
  for (const [path, src] of files) {
    if (!/\.js$/i.test(path)) continue;
    const propertyBindings = new Map<string, Set<string>>();
    for (const m of src.matchAll(/\bthis\.([A-Za-z_$][\w$]*)\s*=\s*(?:document\.)?getElementById\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const [, property, id] = m;
      if (!htmlIds.has(id)) issues.push({ path, message: `getElementById('${id}'): no element with this id in HTML` });
      const properties = propertyBindings.get(id) ?? new Set<string>();
      properties.add(property);
      propertyBindings.set(id, properties);
    }
    // Distinct controller roles must not be silently collapsed onto one DOM node by a repair.
    // Reusing a node is sometimes intentional, so only flag multiple explicit `this.*` bindings
    // when their property names differ; the generated app should use semantically matching ids.
    for (const [id, properties] of propertyBindings) {
      if (properties.size > 1) {
        issues.push({ path, message: `DOM id '${id}' is bound to multiple controller properties: ${[...properties].join(', ')}` });
      }
    }
    for (const m of src.matchAll(/\.getElementById\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const id = m[1];
      if (!htmlIds.has(id) && !issues.some((issue) => issue.path === path && issue.message.includes(`getElementById('${id}')`))) {
        issues.push({ path, message: `getElementById('${id}'): no element with this id in HTML` });
      }
    }
    for (const m of src.matchAll(/\.querySelector(?:All)?\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const id = idFromSelector(m[1]);
      if (id && !htmlIds.has(id)) issues.push({ path, message: `querySelector('${m[1]}'): no element with id '${id}' in HTML` });
    }
  }
  return result('dom-wiring', issues);
}

export function runStaticValidators(files: FileMap, spec: Spec | null): ReportValidator[] {
  return [validateHtml(files), validateJs(files), validateModuleContracts(files), validateRefs(files), validateSize(files), validateSecrets(files), checkAcceptance(files, spec?.acceptance ?? []), validateDomWiring(files)];
}
