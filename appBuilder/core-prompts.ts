/** Versioned prompts; changing wording that affects output must bump the version. */
import type { ModelRole } from './core-types.ts';
import { PROMPT_VERSION } from './core-cache.ts';

export { PROMPT_VERSION };
export const PROMPT_VERSIONS = { spec: 'app_builder.spec.v3', plan: 'app_builder.plan.v4', code: PROMPT_VERSION, review: 'app_builder.review.v3' } as const;

export function promptFor(role: ModelRole, context: string, expectedPath?: string): { system: string; prompt: string; version: string } {
  const system = 'Follow the user goal, supplied specification, validated plan, and output contract. Do not claim that code was executed or tested unless execution evidence is supplied.';
  if (role === 'planner') return { system, prompt: `Return only valid JSON matching the plan schema expected by the caller.

Create an implementation plan that fits the user's actual goal and requested functionality. Prefer the simplest architecture that can satisfy the requirements:
- Default to a small static site (one index.html plus optional style.css / app.js) that opens by double-click with no build step and no CDN.
- Do not introduce Three.js, React, TypeScript, bundlers, or other frameworks unless the user explicitly requested them.
- Do not force a multi-file structure when a single HTML file is enough.
- Avoid features the user did not request unless they are necessary for the stated goal.

When the plan uses multiple files, define the file map and the contracts needed to integrate them: paths, exports, imports, function signatures, data shapes, and loading strategy. Keep those contracts consistent across units. Every planned import must resolve to a planned file and every named/default import must be exported. Use one compatible module system. The entry HTML must reference every CSS/JS file that is part of the deliverable (no orphaned modules beside a self-contained HTML).

Define acceptance checks for observable user behavior and data flow. Do not treat keyword presence or DOM identifiers alone as proof of functionality. Do not invent measurements, source results, or successful states; represent genuinely unavailable external data honestly.

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
  return { system, prompt: `${context}\nImplement the assigned unit to satisfy the user's goal and specification. Treat the validated plan's paths and contracts as the integration baseline. Do not invent external APIs, credentials, measurements, or source results. If an internal interface needed by the specification is missing from the plan, define the smallest coherent interface and keep its imports/exports consistent with the other supplied contracts. If an external dependency is genuinely unspecified or unavailable, do not pretend it works: provide a clear unavailable state and a concise code comment identifying the unresolved dependency. Preserve every requested feature relevant to this unit; do not omit functionality merely to make the file shorter.

If this unit is the entry HTML, link every CSS/JS file that the plan treats as part of the running app (relative paths). Do not ship a large inline script that duplicates separate module files left unreferenced. If this unit is a module, export exactly the names listed in the plan contract and use the same property/method names other units will call. Finish every function and file completely — never truncate mid-statement.

Return exactly one complete file block and nothing else. First line: ${header} exactly, with nothing after it. Then the complete file content. Last line: <<<END>>>. Do not add code fences or text outside the block.`, version: PROMPT_VERSION };
}
