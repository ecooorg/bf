/**
 * Parse model output in the <<<FILE path>>> … <<<END>>> marker format.
 * Detects truncation (missing END), multiple files, garbage, and unsafe paths.
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
}

const FILE_OPEN = /<<<FILE\s+([^\n>]+)>>>/g;
const END_MARKER = '<<<END>>>';

/**
 * Extract file blocks from model text.
 * - Missing <<<END>>> after a FILE open → truncated=true.
 * - Paths that fail isSafePath are skipped and reported in issues.
 * - Content outside markers is ignored (garbage before/after).
 */
export function parseFileMarkers(text: string): MarkerParseResult {
  const files: ParsedFile[] = [];
  const issues: string[] = [];
  let truncated = false;

  if (typeof text !== 'string' || text.length === 0) {
    return { files, truncated: false, issues: ['empty_output'] };
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
    return { files, truncated: false, issues };
  }

  for (let i = 0; i < opens.length; i++) {
    const open = opens[i];
    const contentStart = open.headerEnd;
    // Search for END after this open, before next open if any
    const searchEnd = i + 1 < opens.length ? opens[i + 1].start : text.length;
    const slice = text.slice(contentStart, searchEnd);
    const endIdx = slice.indexOf(END_MARKER);

    if (endIdx < 0) {
      truncated = true;
      issues.push(`missing_end_for:${open.path}`);
      // Still capture partial content for diagnostics
      const partial = slice.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
      if (isSafePath(open.path)) {
        files.push({ path: open.path, content: partial });
      } else {
        issues.push(`unsafe_path:${open.path}`);
      }
      continue;
    }

    let content = slice.slice(0, endIdx);
    // Trim a single leading/trailing newline often produced by models
    if (content.startsWith('\r\n')) content = content.slice(2);
    else if (content.startsWith('\n')) content = content.slice(1);
    if (content.endsWith('\r\n')) content = content.slice(0, -2);
    else if (content.endsWith('\n')) content = content.slice(0, -1);

    if (!isSafePath(open.path)) {
      issues.push(`unsafe_path:${open.path}`);
      continue;
    }

    files.push({ path: open.path, content });
    pos = contentStart + endIdx + END_MARKER.length;
  }

  return { files, truncated, issues };
}

/**
 * Build a marker-wrapped file block (for tests / fake model).
 */
export function formatFileMarker(path: string, content: string): string {
  return `<<<FILE ${path}>>>\n${content}\n<<<END>>>`;
}
