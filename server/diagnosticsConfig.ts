/** Pure diagnostics helpers: configuration snapshot (secret rule), unused env names, build stamp (P124.24). */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { redactSecrets } from './redact.ts';

const SECRET_NAME = /(KEY|SECRET|TOKEN|PASSWORD|PASSWD|PASS$|PRIVATE|CREDENTIAL|COOKIE|SALT|AUTH|BEARER|CERT|PEM|DSN|DATABASE_URL|CONNECTION)/i;
const PLATFORM_NAME = /^(PATH|HOME|PWD|OLDPWD|SHLVL|_|HOSTNAME|LANG|LANGUAGE|LC_.*|TERM|USER|LOGNAME|SHELL|TMPDIR|TZ|INIT_CWD|EDITOR|PAGER|npm_.*|PNPM_.*|YARN_.*|KUBERNETES_.*|.*_PORT_\d+.*|.*_SERVICE_(HOST|PORT).*)$/;

export type ConfigEntry = { name: string; secret: boolean; value?: string; set?: true; length?: number; sha256?: string };

const looksSecretValue = (v: string) => /:\/\/[^/\s:@]+:[^@\s]+@/.test(v) || /^[A-Za-z0-9_\-+/=.]{40,}$/.test(v) || /^-----BEGIN /.test(v);

/** Non-secret values in full; secrets only as set/length/short SHA-256 fingerprint (no partial key material). */
export function configSnapshot(env: NodeJS.ProcessEnv = process.env): ConfigEntry[] {
  const out: ConfigEntry[] = [];
  for (const name of Object.keys(env).sort()) {
    if (PLATFORM_NAME.test(name)) continue;
    const raw = env[name];
    if (raw === undefined) continue;
    if (SECRET_NAME.test(name) || looksSecretValue(raw)) {
      out.push({ name, secret: true, set: true, length: raw.length, sha256: crypto.createHash('sha256').update(raw).digest('hex').slice(0, 8) });
    } else {
      out.push({ name, secret: false, value: redactSecrets(raw, env).slice(0, 300) });
    }
  }
  return out;
}

/** A name counts as used when it appears in source, or its numbered-slot base does (GEMINI_API_KEY_3 → GEMINI_API_KEY). */
export function unusedEnvNames(names: string[], sourceText: string): string[] {
  return names.filter((n) => {
    if (PLATFORM_NAME.test(n) || /^(RENDER|RAILWAY|VERCEL|FLY|HEROKU|DYNO|CI|GITHUB)(_|$)/.test(n)) return false;
    if (sourceText.includes(n)) return false;
    const base = n.replace(/_?\d+$/, '');
    return !(base !== n && base.length > 3 && sourceText.includes(base));
  }).sort();
}

function walk(dir: string, exts: RegExp, out: string[], depth = 0): void {
  if (depth > 3) return;
  let entries: fs.Dirent[] = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.')) walk(p, exts, out, depth + 1); }
    else if (exts.test(e.name)) out.push(p);
  }
}

let sourceCache: { text: string; files: number } | null = null;
export function loadSourceText(cwd = process.cwd()): { text: string; files: number } {
  if (sourceCache) return sourceCache;
  const files: string[] = [];
  for (const f of ['server.ts']) if (fs.existsSync(path.join(cwd, f))) files.push(path.join(cwd, f));
  for (const d of ['server', 'src']) walk(path.join(cwd, d), /\.(ts|tsx|mjs)$/, files);
  walk(path.join(cwd, 'dist-server'), /\.js$/, files);
  let text = '';
  for (const f of files) { try { text += fs.readFileSync(f, 'utf8') + '\n'; } catch { /* skip */ } }
  sourceCache = { text, files: files.length };
  return sourceCache;
}

export type BuildStamp = { status: 'MATCH' | 'MISMATCH' | 'UNKNOWN' | 'NO_STAMP'; stampCommit?: string; runtimeCommit: string; builtAt?: string; stampPatch?: string };
export function buildStampStatus(runtimeCommit: string, cwd = process.cwd()): BuildStamp {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(cwd, 'build-stamp.json'), 'utf8'));
    const stampCommit = String(s.commit || 'unknown').slice(0, 7);
    const known = stampCommit !== 'unknown' && runtimeCommit !== 'unknown';
    return { status: !known ? 'UNKNOWN' : stampCommit === runtimeCommit ? 'MATCH' : 'MISMATCH', stampCommit, runtimeCommit, builtAt: s.builtAt, stampPatch: s.patch };
  } catch { return { status: 'NO_STAMP', runtimeCommit }; }
}

export function formatConfigLines(entries: ConfigEntry[]): string[] {
  return entries.map((e) => e.secret ? `${e.name}: SECRET set=true length=${e.length} sha256=${e.sha256}` : `${e.name}=${e.value}`);
}

