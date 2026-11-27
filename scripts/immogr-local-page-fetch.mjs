#!/usr/bin/env node
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import https from 'node:https';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { evaluateResearchProbe } from '../server/immogr/probe-policy.ts';

const USER_AGENT = 'ImmoGR-LocalResearch/1.0';
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_ROBOTS_BYTES = 256 * 1024;
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
    if (url.protocol !== 'https:' || url.username || url.password) { reject(new Error('Only credential-free HTTPS URLs are allowed.')); return; }
    let address;
    try { address = await resolvePublicAddress(url.hostname); } catch (error) { reject(error); return; }
    const started = Date.now();
    const request = https.request(url, {
      method,
      headers: { 'User-Agent': USER_AGENT, Accept: method === 'HEAD' ? 'text/html,*/*;q=0.1' : 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1' },
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
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
    request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy(new Error('Request timed out.')));
    request.on('error', reject);
    request.end();
  });
}

function robotsGroups(text) {
  const groups = [];
  let group = { agents: [], rules: [] };
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === 'user-agent') {
      if (group.agents.length && group.rules.length) {
        groups.push(group);
        group = { agents: [], rules: [] };
      }
      group.agents.push(value.toLowerCase());
    } else if ((key === 'allow' || key === 'disallow') && group.agents.length && value) {
      group.rules.push({ type: key, value });
    }
  }
  if (group.agents.length) groups.push(group);
  return groups;
}

function robotsPatternMatches(pattern, target) {
  const escaped = pattern.split('*').map((part) => part.replace(/[.*+?^\u0024{}()|[\]\\]/g, '\\$&')).join('.*');
  const expression = new RegExp('^' + escaped + (pattern.endsWith('$') ? '' : ''));
  return expression.test(target);
}

export function isAllowedByRobots(robotsText, urlString, userAgent = USER_AGENT) {
  const url = new URL(urlString);
  const target = url.pathname + url.search;
  const groups = robotsGroups(robotsText);
  const matching = groups.filter((group) => group.agents.some((agent) => agent === '*' || userAgent.toLowerCase().includes(agent)));
  if (!matching.length) return true;
  const specificity = Math.max(...matching.flatMap((group) => group.agents.filter((agent) => agent !== '*').map((agent) => agent.length)), 0);
  const rules = matching.filter((group) => group.agents.some((agent) => agent.length === specificity && (agent === '*' || userAgent.toLowerCase().includes(agent)))).flatMap((group) => group.rules);
  const matched = rules.filter((rule) => robotsPatternMatches(rule.value, target)).sort((a, b) => b.value.length - a.value.length);
  if (!matched.length) return true;
  const longest = matched[0].value.length;
  const tied = matched.filter((rule) => rule.value.length === longest);
  return tied.some((rule) => rule.type === 'allow');
}

export function buildProbePlan(planInput) {
  if (!planInput || typeof planInput !== 'object' || !planInput.source || !Array.isArray(planInput.urls)) {
    throw new Error('Plan must contain a source authorization object and a urls array.');
  }
  const { source, urls } = planInput;
  const auth = source.probeAuthorization;
  if (!auth || !Array.isArray(urls) || urls.length < 1) throw new Error('Source authorization and at least one page URL are required.');
  const first = new URL(urls[0]);
  if (first.protocol !== 'https:') throw new Error('Only HTTPS listing URLs are supported.');
  const robotsUrl = new URL('/robots.txt', first.origin).toString();
  const requests = [{ url: robotsUrl, method: 'GET' }, ...urls.map((url) => ({ url, method: 'GET' }))];
  const decision = evaluateResearchProbe(source, { sourceId: source.id, requests });
  if (!decision.allowed) throw new Error('Probe plan denied: ' + decision.reasons.join(', '));
  return { source, urls, requests, decision };
}

async function main() {
  const planPath = process.argv[2];
  if (!planPath || process.argv.includes('--help')) {
    process.stdout.write('Usage: node --import tsx scripts/immogr-local-page-fetch.mjs <local-plan.json>\n');
    process.stdout.write('Plan JSON: { "source": { "id": "...", "probeAuthorization": { ... } }, "urls": ["https://..."] }\n');
    process.exitCode = planPath ? 0 : 2;
    return;
  }
  const absolutePlanPath = path.resolve(planPath);
  const input = JSON.parse(await readFile(absolutePlanPath, 'utf8'));
  const plan = buildProbePlan(input);
  const outputDir = path.resolve(path.dirname(absolutePlanPath), input.outputDir || '.immogr-local-probe-output');
  await mkdir(outputDir, { recursive: true });
  const records = [];

  const robots = await requestOnce(plan.requests[0].url, 'GET', MAX_ROBOTS_BYTES);
  if (robots.location) throw new Error('Redirects are not followed by the bounded probe runner; review the canonical host manually.');
  let robotsText = '';
  if (robots.statusCode === 404 || robots.statusCode === 410) {
    robotsText = '';
  } else if (robots.statusCode >= 200 && robots.statusCode < 300 && robots.contentType === 'text/plain') {
    robotsText = robots.body.toString('utf8');
  } else {
    throw new Error('Robots check did not return a readable 2xx text/plain file or a 404/410; probe stopped.');
  }
  records.push({ kind: 'robots', url: plan.requests[0].url, statusCode: robots.statusCode, elapsedMs: robots.elapsedMs, bytes: robots.body.length });
  for (let index = 0; index < plan.urls.length; index += 1) {
    const pageUrl = plan.urls[index];
    if (!isAllowedByRobots(robotsText, pageUrl)) throw new Error('robots.txt disallows this page path; no listing request was sent.');
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
    authorizationReference: plan.decision.reference,
    mode: 'owner_triggered_local_probe',
    requestCount: records.length,
    maxRequests: plan.decision.maxRequests,
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
