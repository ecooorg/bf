import test from 'node:test';
import assert from 'node:assert/strict';
import {
  idSchema, projectSchema, stateSchema, projectEventSchema,
  normalizedRequestSchema, normalizedResponseSchema,
  BiForgeError, ValidationError, NotFoundError, ConflictError,
  UnauthorizedError, ForbiddenError, RateLimitedError, UnavailableError,
} from '../server/contracts.ts';

test('ID contract accepts stable safe IDs and rejects malformed IDs', () => {
  assert.equal(idSchema.parse('proj_123-A'), 'proj_123-A');
  for (const id of ['', 'contains space', '../escape', 'x'.repeat(129)]) assert.equal(idSchema.safeParse(id).success, false);
});

test('Project contract applies defaults and rejects unknown fields', () => {
  assert.equal(projectSchema.parse({ id: 'p1', name: ' Demo ' }).status, 'draft');
  assert.equal(projectSchema.safeParse({ id: 'p1', name: 'Demo', admin: true }).success, false);
  assert.equal(projectSchema.safeParse({ id: 'p1', name: '  ' }).success, false);
});

test('State accepts JSON-object shape; event validates actor and references', () => {
  assert.deepEqual(stateSchema.parse({ phase: 'draft', count: 2 }), { phase: 'draft', count: 2 });
  const event = { id: 'e1', projectId: 'p1', type: 'state.updated', actor: 'system', payload: {} };
  assert.equal(projectEventSchema.safeParse(event).success, true);
  assert.equal(projectEventSchema.safeParse({ ...event, actor: 'robot' }).success, false);
});

test('Normalized request/response contracts reject incompatible payloads', () => {
  assert.equal(normalizedRequestSchema.safeParse({ requestId: 'r1', operation: 'generate', input: {} }).success, true);
  assert.equal(normalizedRequestSchema.safeParse({ requestId: 'r1', operation: '', input: {} }).success, false);
  assert.equal(normalizedResponseSchema.safeParse({ requestId: 'r1', status: 'ok', output: 'done' }).success, true);
  assert.equal(normalizedResponseSchema.safeParse({ requestId: 'r1', status: 'error' }).success, false);
  assert.equal(normalizedResponseSchema.safeParse({ requestId: 'r1', status: 'ok', error: { code: 'X', message: 'bad', retryable: false } }).success, false);
});

test('Error classes expose stable machine-readable codes and retryability', () => {
  const errors = [new ValidationError('bad'), new NotFoundError(), new ConflictError(), new UnauthorizedError(), new ForbiddenError(), new RateLimitedError(), new UnavailableError()];
  assert.ok(errors.every((e) => e instanceof BiForgeError && typeof e.code === 'string'));
  assert.equal(errors[5].retryable, true);
  assert.equal(errors[6].retryable, true);
});
