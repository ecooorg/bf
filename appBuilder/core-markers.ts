/**
 * Parse model output in the <<<FILE path>>> … <<<END>>> marker format.
 * Detects truncation (missing END), multiple files, garbage, and unsafe paths.
 * With expectedPath it also repairs three known model slips deterministically (reported in `coerced`):
 * the placeholder header `<<<FILE path>>>index.html`, a decorated header `<<<FILE path=index.html>>>`, and a code fence around the content.
 */

import { isSafePath } from './core-plan.ts';

export interface ParsedFile {
  path: string;
  content: string;
}

export interface MarkerParseResult {
  files: ParsedFile[];
  truncated: boolean;
  issues: string[];
  coerced?: string[];
}

const FILE_OPEN = /<<<FILE\s+([^\n>]+)>>>/g;
const END_MARKER = '<<<END>>>';

/**
 * Extract file blocks from model text.
 * - Missing <<<END>>> after a FILE open → truncated=true.
 * - Paths that fail isSafePath are skipped and reported in issues.
 * - Content outside markers is ignored (garbage before/after).
 */
function stripFence(content: string): string | null {
  const m = /^\s*```[A-Za-z0-9_+-]*[ \t]*\r?\n([\s\S]*?)\r?\n```\s*$/.exec(content);
  return m ? m[1] : null;
}

export function parseFileMarkers(text: string, expectedPath?: string): MarkerParseResult {
  const files: ParsedFile[] = [];
  const issues: string[] = [];
  const coerced: string[] = [];
  let truncated = false;

  if (typeof text !== 'string' || text.length === 0) {
    return { files, truncated: false, issues: ['empty_output'], coerced };
  }

  let pos = 0;
  const opens: Array<{ path: string; start: number; headerEnd: number }> = [];

  // Collect all FILE opens with positions
  const re = new RegExp(FILE_OPEN.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const rawPath = m[1].trim();
    opens.push({ path: rawPath, start: m.index, headerEnd: m.index + m[0].length });
  }

  if (opens.length === 0) {
    issues.push('no_file_markers');
    return { files, truncated: false, issues, coerced };
  }

  for (let i = 0; i < opens.length; i++) {
    const open = opens[i];
    const contentStart = open.headerEnd;
    // Search for END after this open, before next open if any
    const searchEnd = i + 1 < opens.length ? opens[i + 1].start : text.length;
    const slice = text.slice(contentStart, searchEnd);
    const endIdx = slice.indexOf(END_MARKER);

    const complete = endIdx >= 0;
    let content = complete ? slice.slice(0, endIdx) : slice;
    // Trim a single leading/trailing newline often produced by models
    if (content.startsWith('\r\n')) content = content.slice(2);
    else if (content.startsWith('\n')) content = content.slice(1);
    if (content.endsWith('\r\n')) content = content.slice(0, -2);
    else if (content.endsWith('\n')) content = content.slice(0, -1);

    let path = open.path;
    if (expectedPath) {
      const decorated = path.replace(/^path\s*[=:]\s*/i, '').replace(/^["'`]+|["'`]+$/g, '').trim();
      if (decorated !== path && decorated === expectedPath) { path = decorated; coerced.push('marker_path_decorated'); }
      if (path.toLowerCase() === 'path') {
        const nl = content.search(/\r?\n/);
        const firstLine = (nl < 0 ? content : content.slice(0, nl)).trim();
        if (firstLine === expectedPath) {
          path = firstLine;
          content = nl < 0 ? '' : content.slice(nl).replace(/^\r?\n/, '');
          coerced.push('marker_path_placeholder');
        }
      }
      if (path === expectedPath) {
        const unfenced = stripFence(content);
        if (unfenced !== null) { content = unfenced; coerced.push('code_fence'); }
      }
    }

    if (!complete) {
      truncated = true;
      issues.push(`missing_end_for:${path}`);
      // Still capture partial content for diagnostics
      if (isSafePath(path)) files.push({ path, content });
      else issues.push(`unsafe_path:${path}`);
      continue;
    }
    if (!isSafePath(path)) {
      issues.push(`unsafe_path:${path}`);
      continue;
    }
    files.push({ path, content });
    pos = contentStart + endIdx + END_MARKER.length;
  }

  return { files, truncated, issues, coerced };
}

/**
 * Build a marker-wrapped file block (for tests / fake model).
 */
export function formatFileMarker(path: string, content: string): string {
  return `<<<FILE ${path}>>>\n${content}\n<<<END>>>`;
}
