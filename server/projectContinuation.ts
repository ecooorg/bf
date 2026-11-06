import JSZip from 'jszip';
import { readArtifactBytes } from './artifactRepository.ts';

export const MAX_CONTINUATION_FILES = 80;
export const MAX_CONTINUATION_CHARS = 80_000;

export type ContinuationSource = { artifactId: string; version: number; filename: string; files: Array<{ path: string; content: string }> };

/** Load a verified source ZIP and turn it into bounded, explicit context for a follow-up build. */
export async function loadContinuationSource(projectId: string, artifactId: string, version?: number): Promise<ContinuationSource | null> {
  const artifact = await readArtifactBytes(artifactId, version);
  if (!artifact || artifact.project_id !== projectId || artifact.mime !== 'application/zip') return null;
  const zip = await JSZip.loadAsync(Buffer.from(artifact.data), { checkCRC32: true });
  const files: ContinuationSource['files'] = [];
  let chars = 0;
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (path.startsWith('/') || path.split('/').some((part) => part === '..') || path.includes('\\')) {
      throw Object.assign(new Error(`Unsafe path in source archive: ${path}`), { code: 'INVALID_SOURCE_ARCHIVE' });
    }
    if (files.length >= MAX_CONTINUATION_FILES) throw Object.assign(new Error(`Source archive exceeds ${MAX_CONTINUATION_FILES} files`), { code: 'CONTINUATION_LIMIT' });
    const bytes = await entry.async('uint8array');
    let content: string;
    try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { throw Object.assign(new Error(`Binary file cannot yet be continued safely: ${path}`), { code: 'CONTINUATION_BINARY_UNSUPPORTED' }); }
    chars += content.length;
    if (chars > MAX_CONTINUATION_CHARS) throw Object.assign(new Error(`Source archive exceeds ${MAX_CONTINUATION_CHARS} characters of text context`), { code: 'CONTINUATION_LIMIT' });
    files.push({ path, content });
  }
  if (!files.length) throw Object.assign(new Error('Source archive contains no files'), { code: 'INVALID_SOURCE_ARCHIVE' });
  return { artifactId, version: Number(artifact.version), filename: artifact.filename, files };
}

export function buildContinuationTask(goal: string, source: ContinuationSource): string {
  const sourceFiles = source.files.map((f) => `\n--- FILE: ${f.path} ---\n${f.content}\n--- END FILE ---`).join('\n');
  return [
    'CONTINUATION MODE: Modify the existing project below. This is NOT a greenfield task.',
    `Base artifact: ${source.artifactId} version ${source.version} (${source.filename}).`,
    'Preserve existing behavior, design, and files unless the requested change requires otherwise.',
    'Reuse the supplied source files as the authoritative baseline. Make the smallest coherent changes.',
    'Do not claim that files or features exist unless they are present in the resulting build.',
    `USER CHANGE REQUEST:\n${goal}`,
    `EXISTING PROJECT SOURCE (${source.files.length} files):`, sourceFiles,
  ].join('\n\n');
}
