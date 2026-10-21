/**
 * App Builder IR — compact machine representation of a product to build.
 * Humans see questions / passport; the pipeline consumes IR only.
 */
import { z } from 'zod';

export const AppKindSchema = z.enum(['website', 'app', 'bot', 'utility', 'other']);
export const StackIdSchema = z.enum(['static_site', 'node_api', 'node_express_static', 'auto']);
export const TriStateSchema = z.enum(['yes', 'no', 'unsure']);

export const AppIrSchema = z.object({
  version: z.literal(1).default(1),
  name: z.string().trim().min(1).max(80),
  goal: z.string().trim().min(1).max(4000),
  kind: AppKindSchema.default('website'),
  stack: StackIdSchema.default('auto'),
  needsAuth: TriStateSchema.default('unsure'),
  needsDb: TriStateSchema.default('unsure'),
  language: z.enum(['en', 'ru', 'other']).default('en'),
  constraints: z.string().trim().max(2000).default(''),
  /** Optional free-form features the model may implement in a narrow custom slice. */
  features: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
}).strict();

export type AppIr = z.infer<typeof AppIrSchema>;

export type ResolvedStack = 'static_site' | 'node_api' | 'node_express_static';

/** Pick a concrete scaffold from IR (no model). */
export function resolveStack(ir: AppIr): ResolvedStack {
  if (ir.stack === 'static_site') return 'static_site';
  if (ir.stack === 'node_api') return 'node_api';
  if (ir.stack === 'node_express_static') return 'node_express_static';
  // auto
  if (ir.kind === 'utility' && ir.needsDb === 'no' && ir.needsAuth === 'no') return 'static_site';
  if (ir.kind === 'bot' || (ir.kind === 'utility' && ir.needsDb !== 'no')) return 'node_api';
  if (ir.needsAuth === 'yes' || ir.needsDb === 'yes' || ir.kind === 'app') return 'node_express_static';
  if (ir.kind === 'website') return ir.needsDb === 'no' ? 'static_site' : 'node_express_static';
  return 'node_express_static';
}

export function parseAppIr(raw: unknown): AppIr {
  return AppIrSchema.parse(raw);
}

/** Map novice-wizard-like answers into IR. */
export function irFromPlainAnswers(input: {
  idea: string;
  name?: string;
  kind?: string;
  needsAuth?: string;
  needsDb?: string;
  language?: string;
  constraints?: string;
  stack?: string;
  features?: string[];
}): AppIr {
  const slug = (input.name || input.idea || 'app')
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'app';
  return parseAppIr({
    version: 1,
    name: slug,
    goal: input.idea.trim(),
    kind: input.kind || 'website',
    stack: input.stack || 'auto',
    needsAuth: input.needsAuth || 'unsure',
    needsDb: input.needsDb || 'unsure',
    language: input.language || 'en',
    constraints: input.constraints || '',
    features: input.features || [],
  });
}
