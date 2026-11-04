/**
 * P125.1 (WP2): source policy for search evidence. Pure, no network.
 * Owner decision D-2026-11-04-02: nothing from domains controlled by the authorities of Russia or Belarus
 * reaches the digest, the page fetches or any redirect hop. The lists are data (`config/source-policy.json`),
 * loaded once at start-up; no country, host or zone is hard-coded here.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type PolicyGroup = 'A' | 'B' | 'C';
export type PolicyCounts = Record<PolicyGroup, number>;
export type SourcePolicy = { version: number; suffixes: { group: PolicyGroup; value: string }[]; hosts: { group: PolicyGroup; value: string }[] };

const POLICY_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'config', 'source-policy.json');

export const emptyPolicyCounts = (): PolicyCounts => ({ A: 0, B: 0, C: 0 });

/** Lower-case Punycode host from a URL or bare host; '' when unusable. */
export function normalizeHost(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  } catch { return ''; }
}

/** Validate and compile the data file. Throws on a malformed file (checked by test and at start-up). */
export function compilePolicy(json: any): SourcePolicy {
  if (!json || typeof json !== 'object' || typeof json.version !== 'number' || !json.groups) throw new Error('source policy: bad shape');
  const out: SourcePolicy = { version: json.version, suffixes: [], hosts: [] };
  for (const g of ['A', 'B', 'C'] as PolicyGroup[]) {
    const grp = json.groups[g];
    if (!grp || typeof grp.enabled !== 'boolean') throw new Error(`source policy: group ${g} missing`);
    if (!grp.enabled) continue;
    for (const key of ['suffixes', 'hosts'] as const) {
      for (const v of Array.isArray(grp[key]) ? grp[key] : []) {
        const h = normalizeHost(String(v));
        if (!h || h !== String(v).toLowerCase() || h.startsWith('.') || h.includes('/') || h.includes('*')) throw new Error(`source policy: bad entry "${v}" in group ${g}`);
        out[key].push({ group: g, value: h });
      }
    }
  }
  return out;
}

let loaded: SourcePolicy | null = null;
export function loadSourcePolicy(file = POLICY_PATH): SourcePolicy {
  if (file === POLICY_PATH && loaded) return loaded;
  const p = compilePolicy(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (file === POLICY_PATH) loaded = p;
  return p;
}

/** Group of the first matching rule, or null. Matches the host or any subdomain, never a look-alike suffix. */
export function excludedGroup(urlOrHost: string, policy: SourcePolicy = loadSourcePolicy()): PolicyGroup | null {
  const h = normalizeHost(urlOrHost);
  if (!h) return null;
  for (const r of policy.hosts) if (h === r.value || h.endsWith(`.${r.value}`)) return r.group;
  for (const r of policy.suffixes) if (h === r.value || h.endsWith(`.${r.value}`)) return r.group;
  return null;
}

export const isExcludedSource = (urlOrHost: string, policy?: SourcePolicy): boolean => excludedGroup(urlOrHost, policy) !== null;

/**
 * Remove excluded results from a Serper response (answerBox, knowledgeGraph, organic, news, topStories) before any
 * digest is built. Returns a shallow copy and per-group counts; dropped text is never kept.
 */
export function filterSerperData(data: any, policy: SourcePolicy = loadSourcePolicy()): { data: any; dropped: PolicyCounts; kept: number } {
  const dropped = emptyPolicyCounts();
  let kept = 0;
  if (!data || typeof data !== 'object') return { data, dropped, kept };
  const out: any = { ...data };
  const keep = (link: unknown): boolean => {
    const g = typeof link === 'string' && link ? excludedGroup(link, policy) : null;
    if (g) { dropped[g] += 1; return false; }
    return true;
  };
  if (out.answerBox && !keep(out.answerBox.link)) delete out.answerBox;
  if (out.knowledgeGraph && !keep(out.knowledgeGraph.website)) delete out.knowledgeGraph;
  for (const k of ['organic', 'news', 'topStories'] as const) {
    if (!Array.isArray(out[k])) continue;
    out[k] = out[k].filter((x: any) => keep(x?.link));
    kept += out[k].length;
  }
  return { data: out, dropped, kept };
}

export const addPolicyCounts = (a: PolicyCounts, b?: Partial<PolicyCounts>): PolicyCounts =>
  ({ A: a.A + (b?.A || 0), B: a.B + (b?.B || 0), C: a.C + (b?.C || 0) });
export const totalPolicyCounts = (c?: Partial<PolicyCounts>): number => (c?.A || 0) + (c?.B || 0) + (c?.C || 0);
