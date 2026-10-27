import { z } from 'zod';
import { capabilitySchema, type Capability } from './adapter.js';
import { eligibleGeminiCandidates } from './modelAvailability.ts';

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
  dataPolicy: z.enum(['paid', 'free', 'self_hosted', 'unknown']),
  /** Cost tier (ADR-07): self_hosted < free < paid. Paid is never used without explicit approval. */
  costTier: z.enum(['self_hosted', 'free', 'paid']),
  /** Provider quota windows; Router rejects a model before the call when the estimated call would exceed one. */
  limits: z.object({ rpm: z.number().int().positive().optional(), rpd: z.number().int().positive().optional(), tpm: z.number().int().positive().optional(), tpd: z.number().int().positive().optional() }).strict().optional(),
  /** Published price, USD per million tokens; used only for the shadow cost in the ledger. */
  pricing: z.object({ inputPerMTok: z.number().min(0), outputPerMTok: z.number().min(0) }).strict().optional(),
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
  // Keep this seed aligned with the only two models configured for the free-key deployment.
  'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite',
];
export const GEMINI_PROBE_MODELS = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemma-4'] as const;
export const REGISTRY_SEED: RegistryEntry[] = GEMINI_MODELS.map((modelId) => registryEntrySchema.parse({
  providerId: 'gemini', modelId, status: 'active', adapter: 'gemini', costTier: 'free',
  capabilities: ['json_output'], qualityClass: 'B', qualityProvisional: true,
  dataPolicy: 'unknown', trainingOptOutConfirmed: false,
  limits: { rpm: 15, rpd: 1500 },
  lastVerifiedAt: '2026-10-25', secretEnvRef: 'GEMINI_API_KEY',
}));
export const GEMINI_CANDIDATE_SEED: RegistryEntry[] = GEMINI_PROBE_MODELS.map((modelId) => registryEntrySchema.parse({
  providerId: 'gemini', modelId, status: 'active', adapter: 'gemini', costTier: 'free',
  capabilities: ['json_output'], qualityClass: 'B', qualityProvisional: true,
  dataPolicy: 'unknown', trainingOptOutConfirmed: false, limits: { rpm: 15, rpd: 1500 },
  lastVerifiedAt: '2026-10-27', secretEnvRef: 'GEMINI_API_KEY',
}));

/** Groq (P07, BX-12.a): OpenAI-compatible. Published model pricing exists; treat as paid unless an operator explicitly opts in. The primary model was previously connection-verified; other entries stay disabled. */
export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
export const GROQ_SEED: RegistryEntry[] = (['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'] as const).map((modelId, i) => registryEntrySchema.parse({
  providerId: 'groq', modelId, status: modelId === 'openai/gpt-oss-120b' ? 'active' : 'disabled', adapter: 'openai-compatible',
  capabilities: modelId === 'openai/gpt-oss-120b' ? ['json_output'] : [], roleHint: 'verifier', contextLimit: modelId.startsWith('openai/') ? 131072 : undefined,
  qualityClass: 'B', qualityProvisional: true, dataPolicy: 'unknown', costTier: 'paid', trainingOptOutConfirmed: false,
  limits: { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
  ...(modelId === 'openai/gpt-oss-120b' ? { pricing: { inputPerMTok: 0.15, outputPerMTok: 0.6 } } : modelId === 'openai/gpt-oss-20b' ? { pricing: { inputPerMTok: 0.075, outputPerMTok: 0.3 } } : {}),
  inputBudgetTokens: 3500, maxOutputTokens: 1500,
  lastVerifiedAt: '2026-10-10', secretEnvRef: 'GROQ_API_KEY',
}));
/** Cloudflare Workers AI is optional and only eligible when its token/account are configured. */
export const CLOUDFLARE_MODEL = '@cf/meta/llama-3.1-8b-instruct';
export const CLOUDFLARE_SEED: RegistryEntry[] = [registryEntrySchema.parse({
  providerId: 'cloudflare-workers-ai', modelId: CLOUDFLARE_MODEL, status: 'active', adapter: 'openai-compatible',
  capabilities: ['json_output'], qualityClass: 'C', qualityProvisional: true, dataPolicy: 'unknown', costTier: 'paid',
  trainingOptOutConfirmed: false, lastVerifiedAt: '2026-10-27', secretEnvRef: 'CLOUDFLARE_API_TOKEN',
})];
/** Seed + optional providers; credentials are required before an adapter can be used. */
export const REGISTRY_ALL: RegistryEntry[] = [...REGISTRY_SEED, ...GROQ_SEED, ...CLOUDFLARE_SEED];

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

/** Parse the Render cascade as an allowlist. Never silently add historical models/providers. */
export function configuredGeminiCascade(kind: 'LIGHT' | 'STRONG', env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env[`MODEL_CASCADE_${kind}`] ?? 'gemini-3.5-flash-lite,gemini-3.1-flash-lite';
  const names = raw.split(',').map((x) => x.trim()).filter(Boolean);
  const allowed = new Set(GEMINI_MODELS);
  const valid = [...new Set(names)].filter((name) => allowed.has(name));
  // Keep the requested primary order invariant even when an old deployment env var reverses it.
  const orderedValid = GEMINI_MODELS.filter((name) => valid.includes(name));
  // Fail closed if a configured cascade has no supported entries; no legacy fallback.
  return orderedValid;
}

/** Registry in cascade order. Only explicitly configured Gemini models can be called. */
export function registryForGeminiCascade(kind: 'LIGHT' | 'STRONG', env: NodeJS.ProcessEnv = process.env): RegistryEntry[] {
  const order = configuredGeminiCascade(kind, env);
  if (!order.length) return []; // explicit empty/unsupported allowlist disables the entire Gemini cascade
  const candidateOrder = eligibleGeminiCandidates();
  return [...order.flatMap((name) => REGISTRY_SEED.filter((entry) => entry.modelId === name)), ...candidateOrder.flatMap((name) => GEMINI_CANDIDATE_SEED.filter((entry) => entry.modelId === name))];
}
