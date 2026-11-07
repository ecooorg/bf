/** Static validators for the static_site stack. Source is parsed/compiled only, never run. */
import ts from 'typescript';
import { isSafePath } from './core-plan.ts';
import type { ReportValidator, Spec } from './core-types.ts';
import { MAX_FILES, MAX_TOTAL_BYTES } from './stack-static-site.ts';

export type FileMap = Map<string, string>;
/** Required for SUCCESS. Includes reachability, completeness, member-contracts (P127.9–P127.10). */
export const REQUIRED_VALIDATORS = [
  'html-structure',
  'js-syntax',
  'module-contracts',
  'refs',
  'size',
  'secrets',
  'acceptance',
  'dom-wiring',
  'reachability',
  'completeness',
  'member-contracts',
  'type-contracts',
] as const;
type Issue = ReportValidator['issues'][number];
const result = (name: string, issues: Issue[]): ReportValidator => ({ name, ok: issues.length === 0, issues });
const VOID = new Set(['meta', 'link', 'br', 'hr', 'img', 'input', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr']);
const strip = (h: string) => h.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, (m) => m.replace(/>[\s\S]*<\/(script|style)\s*>$/i, '></$1>'));
/** Paths that may exist without being linked from the entry HTML (docs / machine report). */
const REACHABILITY_EXEMPT = /^(readme\.md|license(?:\..+)?|build-report\.json|changelog\.md|robots\.txt|favicon\.ico)$/i;

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
  for (const [path, src] of files) {
    if (/\.tsx?$/i.test(path)) issues.push({ path, message: 'TypeScript source is not executable in the static_site stack; provide compiled browser JavaScript or use a build-enabled stack' });
    else if (/\.(?:m?js)$/i.test(path)) parsed.set(path, ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS));
  }
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
  const resolveHtmlReference = (htmlPath: string, rawRef: string): string | null => {
    const clean = rawRef.split(/[?#]/, 1)[0].replace(/\\/g, '/');
    if (!clean) return null;
    // A leading slash is rooted at the generated project, not the host filesystem.
    const base = clean.startsWith('/') ? clean.slice(1) : `${htmlPath.split('/').slice(0, -1).join('/')}/${clean}`;
    const parts: string[] = [];
    for (const part of base.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') { if (!parts.length) return null; parts.pop(); }
      else parts.push(part);
    }
    const target = parts.join('/');
    return target && isSafePath(target) ? target : null;
  };
  for (const [path, src] of files) {
    if (!/\.html?$/i.test(path)) continue;
    for (const m of src.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
      const ref = m[1].trim();
      if (/^(#|mailto:|tel:|data:|javascript:)/i.test(ref)) { if (/^javascript:/i.test(ref)) issues.push({ path, message: `javascript: URL not allowed: ${ref}` }); continue; }
      if (/^(https?:)?\/\//i.test(ref)) { issues.push({ path, message: `external reference not allowed: ${ref}` }); continue; }
      const target = resolveHtmlReference(path, ref);
      if (!target || !files.has(target)) issues.push({ path, message: `reference does not resolve to a generated file: ${ref}` });
      else if (/\.tsx?$/i.test(target)) issues.push({ path, message: `static_site cannot execute TypeScript reference '${ref}'; use browser-compatible JavaScript or a configured build stack` });
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


/** IDs referenced via getElementById / querySelector('#id') / querySelectorAll('#id') must exist in some HTML file. Static literals only; dynamic or class selectors are ignored. Also scans inline <script> bodies. */
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
  const scanScript = (path: string, src: string) => {
    const propertyBindings = new Map<string, Set<string>>();
    for (const m of src.matchAll(/\bthis\.([A-Za-z_$][\w$]*)\s*=\s*(?:document\.)?getElementById\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const [, property, id] = m;
      if (!htmlIds.has(id)) issues.push({ path, message: `getElementById('${id}'): no element with this id in HTML` });
      const properties = propertyBindings.get(id) ?? new Set<string>();
      properties.add(property);
      propertyBindings.set(id, properties);
    }
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
  };
  for (const [path, src] of files) {
    if (/\.(?:m?js|cjs)$/i.test(path)) scanScript(path, src);
    if (/\.html?$/i.test(path)) {
      for (const m of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (/\bsrc\s*=/i.test(m[1])) continue;
        scanScript(`${path}#inline-script`, m[2]);
      }
    }
  }
  return result('dom-wiring', issues);
}

function resolveLocal(from: string, spec: string): string | null {
  if (!spec || /^(https?:)?\/\//i.test(spec) || /^(data:|mailto:|tel:|javascript:|#)/i.test(spec)) return null;
  const clean = spec.split(/[?#]/, 1)[0].replace(/\\/g, '/');
  if (!clean) return null;
  const base = clean.startsWith('/') ? clean.slice(1) : `${from.split('/').slice(0, -1).join('/')}/${clean}`;
  const parts: string[] = [];
  for (const part of base.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!parts.length) return null;
      parts.pop();
    } else parts.push(part);
  }
  return parts.join('/') || null;
}

/**
 * Every generated file (except exempt docs) must be reachable from an HTML entrypoint
 * via src/href links and relative ES-module imports. Catches orphaned modular files
 * left beside a self-contained index.html (observed on live Tetris builds).
 */
export function validateReachability(files: FileMap): ReportValidator {
  const issues: Issue[] = [];
  const htmlPaths = [...files.keys()].filter((p) => /\.html?$/i.test(p));
  if (htmlPaths.length === 0) {
    issues.push({ message: 'no HTML entrypoint; cannot verify deliverable reachability' });
    return result('reachability', issues);
  }
  const resolveInFiles = (from: string, spec: string): string | null => {
    const candidate = resolveLocal(from, spec);
    if (!candidate) return null;
    for (const p of [candidate, candidate + '.js', candidate + '.mjs', candidate + '/index.js']) {
      if (files.has(p)) return p;
    }
    return files.has(candidate) ? candidate : null;
  };
  const reachable = new Set<string>();
  const queue = [...htmlPaths];
  for (const h of htmlPaths) reachable.add(h);
  while (queue.length) {
    const path = queue.pop()!;
    const src = files.get(path);
    if (!src) continue;
    if (/\.html?$/i.test(path)) {
      for (const m of src.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
        const target = resolveInFiles(path, m[1].trim());
        if (target && !reachable.has(target)) {
          reachable.add(target);
          queue.push(target);
        }
      }
    }
    if (/\.(?:m?js|cjs)$/i.test(path)) {
      for (const m of src.matchAll(/\bfrom\s*["']([^"']+)["']/g)) {
        const target = resolveInFiles(path, m[1]);
        if (target && !reachable.has(target)) {
          reachable.add(target);
          queue.push(target);
        }
      }
      for (const m of src.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) {
        const target = resolveInFiles(path, m[1]);
        if (target && !reachable.has(target)) {
          reachable.add(target);
          queue.push(target);
        }
      }
    }
  }
  const orphaned: string[] = [];
  for (const path of files.keys()) {
    const base = path.split('/').pop() || path;
    if (REACHABILITY_EXEMPT.test(base)) continue;
    if (!reachable.has(path)) orphaned.push(path);
  }
  for (const path of orphaned.sort()) {
    issues.push({ path, message: `unreachable from any HTML entrypoint (orphaned deliverable file)` });
  }
  // Self-contained HTML + external JS that is never linked is the common false-SUCCESS pattern.
  for (const htmlPath of htmlPaths) {
    const html = files.get(htmlPath) || '';
    let inlineChars = 0;
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=/i.test(m[1])) continue;
      inlineChars += m[2].length;
    }
    if (inlineChars < 400) continue;
    const externalJs = [...files.keys()].filter((p) => /\.(?:m?js|cjs)$/i.test(p) && !reachable.has(p));
    if (externalJs.length) {
      issues.push({
        path: htmlPath,
        message: `HTML has a large inline script (${inlineChars} chars) while ${externalJs.length} external script(s) are unreachable: ${externalJs.slice(0, 6).join(', ')}`,
      });
    }
  }
  return result('reachability', issues);
}

/**
 * Detect truncated / incomplete sources that static parse may still accept or that
 * leave the package non-runnable (observed: mid-function cutoffs in renderer3D.ts).
 */
export function validateCompleteness(files: FileMap): ReportValidator {
  const issues: Issue[] = [];
  const balance = (src: string, open: string, close: string): number => {
    let n = 0;
    let inStr: string | null = null;
    let escaped = false;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (inStr) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (c === '\\' && inStr !== '`') {
          escaped = true;
          continue;
        }
        if (c === inStr) inStr = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        inStr = c;
        continue;
      }
      if (c === open) n++;
      else if (c === close) n--;
    }
    return n;
  };
  for (const [path, src] of files) {
    if (!src || !src.trim()) continue;
    const trimmed = src.replace(/\s+$/, '');
    if (/\.(?:m?js|cjs|ts|tsx)$/i.test(path)) {
      const braces = balance(src, '{', '}');
      const parens = balance(src, '(', ')');
      const brackets = balance(src, '[', ']');
      if (braces > 0) issues.push({ path, message: `likely truncated: ${braces} unclosed '{'` });
      if (parens > 0) issues.push({ path, message: `likely truncated: ${parens} unclosed '('` });
      if (brackets > 0) issues.push({ path, message: `likely truncated: ${brackets} unclosed '['` });
      if (/(?:\bfunction\b|\bconst\b|\blet\b|\breturn\b|\bimport\b|\bexport\b|\bif\s*\(|\belse\b)\s*$/.test(trimmed)) {
        issues.push({ path, message: 'likely truncated: file ends mid-statement' });
      }
      if (/[,=+\-*/.]\s*$/.test(trimmed) && !/\/\//.test(trimmed.split('\n').pop() || '')) {
        issues.push({ path, message: 'likely truncated: file ends with an operator or comma' });
      }
    }
    if (/\.html?$/i.test(path)) {
      if (!/<\/html\s*>/i.test(src)) issues.push({ path, message: 'likely truncated: missing </html>' });
      if (/<(?:div|section|main|body|script|style)\b[^>]*$/im.test(trimmed)) {
        issues.push({ path, message: 'likely truncated: file ends inside an open tag' });
      }
    }
    if (/\.css$/i.test(path)) {
      const braces = balance(src, '{', '}');
      if (braces > 0) issues.push({ path, message: `likely truncated: ${braces} unclosed '{'` });
    }
  }
  return result('completeness', issues);
}

/** List orphaned paths from a reachability validator result (for BuildReport). */
export function orphanedPathsFromReachability(v: ReportValidator | undefined): string[] {
  if (!v || v.name !== 'reachability') return [];
  return v.issues.map((i) => i.path).filter((p): p is string => Boolean(p) && !p.includes(' '));
}

type ClassSurface = { methods: Set<string>; props: Set<string> };

function collectClassSurfaces(sf: ts.SourceFile): Map<string, ClassSurface> {
  const out = new Map<string, ClassSurface>();
  const walkMembers = (members: ts.NodeArray<ts.ClassElement>, surface: ClassSurface) => {
    for (const m of members) {
      if (ts.isMethodDeclaration(m) && m.name && ts.isIdentifier(m.name)) surface.methods.add(m.name.text);
      if (ts.isConstructorDeclaration(m) && m.body) {
        for (const st of m.body.statements) {
          if (ts.isExpressionStatement(st) && ts.isBinaryExpression(st.expression) && st.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
            const left = st.expression.left;
            if (ts.isPropertyAccessExpression(left) && left.expression.kind === ts.SyntaxKind.ThisKeyword && ts.isIdentifier(left.name)) {
              surface.props.add(left.name.text);
            }
          }
        }
      }
      if ((ts.isPropertyDeclaration(m) || ts.isGetAccessorDeclaration(m)) && m.name && ts.isIdentifier(m.name)) {
        surface.props.add(m.name.text);
      }
      if (ts.isMethodDeclaration(m) && m.body) {
        const visit = (node: ts.Node) => {
          if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
            const left = node.left;
            if (ts.isPropertyAccessExpression(left) && left.expression.kind === ts.SyntaxKind.ThisKeyword && ts.isIdentifier(left.name)) {
              surface.props.add(left.name.text);
            }
          }
          ts.forEachChild(node, visit);
        };
        visit(m.body);
      }
    }
  };
  for (const st of sf.statements) {
    if (ts.isClassDeclaration(st) && st.name) {
      const surface: ClassSurface = { methods: new Set(), props: new Set() };
      walkMembers(st.members, surface);
      out.set(st.name.text, surface);
    }
  }
  return out;
}

function suggestSimilar(name: string, available: string[]): string | null {
  const lower = name.toLowerCase();
  for (const a of available) {
    if (a.toLowerCase() === lower) return a;
    if (a.toLowerCase() === `is${lower}` || lower === `is${a.toLowerCase()}`) return a;
    if (a.toLowerCase() === `get${lower}` || lower === `get${a.toLowerCase()}`) return a;
  }
  // edit distance 1–2 for short names
  for (const a of available) {
    if (Math.abs(a.length - name.length) > 2) continue;
    let diff = 0;
    const x = a.toLowerCase();
    const y = lower;
    const max = Math.max(x.length, y.length);
    for (let i = 0; i < max && diff <= 2; i++) if (x[i] !== y[i]) diff++;
    if (diff > 0 && diff <= 2) return a;
  }
  return null;
}

/**
 * Cross-file instance member check: after `import { Foo }` + `const x = new Foo()`,
 * accesses `x.bar` must match methods/props defined on class Foo (including `this.bar =` assignments).
 * Catches the observed `game.paused` vs `isPaused` class of defects.
 */
export function validateMemberContracts(files: FileMap): ReportValidator {
  const issues: Issue[] = [];
  const parsed = new Map<string, ts.SourceFile>();
  const surfacesByFile = new Map<string, Map<string, ClassSurface>>();
  for (const [path, src] of files) {
    if (!/\.(?:m?js|cjs)$/i.test(path)) continue;
    const sf = ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    parsed.set(path, sf);
    surfacesByFile.set(path, collectClassSurfaces(sf));
  }
  const resolve = (from: string, spec: string): string | null => {
    if (!spec.startsWith('.')) return null;
    const base = spec.startsWith('/') ? spec.slice(1) : `${from.split('/').slice(0, -1).join('/')}/${spec}`;
    const normalized: string[] = [];
    for (const part of base.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (!normalized.length) return null;
        normalized.pop();
      } else normalized.push(part);
    }
    const candidate = normalized.join('/');
    for (const p of [candidate, candidate + '.js', candidate + '.mjs', candidate + '/index.js']) if (files.has(p)) return p;
    return null;
  };
  for (const [path, sf] of parsed) {
    // localName -> { file, className }
    const importedClasses = new Map<string, { file: string; className: string }>();
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
      const target = resolve(path, st.moduleSpecifier.text);
      if (!target) continue;
      const surfaces = surfacesByFile.get(target);
      if (!surfaces) continue;
      const clause = st.importClause;
      if (!clause) continue;
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const el of clause.namedBindings.elements) {
          const imported = (el.propertyName ?? el.name).text;
          const local = el.name.text;
          if (surfaces.has(imported)) importedClasses.set(local, { file: target, className: imported });
        }
      }
      if (clause.name && surfaces.has('default')) {
        // default class export under a synthetic name is rare in our stack; skip
      }
    }
    // varName -> surface
    const instances = new Map<string, ClassSurface & { className: string; defFile: string }>();
    const bindNew = (varName: string, classLocal: string) => {
      const meta = importedClasses.get(classLocal);
      if (!meta) return;
      const surface = surfacesByFile.get(meta.file)?.get(meta.className);
      if (!surface) return;
      instances.set(varName, { methods: surface.methods, props: surface.props, className: meta.className, defFile: meta.file });
    };
    for (const st of sf.statements) {
      if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          if (!ts.isIdentifier(d.name) || !d.initializer) continue;
          if (ts.isNewExpression(d.initializer) && ts.isIdentifier(d.initializer.expression)) {
            bindNew(d.name.text, d.initializer.expression.text);
          }
        }
      }
    }
    // Also scan for assignments inside functions at top level is enough for typical main.js bootstrap
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isNewExpression(node.initializer) && ts.isIdentifier(node.initializer.expression)) {
        bindNew(node.name.text, node.initializer.expression.text);
      }
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && ts.isIdentifier(node.name)) {
        const inst = instances.get(node.expression.text);
        if (inst) {
          const member = node.name.text;
          if (inst.methods.has(member) || inst.props.has(member)) {
            // ok
          } else {
            const available = [...inst.methods, ...inst.props].sort();
            const suggestion = suggestSimilar(member, available);
            const hint = suggestion ? ` (class ${inst.className} in ${inst.defFile} has '${suggestion}')` : ` (class ${inst.className} members: ${available.slice(0, 12).join(', ') || 'none'})`;
            issues.push({ path, message: `unknown member '${node.expression.text}.${member}'${hint}` });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  // P127.27: imported `export const NAME = { ... }` objects — NAME.key must exist (e.g. TILE_TYPES.PATH vs EMPTY).
  const constKeys = new Map<string, Map<string, Set<string>>>();
  for (const [path, sf] of parsed) {
    const m = new Map<string, Set<string>>();
    for (const st of sf.statements) {
      if (!ts.isVariableStatement(st) || !st.modifiers?.some((x) => x.kind === ts.SyntaxKind.ExportKeyword)) continue;
      for (const d of st.declarationList.declarations) {
        if (!ts.isIdentifier(d.name) || !d.initializer || !ts.isObjectLiteralExpression(d.initializer)) continue;
        const keys = new Set<string>();
        let plain = true;
        for (const p of d.initializer.properties) {
          if (ts.isSpreadAssignment(p) || !p.name || ts.isComputedPropertyName(p.name)) { plain = false; break; }
          keys.add(p.name.getText(sf).replace(/^['"]|['"]$/g, ''));
        }
        if (plain && keys.size) m.set(d.name.text, keys);
      }
    }
    constKeys.set(path, m);
  }
  for (const [path, sf] of parsed) {
    const local = new Map<string, { file: string; name: string }>();
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
      const target = resolve(path, st.moduleSpecifier.text);
      const nb = st.importClause?.namedBindings;
      if (!target || !nb || !ts.isNamedImports(nb)) continue;
      for (const el of nb.elements) {
        const imported = (el.propertyName ?? el.name).text;
        if (constKeys.get(target)?.has(imported)) local.set(el.name.text, { file: target, name: imported });
      }
    }
    if (!local.size) continue;
    const seen = new Set<string>();
    const visitConst = (node: ts.Node) => {
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && ts.isIdentifier(node.name)) {
        const meta = local.get(node.expression.text);
        const keys = meta && constKeys.get(meta.file)?.get(meta.name);
        if (meta && keys && !keys.has(node.name.text)) {
          const msg = `unknown constant '${node.expression.text}.${node.name.text}' (${meta.name} in ${meta.file} has: ${[...keys].join(', ')})`;
          if (!seen.has(msg)) { seen.add(msg); issues.push({ path, message: msg }); }
        }
      }
      ts.forEachChild(node, visitConst);
    };
    visitConst(sf);
  }
  return result('member-contracts', issues);
}

/**
 * When the entry HTML is a self-contained app (large inline script, no external script src)
 * and other CSS/JS files are unreachable, drop those orphans so the package matches what runs.
 * Returns paths removed. Caller must re-run validators after mutation.
 */
export function dropUnreachableOrphansIfSelfContained(files: FileMap): string[] {
  const htmlPaths = [...files.keys()].filter((p) => /\.html?$/i.test(p));
  if (!htmlPaths.length) return [];
  let totalInline = 0;
  let externalScriptRefs = 0;
  for (const hp of htmlPaths) {
    const html = files.get(hp) || '';
    for (const m of html.matchAll(/<script\b([^>]*)(?:\/>|>([\s\S]*?)<\/script>)/gi)) {
      if (/\bsrc\s*=/i.test(m[1])) externalScriptRefs++;
      else if (m[2]) totalInline += m[2].length;
    }
  }
  if (totalInline < 400 || externalScriptRefs > 0) return [];
  const reach = validateReachability(files);
  const orphans = orphanedPathsFromReachability(reach).filter((p) => /\.(?:css|m?js|cjs)$/i.test(p));
  const dropped: string[] = [];
  for (const p of orphans) {
    if (files.delete(p)) dropped.push(p);
  }
  return dropped;
}

/**
 * P127.23: cross-file type diagnostics for plain JS (checkJs). Reports only mismatches whose declaration lives in
 * another generated project file: missing named exports, unknown members of project classes/objects, wrong call arity.
 * Platform/DOM typing noise is ignored. Advisory (not in REQUIRED_VALIDATORS); drives bounded repair.
 */
export function validateTypeContracts(files: FileMap): ReportValidator {
  const issues: Issue[] = [];
  const jsPaths = [...files.keys()].filter((p) => /\.m?js$/i.test(p));
  if (jsPaths.length < 2) return result('type-contracts', issues);
  try {
    const virtual = new Map<string, string>(jsPaths.map((p) => [`/${p}`, files.get(p)!]));
    const options: ts.CompilerOptions = {
      allowJs: true, checkJs: true, noEmit: true, skipLibCheck: true, strict: false, noImplicitAny: false,
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Node10,
      lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'], types: [],
    };
    const host = ts.createCompilerHost(options, true);
    const baseGet = host.getSourceFile.bind(host);
    const baseExists = host.fileExists.bind(host);
    const baseRead = host.readFile.bind(host);
    host.getSourceFile = (name, lang, onErr, shouldCreate) =>
      virtual.has(name) ? ts.createSourceFile(name, virtual.get(name)!, lang, true, ts.ScriptKind.JS) : baseGet(name, lang, onErr, shouldCreate);
    host.fileExists = (name) => virtual.has(name) || baseExists(name);
    host.readFile = (name) => virtual.get(name) ?? baseRead(name);
    const program = ts.createProgram([...virtual.keys()], options, host);
    const checker = program.getTypeChecker();
    const inProject = (sf: ts.SourceFile | undefined) => Boolean(sf && virtual.has(sf.fileName));
    const declaredInProject = (sym: ts.Symbol | undefined): boolean => {
      if (!sym) return false;
      const target = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
      return (target.declarations ?? []).some((d) => inProject(d.getSourceFile()));
    };
    const tokenAt = (sf: ts.SourceFile, pos: number): ts.Node => {
      let found: ts.Node = sf;
      const visit = (n: ts.Node) => { if (pos >= n.getStart(sf) && pos < n.getEnd()) { found = n; ts.forEachChild(n, visit); } };
      ts.forEachChild(sf, visit);
      return found;
    };
    for (const name of virtual.keys()) {
      const sf = program.getSourceFile(name);
      if (!sf) continue;
      for (const d of program.getSemanticDiagnostics(sf)) {
        if (d.start === undefined || issues.length >= 12) continue;
        const node = tokenAt(sf, d.start);
        let keep = false;
        if (d.code === 2305 || d.code === 2614 || d.code === 2724) keep = true;
        else if (d.code === 2339) {
          const pa = ts.isPropertyAccessExpression(node.parent) ? node.parent : ts.isPropertyAccessExpression(node) ? node : null;
          const type = pa ? checker.getTypeAtLocation(pa.expression) : null;
          keep = Boolean(type && !(type.flags & ts.TypeFlags.Any) && declaredInProject(type.getSymbol()));
        } else if (d.code === 2554 || d.code === 2555) {
          let cur: ts.Node | undefined = node;
          while (cur && !ts.isCallExpression(cur) && !ts.isNewExpression(cur)) cur = cur.parent;
          const callee = cur ? (cur as ts.CallExpression).expression : null;
          keep = Boolean(callee && declaredInProject(checker.getSymbolAtLocation(callee)));
        }
        if (!keep) continue;
        const line = sf.getLineAndCharacterOfPosition(d.start).line + 1;
        issues.push({ path: name.slice(1), message: `line ${line}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ').slice(0, 200)}` });
      }
    }
  } catch {
    return result('type-contracts', []); // diagnostics are advisory; never fail a build because the checker crashed
  }
  return result('type-contracts', issues);
}

export function runStaticValidators(files: FileMap, spec: Spec | null): ReportValidator[] {
  return [
    validateHtml(files),
    validateJs(files),
    validateModuleContracts(files),
    validateRefs(files),
    validateSize(files),
    validateSecrets(files),
    checkAcceptance(files, spec?.acceptance ?? []),
    validateDomWiring(files),
    validateReachability(files),
    validateCompleteness(files),
    validateMemberContracts(files),
    validateTypeContracts(files),
  ];
}
