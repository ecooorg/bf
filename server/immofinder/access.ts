/**
 * C131 WP3 access stage — robots, per-host delay, timeouts, redirect resolution, snapshot.
 * Pure helpers + thin wrappers. The production route still injects the shared legacy polite fetcher;
 * these access helpers are not yet the live network adapter. Hosts with persistent 403 are marked blocked.
 */

export interface AccessPolicy {
  perHostDelayMs: number;
  timeoutMs: number;
  maxRedirects: number;
  userAgent: string;
}

export const DEFAULT_ACCESS_POLICY: AccessPolicy = {
  perHostDelayMs: 1200,
  timeoutMs: 15_000,
  maxRedirects: 5,
  userAgent: 'BiForge-ImmoFinder/131 (+https://github.com/ecooorg/bf)',
};

export type HostStatus = 'ok' | 'blocked' | 'js_required' | 'unknown';

export interface HostState {
  host: string;
  status: HostStatus;
  consecutiveFailures: number;
  lastStatusCode: number | null;
  lastError: string | null;
}

const hostState = new Map<string, HostState>();

export function getHostState(host: string): HostState {
  let s = hostState.get(host);
  if (!s) {
    s = { host, status: 'unknown', consecutiveFailures: 0, lastStatusCode: null, lastError: null };
    hostState.set(host, s);
  }
  return s;
}

export function recordHostOutcome(host: string, statusCode: number | null, error: string | null): HostState {
  const s = getHostState(host);
  s.lastStatusCode = statusCode;
  s.lastError = error;
  if (statusCode === 403 || statusCode === 429 || (error && /blocked|forbidden|captcha/i.test(error))) {
    s.consecutiveFailures += 1;
    if (s.consecutiveFailures >= 3) s.status = 'blocked';
  } else if (statusCode && statusCode >= 200 && statusCode < 400) {
    s.consecutiveFailures = 0;
    if (s.status === 'blocked') s.status = 'ok';
    else if (s.status === 'unknown') s.status = 'ok';
  }
  return s;
}

export function isHostBlocked(host: string): boolean {
  return getHostState(host).status === 'blocked';
}

export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function delayForHost(host: string, policy: AccessPolicy = DEFAULT_ACCESS_POLICY): number {
  const s = getHostState(host);
  if (s.status === 'blocked') return 0;
  return policy.perHostDelayMs;
}

export interface SnapshotMeta {
  url: string;
  finalUrl: string | null;
  statusCode: number | null;
  fetchedAt: string;
  contentLength: number;
  contentHash: string | null;
}

export function contentHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function buildSnapshotMeta(
  url: string,
  finalUrl: string | null,
  statusCode: number | null,
  body: string,
  fetchedAt = new Date().toISOString(),
): SnapshotMeta {
  return {
    url,
    finalUrl,
    statusCode,
    fetchedAt,
    contentLength: body.length,
    contentHash: body ? contentHash(body) : null,
  };
}
