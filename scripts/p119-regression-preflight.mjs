// Fail closed if a manual regression targets a different deployment than its checkout.
const base = String(process.env.STAGING_SERVICE_URL || '').replace(/\/+$/, '');
const sha = String(process.env.GITHUB_SHA || '');
if (!/^https:\/\/[^/]+/i.test(base) || !/^[0-9a-f]{40}$/i.test(sha)) {
  throw new Error('HTTPS staging URL and full checkout SHA required');
}
const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(15000) });
if (!response.ok) throw new Error(`Staging health HTTP ${response.status}`);
const health = await response.json();
const deployed = String(health.commit || '');
if (health.status !== 'ok' || deployed !== sha) {
  throw new Error(`Deployment mismatch: expected ${sha.slice(0, 7)}, received ${deployed.slice(0, 7) || 'unknown'}`);
}
console.log(`Architect regression deployed commit verified: ${sha.slice(0, 7)}`);
