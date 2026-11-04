/**
 * P124.39: source quality for web-search evidence. Pure, no network.
 *
 * The list below is owner-supplied data (2026-11-04): international news organisations with their own
 * correspondents and published correction standards. It is not a country default. A host that is not listed is
 * "unlisted": it may still be right, but it is not proof on its own. Public broadcasters are reliable but
 * state-funded, so the evidence block asks the model to label them as such.
 */

export type SourceTier = 'agency' | 'public_broadcaster' | 'quality_press';

export type TrustedSource = { name: string; tier: SourceTier; hosts: string[] };

export const TRUSTED_NEWS_SOURCES: readonly TrustedSource[] = [
  // International news agencies
  { name: 'Reuters', tier: 'agency', hosts: ['reuters.com'] },
  { name: 'Associated Press', tier: 'agency', hosts: ['apnews.com', 'ap.org'] },
  { name: 'Agence France-Presse', tier: 'agency', hosts: ['afp.com'] },
  { name: 'Deutsche Presse-Agentur', tier: 'agency', hosts: ['dpa.com', 'dpa-international.com'] },
  { name: 'Bloomberg', tier: 'agency', hosts: ['bloomberg.com'] },
  // Public and state broadcasters
  { name: 'BBC News', tier: 'public_broadcaster', hosts: ['bbc.com', 'bbc.co.uk'] },
  { name: 'Deutsche Welle', tier: 'public_broadcaster', hosts: ['dw.com'] },
  { name: 'France 24', tier: 'public_broadcaster', hosts: ['france24.com'] },
  { name: 'NHK World-Japan', tier: 'public_broadcaster', hosts: ['nhk.or.jp'] },
  { name: 'NPR', tier: 'public_broadcaster', hosts: ['npr.org'] },
  { name: 'CBC News', tier: 'public_broadcaster', hosts: ['cbc.ca'] },
  { name: 'SBS News', tier: 'public_broadcaster', hosts: ['sbs.com.au'] },
  // Quality press
  { name: 'The New York Times', tier: 'quality_press', hosts: ['nytimes.com'] },
  { name: 'The Wall Street Journal', tier: 'quality_press', hosts: ['wsj.com'] },
  { name: 'The Washington Post', tier: 'quality_press', hosts: ['washingtonpost.com'] },
  { name: 'The Guardian', tier: 'quality_press', hosts: ['theguardian.com'] },
  { name: 'Financial Times', tier: 'quality_press', hosts: ['ft.com'] },
  { name: 'Le Monde', tier: 'quality_press', hosts: ['lemonde.fr'] },
  { name: 'El País', tier: 'quality_press', hosts: ['elpais.com'] },
  { name: 'The Straits Times', tier: 'quality_press', hosts: ['straitstimes.com'] },
];

/** Lower-case host without a leading `www.`; undefined for anything that is not an http(s) URL. */
export function hostOf(url: string): string | undefined {
  try {
    const u = new URL(String(url || '').trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    return u.hostname.toLowerCase().replace(/^www\./, '') || undefined;
  } catch { return undefined; }
}

/** The trusted-list entry a URL belongs to. Matches the host or a subdomain of it, never a look-alike suffix. */
export function trustedSourceFor(url: string): TrustedSource | undefined {
  const host = hostOf(url);
  if (!host) return undefined;
  return TRUSTED_NEWS_SOURCES.find((s) => s.hosts.some((h) => host === h || host.endsWith(`.${h}`)));
}

/** Short label for evidence text, e.g. `reuters.com — trusted agency (Reuters)` or `example.org — unlisted`. */
export function sourceLabel(url: string): string {
  const host = hostOf(url);
  if (!host) return 'unknown host — unlisted';
  const t = trustedSourceFor(url);
  if (!t) return `${host} — unlisted`;
  const tier = t.tier === 'public_broadcaster' ? 'trusted public broadcaster' : t.tier === 'agency' ? 'trusted agency' : 'trusted quality press';
  return `${host} — ${tier} (${t.name})`;
}

export type SourceClass = { listed: boolean; host?: string; name?: string; tier?: SourceTier };

/** Classify a URL against the trusted list. `listed` is false for every host not on the list. */
export function classifySource(url: string): SourceClass {
  const host = hostOf(url);
  const t = trustedSourceFor(url);
  return t ? { listed: true, host, name: t.name, tier: t.tier } : { listed: false, host };
}

/** Distinct trusted organisations among the URLs, in first-seen order (two pages of one outlet count once). */
export function independentListedSources(urls: string[]): string[] {
  const names: string[] = [];
  for (const u of urls || []) {
    const c = classifySource(u);
    if (c.listed && c.name && !names.includes(c.name)) names.push(c.name);
  }
  return names;
}

/**
 * Publication date taken from a news URL path (`/YYYY/MM/DD/` or `YYYY-MM-DD`), as an ISO date string.
 * Many results carry no `date` field but the year sits in the path; undefined when the path says nothing.
 */
export function dateFromUrl(url: string): string | undefined {
  let path = '';
  try { path = new URL(String(url || '')).pathname; } catch { return undefined; }
  const m = path.match(/(?:^|\/)((?:19|20)\d{2})[/-](0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])(?:[/-]|$)/);
  if (!m) return undefined;
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}
