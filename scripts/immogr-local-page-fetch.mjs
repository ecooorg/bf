#!/usr/bin/env node
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import https from 'node:https';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { evaluateResearchProbe } from '../server/immogr/probe-validation.ts';

const USER_AGENT = 'ImmoGR-LocalResearch/1.0';
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;

function ipv4IsPublic(ip) {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = octets;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 0 && c === 2) || (b === 88 && c === 99) || (b === 0 && c === 9) || (b === 0 && c === 10))) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

export function isPublicAddress(address) {
  const ip = address.replace(/^\[|\]$/g, '').toLowerCase();
  const family = isIP(ip);
  if (family === 4) return ipv4IsPublic(ip);
  if (family !== 6) return false;
  if (ip === '::' || ip === '::1' || ip.startsWith('::ffff:')) return false;
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb') || ip.startsWith('ff')) return false;
  if (ip.startsWith('2001:db8:')) return false;
  // Only globally-routable 2000::/3 unicast is accepted.
  const first = Number.parseInt(ip.split(':')[0] || '0', 16);
  return first >= 0x2000 && first <= 0x3fff;
}

async function resolvePublicAddress(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw new Error('Target resolves to a non-public IP address.');
    return { address: host, family: isIP(host) };
  }
  const records = await lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some((record) => !isPublicAddress(record.address))) {
    throw new Error('DNS returned an empty or non-public address set; request blocked.');
  }
  return records[0];
}

function requestOnce(urlString, method, maxBytes) {
  return new Promise(async (resolve, reject) => {
    let url;
    try { url = new URL(urlString); } catch { reject(new Error('Invalid request URL.')); return; }
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) { reject(new Error('Only credential-free HTTPS URLs on the standard port are allowed.')); return; }
    let address;
    try { address = await resolvePublicAddress(url.hostname); } catch (error) { reject(error); return; }
    const started = Date.now();
    const request = https.request(url, {
      method,
      headers: { 'User-Agent': USER_AGENT, Accept: method === 'HEAD' ? 'text/html,*/*;q=0.1' : 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1' },
      lookup: (_hostname, options, callback) => options?.all ? callback(null, [address]) : callback(null, address.address, address.family),
    }, (response) => {
      const chunks = [];
      let bytes = 0;
      response.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          request.destroy(new Error('Response exceeded the local probe size limit.'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({
        statusCode: response.statusCode || 0,
        contentType: String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase(),
        body: Buffer.concat(chunks),
        elapsedMs: Date.now() - started,
        location: response.headers.location || null,
      }));
    });
    const timeout = setTimeout(() => request.destroy(new Error('Request timed out.')), REQUEST_TIMEOUT_MS);
    timeout.unref?.();
    request.on('close', () => clearTimeout(timeout));
    request.on('error', reject);
    request.end();
  });
}

export function buildProbePlan(planInput, sourceRegistry) {
  if (!planInput || typeof planInput !== 'object' || typeof planInput.sourceId !== 'string' || !Array.isArray(planInput.urls)) throw new Error('Plan must contain a registered sourceId and a urls array.');
  if (!sourceRegistry || !Array.isArray(sourceRegistry.sources)) throw new Error('The ImmoGR source registry is required.');
  const source = sourceRegistry.sources.find((item) => item.id === planInput.sourceId);
  if (!source) throw new Error('Unknown ImmoGR source ID.');
  if (planInput.urls.length < 1 || planInput.urls.length > 20) throw new Error('Provide between one and twenty page URLs.');
  const urls = planInput.urls;
  const requests = urls.map((url) => ({ url, method: 'GET' }));
  const decision = evaluateResearchProbe({ id: source.id }, { sourceId: source.id, requests });
  if (!decision.allowed) throw new Error('Invalid technical request plan: ' + decision.reasons.join(', '));
  return { source, urls, requests, decision };
}

async function main() {
  const planPath = process.argv[2];
  if (!planPath || process.argv.includes('--help')) {
    process.stdout.write('Usage: node --import tsx scripts/immogr-local-page-fetch.mjs <local-plan.json>\n');
    process.stdout.write('Plan JSON: { "sourceId": "registered-source-id", "urls": ["https://..."] }\n');
    process.exitCode = planPath ? 0 : 2;
    return;
  }
  const absolutePlanPath = path.resolve(planPath);
  const input = JSON.parse(await readFile(absolutePlanPath, 'utf8'));
  const registryPath = path.resolve(process.cwd(), 'config/immogr/sources.json');
  const sourceRegistry = JSON.parse(await readFile(registryPath, 'utf8'));
  const plan = buildProbePlan(input, sourceRegistry);
  const outputDir = path.resolve(path.dirname(absolutePlanPath), '.immogr-local-probe-output');
  await mkdir(outputDir, { recursive: true });
  const records = [];

  for (let index = 0; index < plan.urls.length; index += 1) {
    const pageUrl = plan.urls[index];
    const page = await requestOnce(pageUrl, 'GET', MAX_HTML_BYTES);
    if (page.location) throw new Error('Listing redirect encountered; redirects are not followed to avoid uncounted requests.');
    if (page.statusCode < 200 || page.statusCode >= 300) throw new Error('Listing request returned HTTP ' + page.statusCode + '; no retry was attempted.');
    if (!['text/html', 'application/xhtml+xml'].includes(page.contentType)) throw new Error('Listing response is not HTML; no content was saved.');
    const html = page.body.toString('utf8');
    const fileName = 'page-' + String(index + 1).padStart(2, '0') + '.html';
    await writeFile(path.join(outputDir, fileName), html, { mode: 0o600 });
    records.push({
      kind: 'page', url: pageUrl, statusCode: page.statusCode, contentType: page.contentType,
      elapsedMs: page.elapsedMs, bytes: page.body.length, sha256: createHash('sha256').update(page.body).digest('hex'),
      localFile: fileName, fetchedAt: new Date().toISOString(),
    });
  }
  const report = {
    sourceId: plan.source.id,
    mode: 'owner_triggered_local_probe',
    requestCount: records.length,
    host: plan.decision.host,
    outcome: 'completed',
    records,
  };
  await writeFile(path.join(outputDir, 'probe-report.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  process.stdout.write(JSON.stringify({ outputDir, report }, null, 2) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write('ImmoGR local probe stopped: ' + (error instanceof Error ? error.message : 'unknown error') + '\n');
    process.exitCode = 1;
  });
}
