/** Versioned prompts; changing wording that affects output must bump the version. */
import type { ModelRole } from './core-types.ts';
import { PROMPT_VERSION } from './core-cache.ts';

export { PROMPT_VERSION };
export const PROMPT_VERSIONS = { spec: 'app_builder.spec.v2', plan: 'app_builder.plan.v2', code: PROMPT_VERSION } as const;

export function promptFor(role: ModelRole, context: string, expectedPath?: string): { system: string; prompt: string; version: string } {
  const system = 'You are a careful software construction component. Follow the requested output format exactly. Do not claim tests ran unless they did.';
  if (role === 'planner') return { system, prompt: `Return only valid JSON.

ARCHITECTURAL CONTRACT REQUIREMENTS
- Prefer one self-contained index.html for small browser applications unless the request clearly benefits from multiple modules.
- If multiple files are necessary, define the complete file map and an explicit interface contract BEFORE coding: each module's exact exports, import paths, function signatures, argument/return shapes, shared data schema, and browser loading strategy (ES modules with type="module").
- Every import must resolve to a generated file and every named/default import must exist in that file's exports. Do not mix ES modules and classic scripts.
- Define acceptance checks that exercise user-visible behavior and data flow, not merely keyword presence or DOM identifiers.
- Never use fabricated fallback measurements or silently convert failed sources into successful data. Represent unavailable values as null/unknown and exclude them from aggregates.
Stage: ${context}`, version: PROMPT_VERSIONS.plan };
  if (role === 'reviewer') return { system, prompt: `Review the supplied result without executing it. Inspect the whole artifact as a connected system:
- Verify every referenced file, import/export, function name, argument and return shape against the actual files.
- Trace each core user action from UI event to computation to rendered result.
- Reject fabricated data, silent defaults, swallowed errors, stale placeholders and misleading success states.
- Distinguish static evidence from runtime behavior; never claim runtime validation without an execution test.
- Report concrete file/line-level defects and prioritize blockers over style.
Stage: ${context}`, version: 'app_builder.review.v2' };
  const header = expectedPath ? `<<<FILE ${expectedPath}>>>` : '<<<FILE index.html>>> (use the real file path in place of index.html)';
  return { system, prompt: `${context}\nUse only the interfaces, paths and schemas explicitly defined in the plan. Do not invent imports, exports, functions, properties or fallback data. If a dependency contract is missing or contradictory, return a minimal valid file and explicitly surface the blocker in the file content as a TODO rather than guessing. For source failures use null/unknown, show a clear unavailable state, and exclude failed sources from calculations. Reply with exactly one file block and nothing else. First line: ${header} exactly, with nothing after it. Then the complete file content. Last line: <<<END>>>. Do not add code fences or text outside the block.`, version: PROMPT_VERSION };
}
