export type ProbeSource = { id: string };
export type ProbePlan = { sourceId: string; requests: Array<{ url: string; method: 'GET' | 'HEAD' }> };
export type ProbeValidation =
  | { valid: true; sourceId: string; maxRequests: number; host: string; reference: string }
  | { valid: false; sourceId: string; reasons: string[] };

/** Technical validation only. */
export function validateResearchProbe(source: ProbeSource, plan: ProbePlan): ProbeValidation {
  const reasons: string[] = [];
  if (plan.sourceId !== source.id) reasons.push('source_id_mismatch');
  if (!Array.isArray(plan.requests) || plan.requests.length < 1) reasons.push('probe_requests_missing');
  const hosts = new Set<string>();
  for (const request of plan.requests ?? []) {
    let url: URL;
    try { url = new URL(request.url); } catch { reasons.push('invalid_url'); continue; }
    if (url.protocol !== 'https:') reasons.push('https_required');
    if (url.username || url.password) reasons.push('url_credentials_forbidden');
    if (!['GET', 'HEAD'].includes(request.method)) reasons.push('unsupported_method');
    hosts.add(url.hostname.toLowerCase());
  }
  if (hosts.size > 1) reasons.push('single_host_per_probe_required');
  if (reasons.length) return { valid: false, sourceId: source.id, reasons: [...new Set(reasons)] };
  return { valid: true, sourceId: source.id, maxRequests: plan.requests.length, host: new URL(plan.requests[0].url).hostname, reference: 'technical-validation' };
}
