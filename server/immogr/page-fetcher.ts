import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { createHash } from 'node:crypto';

export type RetrievedPage = {
  requestedUrl: string;
  finalUrl: string;
  statusCode: number;
  contentType: string;
  fetchedAt: string;
  html: string;
  bytes: number;
  contentFingerprint: string;
  redirectCount: number;
};
export type PageFetchResult = { ok: true; page: RetrievedPage } | { ok: false; requestedUrl: string; code: string; statusCode?: number; detail?: string };
type FetcherOptions = {
  fetchImpl?: typeof fetch;
  lookupImpl?: typeof lookup;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  userAgent?: string;
};
function isPrivateAddress(value: string): boolean {
  const ip = value.toLowerCase().split('%')[0];
  const family = isIP(ip);
  if (family === 4) {
    const [a,b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51) || (a === 203 && b === 0);
  }
  if (family === 6) {
    if (ip === '::' || ip === '::1') return true;
    if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) return true;
    if (ip.startsWith('::ffff:')) return isPrivateAddress(ip.slice(7));
    return false;
  }
  return true;
}
async function assertPublicTarget(url: URL, resolver: typeof lookup): Promise<void> {
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported_protocol');
  if (url.username || url.password) throw new Error('url_credentials_forbidden');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) throw new Error('private_host');
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new Error('private_address');
    return;
  }
  const addresses = await resolver(host, { all: true, verbatim: true } as any) as unknown as Array<{ address: string; family: number }>;
  if (!addresses.length || addresses.some((item) => isPrivateAddress(item.address))) throw new Error('non_public_dns_target');
}
async function readBounded(response: Response, maxBytes: number): Promise<{ text: string; bytes: number }> {
  const reader = response.body?.getReader();
  if (!reader) return { text: '', bytes: 0 };
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) { await reader.cancel(); throw new Error('response_too_large'); }
    chunks.push(value);
  }
  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return { text: new TextDecoder('utf-8', { fatal: false }).decode(merged), bytes };
}
export async function fetchImmoGRPage(value: string, options: FetcherOptions = {}): Promise<PageFetchResult> {
  const fetchImpl = options.fetchImpl || fetch;
  const resolver = options.lookupImpl || lookup;
  const timeoutMs = Math.max(1000, Math.min(options.timeoutMs ?? 12000, 30000));
  const maxBytes = Math.max(16_384, Math.min(options.maxBytes ?? 1_000_000, 2_000_000));
  const maxRedirects = Math.max(0, Math.min(options.maxRedirects ?? 4, 8));
  let current: URL;
  try { current = new URL(value); } catch { return { ok: false, requestedUrl: value, code: 'invalid_url' }; }
  const requestedUrl = current.toString();
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      await assertPublicTarget(current, resolver);
      const response = await fetchImpl(current, {
        method: 'GET', redirect: 'manual', signal: controller.signal,
        headers: { 'user-agent': options.userAgent || 'ImmoGR/1.0 (+personal property research)', accept: 'text/html,application/xhtml+xml;q=0.9,application/ld+json;q=0.8' },
      });
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) return { ok: false, requestedUrl, code: 'redirect_without_location', statusCode: response.status };
        if (hop >= maxRedirects) return { ok: false, requestedUrl, code: 'too_many_redirects', statusCode: response.status };
        current = new URL(location, current);
        continue;
      }
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) return { ok: false, requestedUrl, code: 'http_error', statusCode: response.status, detail: contentType.slice(0,120) };
      if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) return { ok: false, requestedUrl, code: 'unsupported_content_type', statusCode: response.status, detail: contentType.slice(0,120) };
      const body = await readBounded(response, maxBytes);
      const html = body.text;
      return { ok: true, page: {
        requestedUrl, finalUrl: current.toString(), statusCode: response.status, contentType,
        fetchedAt: new Date().toISOString(), html, bytes: body.bytes,
        contentFingerprint: createHash('sha256').update(html).digest('hex'), redirectCount: hop,
      }};
    } catch (error) {
      const detail = String((error as Error)?.message || error).slice(0,160);
      return { ok: false, requestedUrl, code: controller.signal.aborted ? 'timeout' : detail };
    } finally { clearTimeout(timer); }
  }
  return { ok: false, requestedUrl, code: 'redirect_loop' };
}
