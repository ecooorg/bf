import crypto from 'node:crypto';

export interface GitHubAppConfig {
  appId: string;
  installationId: string;
  privateKey: string;
  owner: string;
  repository: string;
  apiBaseUrl?: string;
}
export type GitHubCheckResult =
  | { status: 'OK'; permissions: Record<string, string>; repository: string }
  | { status: 'FAIL'; reason: string };

export function createGitHubAppJwt(appId: string, privateKey: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  if (!/^\d+$/.test(appId) || !privateKey.trim()) throw new Error('invalid_github_app_config');
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'RS256', typ: 'JWT' });
  const payload = encode({ iat: nowSeconds - 30, exp: nowSeconds + 8 * 60, iss: appId });
  const signingInput = `${header}.${payload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${signer.sign(privateKey).toString('base64url')}`;
}

export function verifyGitHubWebhookSignature(rawBody: Buffer, signature: string | undefined, secret: string): boolean {
  if (!signature || !/^sha256=[a-f0-9]{64}$/i.test(signature) || !secret) return false;
  const expected = Buffer.from(`sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`);
  const actual = Buffer.from(signature);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

const BASE_PERMISSIONS: Record<string, string> = {
  metadata: 'read', contents: 'read', checks: 'read', pull_requests: 'read',
};
const WRITE_PERMISSIONS: Record<string, string> = { contents: 'write', pull_requests: 'write' };
const rank: Record<string, number> = { none: 0, read: 1, write: 2, admin: 3 };

export function permissionsWithinMaximum(
  actual: Record<string, string> | undefined,
  modelPatchEnabled: boolean,
): boolean {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false;
  const maximum = { ...BASE_PERMISSIONS, ...(modelPatchEnabled ? WRITE_PERMISSIONS : {}) };
  for (const [permission, level] of Object.entries(actual)) {
    if (!(permission in maximum) || !(level in rank) || rank[level] > rank[maximum[permission] || 'none']) return false;
  }
  const required = modelPatchEnabled ? { ...BASE_PERMISSIONS, ...WRITE_PERMISSIONS } : BASE_PERMISSIONS;
  return Object.entries(required).every(([key, value]) => (rank[actual[key] || 'none'] || 0) >= rank[value]);
}

export async function verifyGitHubAppConnection(config: GitHubAppConfig, fetcher: typeof fetch = fetch): Promise<GitHubCheckResult> {
  const base = (config.apiBaseUrl || 'https://api.github.com').replace(/\/$/, '');
  const timeout = AbortSignal.timeout(10_000);
  try {
    const jwt = createGitHubAppJwt(config.appId, config.privateKey);
    const tokenResponse = await fetcher(`${base}/app/installations/${encodeURIComponent(config.installationId)}/access_tokens`, {
      method: 'POST', headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' }, body: '{}', signal: timeout,
    });
    if (!tokenResponse.ok) return { status: 'FAIL', reason: `github_token_http_${tokenResponse.status}` };
    const tokenData = await tokenResponse.json() as { token?: string; permissions?: Record<string, string> };
    if (!tokenData.token || !permissionsWithinMaximum(tokenData.permissions, process.env.CODE_EXECUTOR === 'model_patch')) {
      return { status: 'FAIL', reason: 'permissions_too_broad_or_missing' };
    }
    const repositoryResponse = await fetcher(`${base}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repository)}`, {
      headers: { Authorization: `Bearer ${tokenData.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, signal: timeout,
    });
    if (!repositoryResponse.ok) return { status: 'FAIL', reason: `github_repository_http_${repositoryResponse.status}` };
    return { status: 'OK', permissions: tokenData.permissions || {}, repository: `${config.owner}/${config.repository}` };
  } catch (error) {
    const name = (error as { name?: string })?.name;
    return { status: 'FAIL', reason: name === 'TimeoutError' ? 'timeout' : 'github_connection_error' };
  }
}
