/** Versioned prompts; changing wording that affects output must bump the version. */
import type { ModelRole } from './core-types.ts';
import { PROMPT_VERSION } from './core-cache.ts';

export { PROMPT_VERSION };
export const PROMPT_VERSIONS = { spec: 'app_builder.spec.v3', plan: 'app_builder.plan.v5', code: PROMPT_VERSION, review: 'app_builder.review.v3' } as const;

export function promptFor(role: ModelRole, context: string, expectedPath?: string): { system: string; prompt: string; version: string } {
  const system = 'Follow the user goal, supplied specification, validated plan, and output contract. Do not claim that code was executed or tested unless execution evidence is supplied.';
  if (role === 'planner') return { system, prompt: `Return only valid JSON matching the plan schema expected by the caller.

Create an implementation plan that fits the user's actual goal and requested functionality.
- Default to a small static site that opens by double-click: no build step, no CDN, no TypeScript, no React, no Three.js unless the user explicitly asked for them.
- For any interactive app (game, canvas, keyboard/touch controls, score, editor, non-trivial logic): plan MULTIPLE files — at least index.html + app.js, and style.css when layout is non-trivial. Never put the whole game or app logic in a single index.html unit.
- A single HTML file is allowed only for a trivial static page with almost no script.
- Keep each unit small enough to finish in one model reply (prefer under ~200 lines / ~8KB of source per file).
- When the task is standard or ambitious, plan many small modules (often 12–32 files: main.js, scene.js, style.css, index.html (flat, no folders)), not 1–3 files.
- Prefer many flat files (scene.js, input.js, entities.js) over one app.js monolith. No subfolders.
- Avoid features the user did not request unless they are necessary for the stated goal.

When the plan uses multiple files, define the file map and contracts: paths, exports, imports, function/property names, and how HTML loads CSS/JS. Every planned import must resolve to a planned file. The entry HTML must reference every CSS/JS file that is part of the deliverable (no orphan modules beside a self-contained HTML).

Define acceptance checks for observable user behavior. Do not treat keyword presence alone as proof of functionality.

Stage: ${context}`, version: PROMPT_VERSIONS.plan };
  if (role === 'reviewer') return { system, prompt: `Review the supplied result against the user's goal, specification, plan, and actual files. Do not execute the artifact.
- Check referenced files, imports/exports, function names, arguments, return shapes, and shared data contracts against the supplied files.
- Trace the main user actions from UI event through computation to rendered result where the source makes that trace possible.
- Identify fabricated data, misleading defaults, swallowed errors, stale placeholders, broken links, and false success states when evidenced.
- Separate defects from optional improvements. Do not demand features absent from the user's request or report style preferences as blockers.
- Distinguish static inspection from runtime behavior; do not claim runtime validation without execution evidence.
- Report concrete file/line-level findings and prioritize functional blockers.
Stage: ${context}`, version: PROMPT_VERSIONS.review };
  const header = expectedPath ? `<<<FILE ${expectedPath}>>>` : '<<<FILE index.html>>> (use the real file path in place of index.html)';
  return { system, prompt: `${context}\nImplement the assigned unit to satisfy the user's goal and specification. Treat the validated plan's paths and contracts as the integration baseline. Do not invent external APIs, credentials, measurements, or source results. If an internal interface needed by the specification is missing from the plan, define the smallest coherent interface and keep its imports/exports consistent with the other supplied contracts. If an external dependency is genuinely unspecified or unavailable, do not pretend it works: provide a clear unavailable state and a concise code comment identifying the unresolved dependency.

Keep THIS unit compact so it always finishes in one reply (prefer under ~200 lines). Do not paste the whole application into one file when the plan assigns other files for logic or styles.

If this unit is the entry HTML, link every CSS/JS file from the plan with relative paths. Prefer short markup and external scripts — do not embed a large game engine inline. If this unit is a module, export exactly the names listed in the plan contract and use the same property/method names other units will call. Finish every function completely — never stop mid-statement.

Return exactly one complete file block and nothing else. First line: ${header} exactly. Then the complete file content. Last line MUST be <<<END>>> (required). Do not add code fences or text outside the block.`, version: PROMPT_VERSION };
}

/** P127.20: names a JS module actually exports (syntax-level scan; no execution). */
export function exportedNames(source: string): string[] {
  const names = new Set<string>();
  for (const m of source.matchAll(/^\s*export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of source.matchAll(/^\s*export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/i).pop()?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  if (/^\s*export\s+default\b/m.test(source)) names.add('default');
  return [...names];
}

/** P127.20: exact interface of modules generated so far, so later units import only what exists. */
export function domContract(source: string): { ids: string[]; classes: string[] } {
  const ids = new Set<string>();
  const classes = new Set<string>();
  for (const m of source.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)) ids.add(m[1].trim());
  for (const m of source.matchAll(/\sclass\s*=\s*["']([^"']+)["']/gi)) for (const c of m[1].split(/\s+/)) if (c) classes.add(c);
  return { ids: [...ids].slice(0, 80), classes: [...classes].slice(0, 120) };
}

export function interfaceBlock(files: Map<string, { content: string }>): string {
  const lines: string[] = [];
  const dom: string[] = [];
  for (const [path, f] of files) {
    if (!/\.html?$/i.test(path)) continue;
    const c = domContract(f.content);
    dom.push(`- ${path}: ids [${c.ids.join(', ')}]; classes [${c.classes.join(', ')}]`);
  }
  for (const [path, f] of files) {
    if (!/\.m?js$/i.test(path)) continue;
    const names = exportedNames(f.content).slice(0, 30);
    lines.push(`- ${path}: ${names.length ? `exports ${names.join(', ')}` : 'exports nothing (plain script; do not import from it)'}`);
    if (lines.length >= 24) break;
  }
  const domText = dom.length ? `\nACTUAL page markup (authoritative; style and script ONLY these ids/classes, do not invent selectors for elements that are not listed):\n${dom.join('\n')}\n` : '';
  return domText + (lines.length
    ? `\nACTUAL interfaces of files already generated (authoritative; import ONLY these names from these files, use named imports exactly as listed, and never reference files or media assets that are not in the plan):\n${lines.join('\n')}\n`
    : '');
}
