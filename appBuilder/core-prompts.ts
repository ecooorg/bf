/** Versioned prompts; changing wording that affects output must bump the version. */
import type { ModelRole } from './core-types.ts';
import { PROMPT_VERSION } from './core-cache.ts';

export { PROMPT_VERSION };
export const PROMPT_VERSIONS = { spec: 'app_builder.spec.v1', plan: 'app_builder.plan.v1', code: PROMPT_VERSION } as const;

export function promptFor(role: ModelRole, context: string): { system: string; prompt: string; version: string } {
  const system = 'You are a careful software construction component. Follow the requested output format exactly. Do not claim tests ran unless they did.';
  if (role === 'planner') return { system, prompt: `Return only valid JSON. Stage: ${context}`, version: PROMPT_VERSIONS.plan };
  if (role === 'reviewer') return { system, prompt: `Review the supplied result without executing it. Stage: ${context}`, version: 'app_builder.review.v1' };
  return { system, prompt: `${context}\nReturn file content only inside <<<FILE path>>> and <<<END>>> markers.`, version: PROMPT_VERSION };
}
