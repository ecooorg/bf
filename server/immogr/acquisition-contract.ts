export type AcquisitionSource = { id: string };
export type AcquisitionDecision =
  | { allowed: true; sourceId: string; host: string }
  | { allowed: false; sourceId: string; reasons: string[] };

/** Validates transport shape only. Commercial/legal source decisions are handled separately. */
export function evaluateAcquisitionEligibility(source: AcquisitionSource, candidateUrl: string): AcquisitionDecision {
  let url: URL;
  try { url = new URL(candidateUrl); } catch { return { allowed: false, sourceId: source.id, reasons: ['invalid_url'] }; }
  const reasons: string[] = [];
  if (url.protocol !== 'https:') reasons.push('https_required');
  if (url.username || url.password) reasons.push('url_credentials_forbidden');
  if (reasons.length) return { allowed: false, sourceId: source.id, reasons };
  return { allowed: true, sourceId: source.id, host: url.hostname };
}

export type PageBlockKind = 'metadata' | 'json_ld' | 'primary_listing' | 'related_listing' | 'navigation' | 'footer' | 'other';
export type PageBlock = { kind: PageBlockKind; text?: string; structuredData?: unknown; selector?: string };
export type AcquiredPage = { sourceId: string; requestedUrl: string; finalUrl: string; statusCode: number; contentType: string; fetchedAt: string; contentFingerprint: string; adapterVersion: string; blocks: PageBlock[] };
export type SourceAdapter<T = unknown> = { sourceId: string; version: string; parse(page: AcquiredPage): T };
