export type AcquisitionMode = 'authorized_api' | 'authorized_feed';

export type AcquisitionAuthorization = {
  mode: AcquisitionMode;
  reference: string;
  reviewedAt: string;
  termsApproved: true;
  robotsAllowed: true;
  allowedHosts: string[];
};

export type AcquisitionSource = {
  id: string;
  status: string;
  acquisitionAuthorization?: AcquisitionAuthorization;
};

export type AcquisitionDecision =
  | { allowed: true; sourceId: string; mode: AcquisitionMode; host: string; authorizationReference: string }
  | { allowed: false; sourceId: string; reasons: string[] };

/**
 * Fail-closed activation gate. Research status, public visibility, manual review,
 * and user-owned local copies never authorize remote automated acquisition.
 */
export function evaluateAcquisitionEligibility(source: AcquisitionSource, candidateUrl: string, now = new Date()): AcquisitionDecision {
  const reasons: string[] = [];
  let url: URL | undefined;
  try { url = new URL(candidateUrl); } catch { reasons.push('invalid_url'); }
  if (url && url.protocol !== 'https:') reasons.push('https_required');
  if (url && (url.username || url.password)) reasons.push('url_credentials_forbidden');
  const authorization = source.acquisitionAuthorization;
  if (source.status !== 'authorized_api' && source.status !== 'authorized_feed') reasons.push('source_not_authorized');
  if (!authorization) reasons.push('authorization_record_missing');
  if (authorization) {
    if (authorization.mode !== source.status) reasons.push('authorization_mode_mismatch');
    if (!authorization.reference.trim()) reasons.push('authorization_reference_missing');
    const reviewed = Date.parse(authorization.reviewedAt);
    if (!Number.isFinite(reviewed) || reviewed > now.getTime()) reasons.push('authorization_review_date_invalid');
    if (authorization.termsApproved !== true) reasons.push('terms_not_approved');
    if (authorization.robotsAllowed !== true) reasons.push('robots_not_approved');
    if (!Array.isArray(authorization.allowedHosts) || authorization.allowedHosts.length === 0) reasons.push('host_allowlist_missing');
    if (url && Array.isArray(authorization.allowedHosts) && !authorization.allowedHosts.some((host) => host.toLowerCase() === url!.hostname.toLowerCase())) reasons.push('host_not_allowlisted');
  }
  if (reasons.length || !url || !authorization) return { allowed: false, sourceId: source.id, reasons };
  return { allowed: true, sourceId: source.id, mode: authorization.mode, host: url.hostname, authorizationReference: authorization.reference };
}

export type PageBlockKind = 'metadata' | 'json_ld' | 'primary_listing' | 'related_listing' | 'navigation' | 'footer' | 'other';
export type PageBlock = { kind: PageBlockKind; text?: string; structuredData?: unknown; selector?: string };
export type AcquiredPage = {
  sourceId: string;
  requestedUrl: string;
  finalUrl: string;
  statusCode: number;
  contentType: string;
  fetchedAt: string;
  contentFingerprint: string;
  adapterVersion: string;
  blocks: PageBlock[];
};

export type SourceAdapter<T = unknown> = {
  sourceId: string;
  version: string;
  parse(page: AcquiredPage): T;
};
