import { createGitHubContentsWriteToken, type GitHubAppConfig } from './githubIntegration.ts';
import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

export const IMMOFINDER_SNAPSHOT_PATH = 'data/immofinder/listings.snapshot.enc';

function githubAppConfigForRepository(env: NodeJS.ProcessEnv, repository: string, apiBaseUrl?: string): GitHubAppConfig | null {
  const appId = String(env.GITHUB_APP_ID || '').trim();
  const installationId = String(env.GITHUB_APP_INSTALLATION_ID || '').trim();
  const privateKey = String(env.GITHUB_APP_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
  const owner = String(env.GITHUB_REPOSITORY_OWNER || '').trim();
  const name = String(env.GITHUB_REPOSITORY_NAME || '').trim();
  if (!appId || !installationId || !privateKey || !owner || !name) return null;
  if ((owner + '/' + name).toLowerCase() !== repository.toLowerCase()) throw new Error('github_app_repository_config_mismatch');
  return { appId, installationId, privateKey, owner, repository: name, apiBaseUrl };
}

async function resolveGitHubContentsToken(env: NodeJS.ProcessEnv, repository: string, fetchImpl: typeof fetch, apiBaseUrl: string): Promise<string | null> {
  const appConfig = githubAppConfigForRepository(env, repository, apiBaseUrl);
  if (appConfig) return createGitHubContentsWriteToken(appConfig, fetchImpl);
  const legacyToken = String(env.IMMOFINDER_GITHUB_TOKEN || '').trim();
  return legacyToken || null;
}

async function githubFailure(prefix: string, response: Response): Promise<Error> {
  let message = '';
  try {
    const body = await response.json() as { message?: unknown };
    if (typeof body?.message === 'string') message = body.message.toLowerCase().replace(/[^a-z0-9 _-]/g, '').replace(/\s+/g, '_').slice(0, 90);
  } catch { /* GitHub may return an empty or non-JSON body. */ }
  const requestId = response.headers?.get?.('x-github-request-id');
  const safeRequestId = requestId ? String(requestId).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40) : '';
  return new Error(prefix + '_http_' + response.status + (message ? '_' + message : '') + (safeRequestId ? '_request_' + safeRequestId : ''));
}

const FORMAT = 'biforge-immofinder-encrypted-snapshot';
const KEY_SALT = Buffer.from('biforge-immofinder-snapshot-v1', 'utf8');
const KEY_INFO = Buffer.from('github-contents-aes-256-gcm', 'utf8');

export interface EncryptedSnapshotEnvelope {
  format: typeof FORMAT;
  version: 1;
  algorithm: 'aes-256-gcm';
  nonce: string;
  tag: string;
  ciphertext: string;
}

export function deriveSnapshotKey(sessionSecret: string): Buffer {
  const secret = String(sessionSecret || '');
  if (secret.length < 32) throw new Error('snapshot_encryption_requires_stable_session_secret_32_chars');
  return Buffer.from(hkdfSync('sha256', Buffer.from(secret, 'utf8'), KEY_SALT, KEY_INFO, 32));
}

export function encryptSnapshotPayload(payload: unknown, sessionSecret: string): EncryptedSnapshotEnvelope {
  const key = deriveSnapshotKey(sessionSecret);
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(payload), 'utf8')),
    cipher.final(),
  ]);
  return {
    format: FORMAT,
    version: 1,
    algorithm: 'aes-256-gcm',
    nonce: nonce.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

export function decryptSnapshotPayload(envelope: EncryptedSnapshotEnvelope, sessionSecret: string): unknown {
  if (!envelope || envelope.format !== FORMAT || envelope.version !== 1 || envelope.algorithm !== 'aes-256-gcm') {
    throw new Error('snapshot_envelope_unsupported');
  }
  const decipher = createDecipheriv('aes-256-gcm', deriveSnapshotKey(sessionSecret), Buffer.from(envelope.nonce, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(plain);
}

export interface GitHubSnapshotResult {
  status: 'committed' | 'skipped';
  reason?: string;
  path: string;
  rowCount: number;
  commitSha?: string;
}

export interface GitHubRunDiagnosticsResult {
  status: 'committed' | 'skipped';
  reason?: string;
  paths: string[];
  eventCount: number;
  commitSha?: string;
}

/** Publish a PII-redacted per-run trace and a latest pointer for immediate GitHub inspection. */
export async function publishGitHubRunDiagnostics(
  report: Record<string, unknown>,
  meta: { runId: string },
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch; apiBaseUrl?: string } = {},
): Promise<GitHubRunDiagnosticsResult> {
  const env = options.env || process.env;
  const repository = String(env.IMMOFINDER_GITHUB_REPOSITORY || '').trim();
  const branch = String(env.IMMOFINDER_GITHUB_BRANCH || 'main').trim() || 'main';
  const events = Array.isArray(report.events) ? report.events : [];
  const eventCount = events.length;
  if (!repository) return { status: 'skipped', reason: 'github_snapshot_not_configured', paths: [], eventCount };
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('github_diagnostics_repository_invalid');
  const runId = String(meta.runId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80) || 'unknown';
  const runPath = 'data/immofinder/diagnostics/runs/' + runId + '.json';
  const latestPath = 'data/immofinder/diagnostics/latest.json';
  const apiBase = String(options.apiBaseUrl || env.GITHUB_API_BASE_URL || 'https://api.github.com').replace(/\/+$/, '');
  const fetchImpl = options.fetchImpl || fetch;
  const token = await resolveGitHubContentsToken(env, repository, fetchImpl, apiBase);
  if (!token) return { status: 'skipped', reason: 'github_snapshot_not_configured', paths: [], eventCount };
  const headers = { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };
  const fullText = JSON.stringify(report, null, 2);
  const documents: { path: string; text: string }[] = [];
  // GitHub's Contents API has a small per-file limit. Keep ordinary runs as one readable JSON;
  // split unusually large traces into numbered event parts and leave a manifest at latest.json.
  if (Buffer.byteLength(fullText, 'utf8') <= 800_000) {
    documents.push({ path: runPath, text: fullText });
    documents.push({ path: latestPath, text: fullText });
  } else {
    const traceId = String(report.traceId || '');
    const chunks: unknown[][] = [];
    let current: unknown[] = [];
    for (const event of events) {
      const candidate = [...current, event];
      const size = Buffer.byteLength(JSON.stringify({ runId, traceId, events: candidate }), 'utf8');
      if (size > 700_000 && current.length) {
        chunks.push(current);
        current = [event];
      } else current = candidate;
    }
    if (current.length) chunks.push(current);
    const eventFiles: string[] = [];
    chunks.forEach((chunk, index) => {
      const part = String(index + 1).padStart(3, '0');
      const path = 'data/immofinder/diagnostics/runs/' + runId + '/events-' + part + '.json';
      eventFiles.push(path);
      documents.push({ path, text: JSON.stringify({ schemaVersion: report.schemaVersion || 1, runId, traceId, part: index + 1, partCount: chunks.length, eventCount: chunk.length, events: chunk }, null, 2) });
    });
    const manifest = { ...report, events: undefined, eventFiles, eventsStoredInParts: true, eventCount };
    const manifestText = JSON.stringify(manifest, null, 2);
    documents.push({ path: runPath, text: manifestText });
    documents.push({ path: latestPath, text: manifestText });
  }
  let lastCommitSha: string | undefined;
  for (const document of documents) {
    const endpoint = apiBase + '/repos/' + repository + '/contents/' + document.path.split('/').map(encodeURIComponent).join('/');
    const content = Buffer.from(document.text, 'utf8').toString('base64');
    let written = false;
    for (let attempt = 0; attempt < 3 && !written; attempt++) {
      const current = await fetchImpl(endpoint + '?ref=' + encodeURIComponent(branch), { headers });
      let sha: string | undefined;
      if (current.ok) sha = (await current.json() as { sha?: string }).sha;
      else if (current.status !== 404) throw await githubFailure('github_diagnostics_read_failed', current);
      const updated = await fetchImpl(endpoint, { method: 'PUT', headers, body: JSON.stringify({
        message: 'chore(immofinder): publish search diagnostics ' + runId + ' [skip render]', content, branch, ...(sha ? { sha } : {}),
      }) });
      if (updated.ok) {
        const result = await updated.json() as { commit?: { sha?: string } };
        lastCommitSha = result.commit?.sha || lastCommitSha;
        written = true;
      } else if ((updated.status === 409 || updated.status === 422) && attempt < 2) continue;
      else throw await githubFailure('github_diagnostics_write_failed', updated);
    }
    if (!written) throw new Error('github_diagnostics_write_conflict');
  }
  return { status: 'committed', paths: documents.map((d) => d.path), eventCount, commitSha: lastCommitSha };
}

export async function publishGitHubListingsSnapshot(
  rows: Record<string, unknown>[],
  meta: { runId: string; completedAt?: string },
  options: {
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
    apiBaseUrl?: string;
  } = {},
): Promise<GitHubSnapshotResult> {
  const env = options.env || process.env;
  const repository = String(env.IMMOFINDER_GITHUB_REPOSITORY || '').trim();
  const branch = String(env.IMMOFINDER_GITHUB_BRANCH || 'main').trim() || 'main';
  const sessionSecret = String(env.SESSION_SECRET || '');
  if (!repository) {
    return { status: 'skipped', reason: 'github_snapshot_not_configured', path: IMMOFINDER_SNAPSHOT_PATH, rowCount: rows.length };
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error('github_snapshot_repository_invalid');
  }
  if (sessionSecret.length < 32) throw new Error('github_snapshot_session_secret_too_short');

  const payload = {
    schemaVersion: 1,
    generatedAt: meta.completedAt || new Date().toISOString(),
    runId: String(meta.runId || ''),
    rowCount: rows.length,
    rows,
  };
  const envelope = encryptSnapshotPayload(payload, sessionSecret);
  const content = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');
  const apiBase = String(options.apiBaseUrl || env.GITHUB_API_BASE_URL || 'https://api.github.com').replace(/\/+$/, '');
  const fetchImpl = options.fetchImpl || fetch;
  const token = await resolveGitHubContentsToken(env, repository, fetchImpl, apiBase);
  if (!token) return { status: 'skipped', reason: 'github_snapshot_not_configured', path: IMMOFINDER_SNAPSHOT_PATH, rowCount: rows.length };
  const encodedPath = IMMOFINDER_SNAPSHOT_PATH.split('/').map(encodeURIComponent).join('/');
  const endpoint = `${apiBase}/repos/${repository}/contents/${encodedPath}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };

  // Retry SHA races caused by overlapping manual/scheduled completion callbacks.
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await fetchImpl(`${endpoint}?ref=${encodeURIComponent(branch)}`, { headers });
    let sha: string | undefined;
    if (current.ok) {
      const file = await current.json() as { sha?: string };
      sha = file.sha;
    } else if (current.status !== 404) {
      throw await githubFailure('github_snapshot_read_failed', current);
    }

    const body: Record<string, unknown> = {
      message: `chore(immofinder): encrypted listings snapshot ${String(meta.runId || '').slice(0, 48)} [skip render]`,
      content,
      branch,
    };
    if (sha) body.sha = sha;
    const updated = await fetchImpl(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    if (updated.ok) {
      const result = await updated.json() as { commit?: { sha?: string } };
      return {
        status: 'committed',
        path: IMMOFINDER_SNAPSHOT_PATH,
        rowCount: rows.length,
        commitSha: result.commit?.sha,
      };
    }
    if ((updated.status === 409 || updated.status === 422) && attempt < 2) continue;
    throw await githubFailure('github_snapshot_write_failed', updated);
  }
  throw new Error('github_snapshot_write_conflict');
}
