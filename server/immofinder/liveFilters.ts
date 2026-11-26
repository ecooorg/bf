/**
 * ImmoFinder live run filters (locality pre-filter, tourist skip).
 * Kept separate so large live.ts edits stay small and push-safe.
 */

export function normalizeSlug(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Early locality gate for index candidates.
 * HappyHoliday: URL locality must be in the active whitelist.
 * Other sources: skip clear tourist places when not in the whitelist; otherwise keep for classifier.
 */
export function candidateIsTarget(
  sourceId: string,
  url: string,
  municipalities: string[],
  titleHint?: string,
): boolean {
  if (municipalities.length === 0) return true;
  const targets = new Set(municipalities.map(normalizeSlug));
  if (sourceId === 'happyholiday') {
    const locality = /-graubuenden-in-([^/]+)\/?$/i.exec(url)?.[1];
    if (locality) return targets.has(normalizeSlug(locality));
  }
  const haystack = normalizeSlug(url + ' ' + (titleHint || ''));
  if (!haystack) return true;
  const commonTourist = [
    'scuol', 'davos', 'st-moritz', 'stmoritz', 'klosters', 'arosa',
    'samedan', 'pontresina', 'silvaplana', 'zernez', 'samnaun',
  ];
  if (municipalities.some((m) => haystack.includes(normalizeSlug(m)))) return true;
  if (commonTourist.some((t) => haystack.includes(t))) return false;
  return true;
}

export function candidateScore(
  candidate: { url: string; titleHint?: string },
  municipalities: string[],
): number {
  const haystack = normalizeSlug(candidate.url + ' ' + (candidate.titleHint || ''));
  return municipalities.reduce(
    (score, municipality) => score + (haystack.includes(normalizeSlug(municipality)) ? 1 : 0),
    0,
  );
}

/** HTTP status weight for consecutiveBad / source demotion. */
export function detailFetchBadWeight(status: number): number {
  return status === 410 ? 2 : 1;
}

export function shouldBlockSourceAfterDetail(status: number, consecutiveBad: number): boolean {
  if (status === 403 || status === 429) return true;
  if (status === 410 && consecutiveBad >= 4) return true;
  return false;
}
