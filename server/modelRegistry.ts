import { z } from 'zod';
import { capabilitySchema, type Capability } from './adapter.js';

/** Model Registry record (TZ 7.1). Holds env variable NAMES only, never secrets. */
export const registryEntrySchema = z.object({
  providerId: z.string().min(1).max(80),
  modelId: z.string().min(1).max(200),
  status: z.enum(['active', 'disabled', 'cooldown']),
  adapter: z.enum(['gemini', 'openai-compatible', 'anthropic', 'fake']),
  capabilities: z.array(capabilitySchema),
  roleHint: z.enum(['executor', 'verifier', 'code_author']).optional(),
  contextLimit: z.number().int().positive().optional(),
  qualityClass: z.enum(['A', 'B', 'C']),
  qualityProvisional: z.boolean(),
  dataPolicy: z.enum(['paid', 'free', 'unknown']),
  trainingOptOutConfirmed: z.boolean(),
  lastVerifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Per-model budgets (e.g. Groq Free: 8K tokens/min), consumed by Context Builder/Router. */
  inputBudgetTokens: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  secretEnvRef: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
}).strict();
export type RegistryEntry = z.infer<typeof registryEntrySchema>;

/** Seed: only what already works in BE v1.6.0 (Gemini, default cascades). Model names live only here. */
const GEMINI_MODELS = [
  'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash',
  'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash',
];
export const REGISTRY_SEED: RegistryEntry[] = GEMINI_MODELS.map((modelId) => registryEntrySchema.parse({
  providerId: 'gemini', modelId, status: 'active', adapter: 'gemini',
  capabilities: ['json_output'], qualityClass: 'B', qualityProvisional: true,
  dataPolicy: 'unknown', trainingOptOutConfirmed: false,
  lastVerifiedAt: '2026-10-10', secretEnvRef: 'GEMINI_API_KEY',
}));

/** Groq (P07, BX-12.a): openai-compatible, Free plan. Disabled until `verify:connections --only groq` is OK; the owner then activates the primary model. */
export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
export const GROQ_SEED: RegistryEntry[] = (['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'] as const).map((modelId, i) => registryEntrySchema.parse({
  providerId: 'groq', modelId, status: 'disabled', adapter: 'openai-compatible',
  capabilities: [], roleHint: 'verifier', contextLimit: modelId.startsWith('openai/') ? 131072 : undefined,
  qualityClass: 'B', qualityProvisional: true, dataPolicy: 'free', trainingOptOutConfirmed: false,
  inputBudgetTokens: 3500, maxOutputTokens: 1500,
  lastVerifiedAt: '2026-10-10', secretEnvRef: 'GROQ_API_KEY',
}));
/** Seed + additional providers; used by verify:connections. */
export const REGISTRY_ALL: RegistryEntry[] = [...REGISTRY_SEED, ...GROQ_SEED];

export function validateRegistry(entries: unknown[]): RegistryEntry[] {
  const parsed = entries.map((e) => registryEntrySchema.parse(e));
  const seen = new Set<string>();
  for (const e of parsed) {
    const k = `${e.providerId}/${e.modelId}`;
    if (seen.has(k)) throw new Error(`Duplicate registry entry: ${k}`);
    seen.add(k);
  }
  return parsed;
}

/** An entry can serve a task only if active and every required capability is confirmed. */
export function supports(entry: RegistryEntry, required: Capability[]): boolean {
  return entry.status === 'active' && required.every((c) => entry.capabilities.includes(c));
}

/** Entries verified more than 90 days ago get a warning (TZ 7.1). */
export function staleEntries(entries: RegistryEntry[], now: Date = new Date()): RegistryEntry[] {
  return entries.filter((e) => now.getTime() - Date.parse(`${e.lastVerifiedAt}T00:00:00Z`) > 90 * 86_400_000);
}
