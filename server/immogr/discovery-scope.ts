export type DiscoverySourceInput = { id: string; name: string; homepageUrl?: string };
export type DiscoverySourceScope = { id: string; name: string; host: string };
export type DiscoverySourceScopeResult =
  | { ok: true; sources: DiscoverySourceScope[] }
  | { ok: false; error: string };

function normalizedHost(value: string): string | null {
  try {
    const url = new URL(value.includes('://') ? value : 'https://' + value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    return url.hostname.toLowerCase().replace(/^www\\./, '');
  } catch { return null; }
}

/** Resolve the owner's selected source IDs to exact source host scopes. */
export function resolveDiscoverySourceScope(
  sourceIds: unknown,
  registry: readonly DiscoverySourceInput[],
): DiscoverySourceScopeResult {
  if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
    return { ok: false, error: 'Select at least one source in ImmoGR search settings.' };
  }
  if (sourceIds.length > registry.length || sourceIds.some((id) => typeof id !== 'string' || !id.trim())) {
    return { ok: false, error: 'The selected source list is invalid.' };
  }
  const uniqueIds = [...new Set(sourceIds as string[])];
  const selected: DiscoverySourceScope[] = [];
  for (const id of uniqueIds) {
    const source = registry.find((item) => item.id === id);
    if (!source) return { ok: false, error: 'The selected source list contains an unknown source.' };
    const host = source.homepageUrl ? normalizedHost(source.homepageUrl) : null;
    if (!host) return { ok: false, error: 'A selected source is missing a valid homepage host: ' + source.name };
    selected.push({ id: source.id, name: source.name, host });
  }
  return { ok: true, sources: selected };
}

/** Filter grounded search results to only the hosts explicitly selected by the Owner. */
export function isDiscoveryUrlInScope(value: string, sources: readonly DiscoverySourceScope[]): boolean {
  let url: URL;
  try { url = new URL(value); } catch { return false; }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^www\\./, '');
  return sources.some((source) => host === source.host || host.endsWith('.' + source.host));
}
