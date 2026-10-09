import { z } from 'zod';

/** Shared identifier contract: URL/DB-safe and stable across services. */
export const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/, 'ID may contain only letters, digits, _ and -');
export type BiForgeId = z.infer<typeof idSchema>;

export const actorSchema = z.enum(['human', 'agent', 'tool', 'system']);
export type Actor = z.infer<typeof actorSchema>;

export const projectStatusSchema = z.enum(['draft', 'active', 'paused', 'completed', 'archived']);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(200),
  status: projectStatusSchema.default('draft'),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
}).strict();
export type Project = z.infer<typeof projectSchema>;

/** State is deliberately an opaque JSON object at this stage; domain-specific
 * fields belong to the step that first consumes them. */
export const stateSchema = z.record(z.string(), z.unknown());
export type ProjectState = z.infer<typeof stateSchema>;

export const projectEventSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  type: z.string().trim().min(1).max(120),
  occurredAt: z.string().datetime().optional(),
  actor: actorSchema,
  payload: z.record(z.string(), z.unknown()).default({}),
  stateVersion: z.number().int().positive().optional(),
}).strict();
export type ProjectEvent = z.infer<typeof projectEventSchema>;

export const normalizedRequestSchema = z.object({
  requestId: idSchema,
  operation: z.string().trim().min(1).max(120),
  input: z.unknown(),
  projectId: idSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).strict();
export type NormalizedRequest = z.infer<typeof normalizedRequestSchema>;

export const normalizedResponseSchema = z.object({
  requestId: idSchema,
  status: z.enum(['ok', 'error']),
  output: z.unknown().optional(),
  error: z.object({ code: z.string().min(1).max(80), message: z.string().min(1).max(1000), retryable: z.boolean() }).strict().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).strict().superRefine((value, ctx) => {
  if (value.status === 'ok' && value.error !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Successful response must not contain error' });
  if (value.status === 'error' && value.error === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Error response must contain error' });
});
export type NormalizedResponse = z.infer<typeof normalizedResponseSchema>;

export type BiForgeErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'UNAVAILABLE' | 'INTERNAL';
export class BiForgeError extends Error {
  constructor(readonly code: BiForgeErrorCode, message: string, readonly retryable = false, options?: ErrorOptions) {
    super(message, options);
    this.name = 'BiForgeError';
  }
}
export class ValidationError extends BiForgeError {
  constructor(message: string) { super('VALIDATION', message); this.name = 'ValidationError'; }
}
export class NotFoundError extends BiForgeError {
  constructor(message = 'Resource not found') { super('NOT_FOUND', message); this.name = 'NotFoundError'; }
}
export class ConflictError extends BiForgeError {
  constructor(message = 'Resource conflict') { super('CONFLICT', message); this.name = 'ConflictError'; }
}
export class UnauthorizedError extends BiForgeError {
  constructor(message = 'Authentication required') { super('UNAUTHORIZED', message); this.name = 'UnauthorizedError'; }
}
export class ForbiddenError extends BiForgeError {
  constructor(message = 'Operation forbidden') { super('FORBIDDEN', message); this.name = 'ForbiddenError'; }
}
export class RateLimitedError extends BiForgeError {
  constructor(message = 'Rate limit exceeded') { super('RATE_LIMITED', message, true); this.name = 'RateLimitedError'; }
}
export class UnavailableError extends BiForgeError {
  constructor(message = 'Service unavailable', options?: ErrorOptions) { super('UNAVAILABLE', message, true, options); this.name = 'UnavailableError'; }
}
