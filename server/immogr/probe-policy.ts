export type ProbeAuthorization = {
  /** Explicitly reviewed source rule or operator permission reference. */
  reference: string;
  reviewedAt: string;
  researchPurposeAllowed: true;
  robotsAllowed: true;
  allowedHosts: string[];
  allowedMethods: Array<'GET' | 'HEAD'>;
  maxRequests: 2 | 3;
};

export type ProbeSource = {
  id: string;
  probeAuthorization?: ProbeAuthorization;
  /** Set when source terms or operator instructions explicitly prohibit scripted probes. */
  scriptedProbeProhibited?: boolean;
};

export type ProbePlan = {
  sourceId: string;
  requests: Array<{ url: string; method: 'GET' | 'HEAD' }>;
};

export type ProbeDecision =
  | { allowed: true; sourceId: string; maxRequests: 2 | 3; host: string; reference: string }
  | { allowed: false; sourceId: string; reasons: string[] };

/**
 * Separate, tightly bounded technical research probe gate.
 * This is still automated access: it is not manual browsing and never grants
 * permission for recurring collection, listing extraction, or background jobs.
 */
export function evaluateResearchProbe(source: ProbeSource, plan: ProbePlan, now = new Date()): ProbeDecision {
  const reasons: string[] = [];
  const auth = source.probeAuthorization;
  if (source.scriptedProbeProhibited) reasons.push('scripted_probe_explicitly_prohibited');
  if (!auth) reasons.push('probe_authorization_missing');
  if (plan.sourceId !== source.id) reasons.push('source_id_mismatch');
  if (!Array.isArray(plan.requests) || plan.requests.length < 1) reasons.push('probe_requests_missing');
  if (auth) {
    if (!auth.reference.trim()) reasons.push('authorization_reference_missing');
    const reviewedAt = Date.parse(auth.reviewedAt);
    if (!Number.isFinite(reviewedAt) || reviewedAt > now.getTime()) reasons.push('authorization_review_date_invalid');
    if (auth.researchPurposeAllowed !== true) reasons.push('research_purpose_not_allowed');
    if (auth.robotsAllowed !== true) reasons.push('robots_not_allowed');
    if (!Array.isArray(auth.allowedHosts) || auth.allowedHosts.length === 0) reasons.push('host_allowlist_missing');
    if (!Array.isArray(auth.allowedMethods) || auth.allowedMethods.length === 0) reasons.push('method_allowlist_missing');
    if (plan.requests.length > auth.maxRequests) reasons.push('probe_request_limit_exceeded');
    const hosts = new Set<string>();
    for (const request of plan.requests ?? []) {
      let url: URL;
      try { url = new URL(request.url); } catch { reasons.push('invalid_url'); continue; }
      if (url.protocol !== 'https:') reasons.push('https_required');
      if (url.username || url.password) reasons.push('url_credentials_forbidden');
      hosts.add(url.hostname.toLowerCase());
      if (!auth.allowedHosts.some((host) => host.toLowerCase() === url.hostname.toLowerCase())) reasons.push('host_not_allowlisted');
      if (!auth.allowedMethods.includes(request.method)) reasons.push('method_not_allowlisted');
      if (url.searchParams.has('page') && Number(url.searchParams.get('page')) > 1) reasons.push('pagination_probe_forbidden');
    }
    if (hosts.size > 1) reasons.push('single_host_per_probe_required');
    if (hosts.size === 1 && plan.requests.some((r) => { try { return new URL(r.url).hostname.toLowerCase() !== [...hosts][0]; } catch { return true; } })) reasons.push('mixed_hosts_forbidden');
    if (auth.maxRequests !== 2 && auth.maxRequests !== 3) reasons.push('invalid_probe_limit');
  }
  if (reasons.length || !auth) return { allowed: false, sourceId: source.id, reasons: [...new Set(reasons)] };
  const host = new URL(plan.requests[0].url).hostname;
  return { allowed: true, sourceId: source.id, maxRequests: auth.maxRequests, host, reference: auth.reference };
}
