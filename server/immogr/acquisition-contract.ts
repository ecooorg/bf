export type AcquisitionSource = { id: string };
export type AcquisitionValidation =
  | { valid: true; sourceId: string; host: string }
  | { valid: false; sourceId: string; reasons: string[] };

/** Validates transport shape only. */
export function validateAcquisitionUrl(source: AcquisitionSource, candidateUrl: string): AcquisitionValidation {
  let url: URL;
  try { url = new URL(candidateUrl); } catch { return { valid: false, sourceId: source.id, reasons: ['invalid_url'] }; }
  const reasons: string[] = [];
  if (url.protocol !== 'https:') reasons.push('https_required');
  if (url.username || url.password) reasons.push('url_credentials_forbidden');
  if (reasons.length) return { valid: false, sourceId: source.id, reasons };
  return { valid: true, sourceId: source.id, host: url.hostname };
}

export type PageBlockKind = 'metadata' | 'json_ld' | 'primary_listing' | 'related_listing' | 'navigation' | 'footer' | 'other';
export type PageBlock = { kind: PageBlockKind; text?: string; structuredData?: unknown; selector?: string };
export type AcquiredPage = { sourceId: string; requestedUrl: string; finalUrl: string; statusCode: number; contentType: string; fetchedAt: string; contentFingerprint: string; adapterVersion: string; blocks: PageBlock[] };
export type SourceAdapter<T = unknown> = { sourceId: string; version: string; parse(page: AcquiredPage): T };
