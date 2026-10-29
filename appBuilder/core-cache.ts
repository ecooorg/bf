/** Stable, content-addressed cache keys. Prompt versions are part of the contract. */
import { createHash } from 'node:crypto';

export const PROMPT_VERSION = 'static_site.v2' as const;

export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

export function makeCacheKey(input: {
  unitInput: unknown;
  promptVersion?: string;
  modelId: string;
}): string {
  const canonical = JSON.stringify({
    unitInput: input.unitInput,
    promptVersion: input.promptVersion ?? PROMPT_VERSION,
    modelId: input.modelId,
  });
  return sha256(canonical);
}
