// Fail closed if a manual regression targets a different deployment than its checkout.
const base = String(process.env.STAGING_SERVICE_URL || '').replace(/\/+$/, '');
const sha = String(process.env.GITHUB_SHA || '').toLowerCase();
if (!/^https:\/\/[^/]+/i.test(base) || !/^[0-9a-f]{40}$/.test(sha)) {
  throw new Error('HTTPS staging URL and full checkout SHA required');
}
const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(15000) });
if (!response.ok) throw new Error(`Staging health HTTP ${response.status}`);
const health = await response.json();
const deployed = String(health.commit || '').trim().toLowerCase();
// The deployment may expose a short git SHA. Match every supplied character,
// never accept an unknown, malformed, or overly short identifier.
if (health.status !== 'ok' || !/^[0-9a-f]{7,40}$/.test(deployed) || !sha.startsWith(deployed)) {
  throw new Error(`Deployment mismatch: expected ${sha}, received ${deployed || 'unknown'}`);
}
console.log(`Architect regression deployed commit verified: ${deployed}`);
