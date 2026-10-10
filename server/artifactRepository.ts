import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getPool } from './database.ts';

/** Minimal Artifact Registry (BX-17.a, TZ 10.1-10.2): text artifacts, versions, SHA-256, no duplicate content. */
export const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024;
const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const artifactInputSchema = z.object({
  projectId: idSchema,
  artifactId: idSchema.optional(),          // omitted: a new artifact; given: a new version of it
  filename: z.string().trim().min(1).max(255).refine((n) => !/[\\/\0]/.test(n), 'filename must not contain path separators'),
  mime: z.string().trim().min(1).max(120).default('text/plain'),
  text: z.string(),
  createdBy: z.string().trim().min(1).max(200),
  derivedFrom: z.array(z.string().max(300)).max(50).default([]),
}).strict();
export type ArtifactInput = z.input<typeof artifactInputSchema>;

export const sha256Hex = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const newId = () => `${Date.now().toString(36).padStart(9, '0')}_${createHash('sha256').update(String(Math.random()) + Date.now()).digest('hex').slice(0, 24)}`;

export class ArtifactIntegrityError extends Error { readonly code = 'INTEGRITY'; }

/** Creates the artifact or its next version. Same content as the latest version returns that version (created: false). */
export async function saveArtifact(input: ArtifactInput) {
  const v = artifactInputSchema.parse(input);
  const bytes = Buffer.from(v.text, 'utf8');
  if (bytes.length > MAX_ARTIFACT_BYTES) throw new z.ZodError([{ code: 'custom', path: ['text'], message: 'Artifact is larger than 5 MB' }]);
  const hash = sha256Hex(bytes);
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const artifactId = v.artifactId ?? newId();
    if (v.artifactId) await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [artifactId]);
    const latest = await client.query('SELECT version, hash, project_id FROM artifacts WHERE artifact_id=$1 ORDER BY version DESC LIMIT 1', [artifactId]);
    const last = latest.rows[0];
    if (last && last.project_id !== v.projectId) throw new Error('Artifact belongs to another project');
    if (last && last.hash === hash) {
      await client.query('COMMIT');
      return { artifactId, version: Number(last.version), hash, size: bytes.length, created: false };
    }
    const version = last ? Number(last.version) + 1 : 1;
    await client.query(
      `INSERT INTO artifacts(id,artifact_id,version,project_id,filename,mime,size,hash,content,created_by,derived_from)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,
      [newId(), artifactId, version, v.projectId, v.filename, v.mime, bytes.length, hash, bytes, v.createdBy, JSON.stringify(v.derivedFrom)]);
    await client.query('COMMIT');
    return { artifactId, version, hash, size: bytes.length, created: true };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally { client.release(); }
}

/** Reads a version (latest when omitted) and verifies hash and size; a mismatch is an integrity error. */
export async function readArtifact(artifactId: string, version?: number) {
  const id = idSchema.parse(artifactId);
  const pool = await getPool();
  const r = version === undefined
    ? await pool.query('SELECT * FROM artifacts WHERE artifact_id=$1 ORDER BY version DESC LIMIT 1', [id])
    : await pool.query('SELECT * FROM artifacts WHERE artifact_id=$1 AND version=$2', [id, version]);
  const row = r.rows[0];
  if (!row) return null;
  const content = Buffer.from(row.content);
  if (content.length !== Number(row.size) || sha256Hex(content) !== row.hash) throw new ArtifactIntegrityError(`Integrity check failed for ${id} v${row.version}`);
  const { content: _omit, ...meta } = row;
  return { ...meta, text: content.toString('utf8') };
}

export async function listArtifactVersions(artifactId: string) {
  const pool = await getPool();
  const r = await pool.query('SELECT artifact_id, version, filename, mime, size, hash, created_by, created_at FROM artifacts WHERE artifact_id=$1 ORDER BY version', [idSchema.parse(artifactId)]);
  return r.rows;
}
