import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

export const IMMOFINDER_SNAPSHOT_PATH = 'data/immofinder/listings.snapshot.enc';
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
  const token = String(env.IMMOFINDER_GITHUB_TOKEN || '').trim();
  const repository = String(env.IMMOFINDER_GITHUB_REPOSITORY || '').trim();
  const branch = String(env.IMMOFINDER_GITHUB_BRANCH || 'main').trim() || 'main';
  const eventCount = Array.isArray(report.events) ? report.events.length : 0;
  if (!token || !repository) return { status: 'skipped', reason: 'github_snapshot_not_configured', paths: [], eventCount };
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('github_diagnostics_repository_invalid');
  const runId = String(meta.runId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80) || 'unknown';
  const paths = [`data/immofinder/diagnostics/runs/${runId}.json`, 'data/immofinder/diagnostics/latest.json'];
  const apiBase = String(options.apiBaseUrl || 'https://api.github.com').replace(/\/+$/, '');
  const fetchImpl = options.fetchImpl || fetch;
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };
  const content = Buffer.from(JSON.stringify(report, null, 2), 'utf8').toString('base64');
  let lastCommitSha: string | undefined;
  for (const path of paths) {
    const endpoint = `${apiBase}/repos/${repository}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
    let written = false;
    for (let attempt = 0; attempt < 3 && !written; attempt++) {
      const current = await fetchImpl(`${endpoint}?ref=${encodeURIComponent(branch)}`, { headers });
      let sha: string | undefined;
      if (current.ok) sha = (await current.json() as { sha?: string }).sha;
      else if (current.status !== 404) throw new Error(`github_diagnostics_read_failed_http_${current.status}`);
      const updated = await fetchImpl(endpoint, { method: 'PUT', headers, body: JSON.stringify({
        message: `chore(immofinder): publish search diagnostics ${runId}`, content, branch, ...(sha ? { sha } : {}),
      }) });
      if (updated.ok) {
        const result = await updated.json() as { commit?: { sha?: string } };
        lastCommitSha = result.commit?.sha || lastCommitSha;
        written = true;
      } else if ((updated.status === 409 || updated.status === 422) && attempt < 2) continue;
      else throw new Error(`github_diagnostics_write_failed_http_${updated.status}`);
    }
    if (!written) throw new Error('github_diagnostics_write_conflict');
  }
  return { status: 'committed', paths, eventCount, commitSha: lastCommitSha };
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
  const token = String(env.IMMOFINDER_GITHUB_TOKEN || '').trim();
  const repository = String(env.IMMOFINDER_GITHUB_REPOSITORY || '').trim();
  const branch = String(env.IMMOFINDER_GITHUB_BRANCH || 'main').trim() || 'main';
  const sessionSecret = String(env.SESSION_SECRET || '');
  if (!token || !repository) {
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
  const apiBase = String(options.apiBaseUrl || 'https://api.github.com').replace(/\/+$/, '');
  const encodedPath = IMMOFINDER_SNAPSHOT_PATH.split('/').map(encodeURIComponent).join('/');
  const endpoint = `${apiBase}/repos/${repository}/contents/${encodedPath}`;
  const fetchImpl = options.fetchImpl || fetch;
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
      throw new Error(`github_snapshot_read_failed_http_${current.status}`);
    }

    const body: Record<string, unknown> = {
      message: `chore(immofinder): encrypted listings snapshot ${String(meta.runId || '').slice(0, 48)}`,
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
    throw new Error(`github_snapshot_write_failed_http_${updated.status}`);
  }
  throw new Error('github_snapshot_write_conflict');
}
