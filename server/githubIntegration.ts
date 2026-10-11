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

// ---- P16 / BX-19 (continued): read PRs and check runs, commit the Task Package to biforge/<task_id> -----------------
// Deliberately no merge, no workflow, no write to any branch outside `biforge/*` (TZ 11.7, E.5).
const GH_HEADERS = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
export const TASK_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
export const taskBranchName = (taskId: string): string => {
  if (!TASK_ID_PATTERN.test(taskId)) throw new Error('invalid_task_id');
  return `biforge/${taskId}`;
};
/** task id from a head ref, or null for any branch that is not a task branch */
export const taskIdFromBranch = (ref: unknown): string | null => {
  const m = typeof ref === 'string' ? /^biforge\/([A-Za-z0-9_-]{1,128})$/.exec(ref) : null;
  return m ? m[1] : null;
};

type Fetcher = typeof fetch;
const apiBase = (c: GitHubAppConfig) => (c.apiBaseUrl || 'https://api.github.com').replace(/\/$/, '');
const repoPath = (c: GitHubAppConfig) => `/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repository)}`;

/** Installation tokens are issued per call and never stored (E.5). Permissions are checked against the manifest every time. */
async function installationToken(config: GitHubAppConfig, fetcher: Fetcher, writeEnabled: boolean): Promise<string> {
  const jwt = createGitHubAppJwt(config.appId, config.privateKey);
  const res = await fetcher(`${apiBase(config)}/app/installations/${encodeURIComponent(config.installationId)}/access_tokens`, {
    method: 'POST', headers: { ...GH_HEADERS, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`github_token_http_${res.status}`);
  const data = await res.json() as { token?: string; permissions?: Record<string, string> };
  if (!data.token || !permissionsWithinMaximum(data.permissions, writeEnabled)) throw new Error('permissions_too_broad_or_missing');
  return data.token;
}
async function ghJson(config: GitHubAppConfig, fetcher: Fetcher, token: string, pathAndQuery: string, init: RequestInit = {}): Promise<{ status: number; body: any }> {
  const res = await fetcher(`${apiBase(config)}${pathAndQuery}`, {
    ...init, headers: { ...GH_HEADERS, Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) }, signal: AbortSignal.timeout(10_000),
  });
  let body: any = null;
  try { body = await res.json(); } catch { /* empty body */ }
  return { status: res.status, body };
}
const needOk = (r: { status: number }, what: string) => { if (r.status < 200 || r.status >= 300) throw new Error(`${what}_http_${r.status}`); };

export interface PullRequestInfo { number: number; state: string; merged: boolean; headSha: string; headRef: string; baseRef: string }
export async function readPullRequest(config: GitHubAppConfig, number: number, fetcher: Fetcher = fetch): Promise<PullRequestInfo> {
  if (!Number.isInteger(number) || number < 1) throw new Error('invalid_pr_number');
  const token = await installationToken(config, fetcher, false);
  const r = await ghJson(config, fetcher, token, `${repoPath(config)}/pulls/${number}`);
  needOk(r, 'github_pull');
  const b = r.body;
  if (!b || !/^[0-9a-f]{40}$/i.test(String(b.head?.sha))) throw new Error('github_pull_malformed');
  return { number, state: String(b.state), merged: Boolean(b.merged), headSha: String(b.head.sha), headRef: String(b.head.ref), baseRef: String(b.base?.ref ?? '') };
}

export interface CheckRunInfo { id: number; name: string; status: string; conclusion: string | null; headSha: string; detailsUrl: string | null }
export async function listCheckRuns(config: GitHubAppConfig, sha: string, fetcher: Fetcher = fetch): Promise<CheckRunInfo[]> {
  if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error('invalid_sha');
  const token = await installationToken(config, fetcher, false);
  const out: CheckRunInfo[] = [];
  for (let page = 1; page <= 5; page++) {
    const r = await ghJson(config, fetcher, token, `${repoPath(config)}/commits/${sha}/check-runs?per_page=100&page=${page}`);
    needOk(r, 'github_check_runs');
    const runs: any[] = Array.isArray(r.body?.check_runs) ? r.body.check_runs : [];
    for (const c of runs) out.push({ id: Number(c.id), name: String(c.name).slice(0, 200), status: String(c.status), conclusion: c.conclusion ?? null, headSha: sha, detailsUrl: typeof c.html_url === 'string' && c.html_url.startsWith('https://') ? c.html_url.slice(0, 500) : null });
    if (runs.length < 100) break;
  }
  return out;
}

/** Files changed by a PR. GitHub returns at most 3000; a full 3000 is reported as truncated. */
export async function listPullRequestFiles(config: GitHubAppConfig, number: number, fetcher: Fetcher = fetch): Promise<{ files: Array<{ filename: string; status: string; previous_filename?: string }>; truncated: boolean }> {
  if (!Number.isInteger(number) || number < 1) throw new Error('invalid_pr_number');
  const token = await installationToken(config, fetcher, false);
  const files: Array<{ filename: string; status: string; previous_filename?: string }> = [];
  for (let page = 1; page <= 30; page++) {
    const r = await ghJson(config, fetcher, token, `${repoPath(config)}/pulls/${number}/files?per_page=100&page=${page}`);
    needOk(r, 'github_pull_files');
    const rows: any[] = Array.isArray(r.body) ? r.body : [];
    for (const f of rows) files.push({ filename: String(f.filename), status: String(f.status), ...(f.previous_filename ? { previous_filename: String(f.previous_filename) } : {}) });
    if (rows.length < 100) break;
  }
  return { files, truncated: files.length >= 3000 };
}

export interface TaskPackageFile { path: string; content: string }
const MAX_PACKAGE_FILES = 50;
const MAX_PACKAGE_FILE_BYTES = 1_000_000;
/** Allowed Task Package paths (TZ 11.3). Everything else, including workflows and any `..`, is refused. */
export function isAllowedTaskPackagePath(taskId: string, p: string): boolean {
  if (typeof p !== 'string' || p.includes('\\') || p.includes('\0') || p.startsWith('/') || p.split('/').some((s) => s === '' || s === '.' || s === '..')) return false;
  if (p === 'AGENTS.md') return true;
  const dir = `.biforge/tasks/${taskId}/`;
  if (p.startsWith(dir)) return ['SPEC.md', 'ACCEPTANCE.md', 'EXECUTOR_PROMPT.md'].includes(p.slice(dir.length));
  return p.startsWith('tests/acceptance/') && p.length > 'tests/acceptance/'.length;
}

/**
 * Commit an approved Task Package to `biforge/<task_id>`. Writes are refused unless `writeEnabled` is true
 * (model_patch or diff upload, 11.7). The branch is created from `baseBranch`; `main` is never written.
 */
export async function commitTaskPackage(
  config: GitHubAppConfig,
  input: { taskId: string; baseBranch: string; files: TaskPackageFile[]; message?: string; writeEnabled: boolean },
  fetcher: Fetcher = fetch,
): Promise<{ branch: string; commitShas: string[] }> {
  if (input.writeEnabled !== true) throw new Error('github_write_disabled');
  const branch = taskBranchName(input.taskId);
  if (!/^[A-Za-z0-9._\/-]{1,100}$/.test(input.baseBranch) || input.baseBranch.startsWith('biforge/') || input.baseBranch.includes('..')) throw new Error('invalid_base_branch');
  if (!input.files.length || input.files.length > MAX_PACKAGE_FILES) throw new Error('invalid_file_count');
  for (const f of input.files) {
    if (!isAllowedTaskPackagePath(input.taskId, f.path)) throw new Error('path_not_allowed');
    if (typeof f.content !== 'string' || Buffer.byteLength(f.content, 'utf8') > MAX_PACKAGE_FILE_BYTES) throw new Error('file_too_large');
  }
  const token = await installationToken(config, fetcher, true);
  const repo = repoPath(config);
  const base = await ghJson(config, fetcher, token, `${repo}/git/ref/heads/${input.baseBranch.split('/').map(encodeURIComponent).join('/')}`);
  needOk(base, 'github_base_ref');
  const baseSha = String(base.body?.object?.sha || '');
  if (!/^[0-9a-f]{40}$/i.test(baseSha)) throw new Error('github_base_ref_malformed');
  const created = await ghJson(config, fetcher, token, `${repo}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }) });
  if (created.status !== 201 && created.status !== 422) needOk(created, 'github_create_branch'); // 422: the branch already exists, continue on it
  const commitShas: string[] = [];
  for (const f of input.files) {
    const url = `${repo}/contents/${f.path.split('/').map(encodeURIComponent).join('/')}`;
    const existing = await ghJson(config, fetcher, token, `${url}?ref=${encodeURIComponent(branch)}`);
    const sha = existing.status === 200 && typeof existing.body?.sha === 'string' ? existing.body.sha : undefined;
    const put = await ghJson(config, fetcher, token, url, { method: 'PUT', body: JSON.stringify({ message: (input.message || `Task Package ${input.taskId}`).slice(0, 200), content: Buffer.from(f.content, 'utf8').toString('base64'), branch, ...(sha ? { sha } : {}) }) });
    needOk(put, 'github_put_file');
    commitShas.push(String(put.body?.commit?.sha || ''));
  }
  return { branch, commitShas };
}
