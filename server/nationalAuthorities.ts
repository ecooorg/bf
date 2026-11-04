/**
 * P125.4 item 4 — national authority ranking data (versioned JSON, not hard-coded defaults).
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type AuthorityEntry = {
  country: string;
  hosts: string[];
  topics?: string[];
  source?: string;
  retrieved?: string;
};

type FileShape = { version?: number; authorities?: AuthorityEntry[] };

let cached: AuthorityEntry[] | null = null;

export function loadNationalAuthorities(filePath?: string): AuthorityEntry[] {
  if (cached && !filePath) return cached;
  const p = filePath || (() => {
    const name = 'national-authorities.json';
    try {
      const here = path.dirname(fileURLToPath(import.meta.url));
      for (const c of [path.join(process.cwd(), 'config', name), path.join(here, '..', 'config', name), path.join(here, '..', '..', 'config', name)]) {
        if (existsSync(c)) return c;
      }
    } catch { /* */ }
    return path.resolve(process.cwd(), 'config', name);
  })();
  try {
    const raw = readFileSync(p, 'utf8');
    const j = JSON.parse(raw) as FileShape;
    const list = Array.isArray(j.authorities) ? j.authorities : [];
    if (!filePath) cached = list;
    return list;
  } catch {
    return cached || [];
  }
}

/** Hosts to prefer when plan.sourceCountry is set (optional topic filter). Pure over injected list. */
export function authorityHostsFor(country: string | undefined, topic?: string, list?: AuthorityEntry[]): string[] {
  if (!country || !/^[A-Za-z]{2}$/.test(country)) return [];
  const cc = country.toUpperCase();
  const entries = (list || loadNationalAuthorities()).filter((e) => String(e.country || '').toUpperCase() === cc);
  const hosts: string[] = [];
  for (const e of entries) {
    if (topic && Array.isArray(e.topics) && e.topics.length && !e.topics.includes(topic)) continue;
    for (const h of e.hosts || []) {
      const host = String(h || '').toLowerCase().replace(/^www\./, '');
      if (host && !hosts.includes(host)) hosts.push(host);
    }
  }
  return hosts;
}

/** Stable rank key: lower is better when host matches preferred authorities. */
export function authorityRank(host: string, preferredHosts: string[]): number {
  const h = String(host || '').toLowerCase().replace(/^www\./, '');
  const i = preferredHosts.findIndex((p) => h === p || h.endsWith('.' + p));
  return i === -1 ? 1000 : i;
}
