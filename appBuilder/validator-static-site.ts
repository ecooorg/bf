/** Static validators for the static_site stack. Source is parsed/compiled only, never run. */
import { Script } from 'node:vm';
import { isSafePath } from './core-plan.ts';
import type { ReportValidator, Spec } from './core-types.ts';
import { MAX_FILES, MAX_TOTAL_BYTES } from './stack-static-site.ts';

export type FileMap = Map<string, string>;
export const REQUIRED_VALIDATORS = ['html-structure', 'js-syntax', 'refs', 'size', 'secrets', 'acceptance'] as const;
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
    if (!/\.js$/i.test(path)) continue;
    try { new Script(src, { filename: path }); } // compile only; never run()
    catch (e) { issues.push({ path, message: e instanceof Error ? e.message : String(e) }); }
  }
  return result('js-syntax', issues);
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

export function runStaticValidators(files: FileMap, spec: Spec | null): ReportValidator[] {
  return [validateHtml(files), validateJs(files), validateRefs(files), validateSize(files), validateSecrets(files), checkAcceptance(files, spec?.acceptance ?? [])];
}
