/**
 * Nominal (branded) identifiers for high-risk domain values.
 * Prevents accidental mixing of projectId / taskId / codeTaskId at compile time
 * when strict typing is enabled. Runtime shape remains a plain string (DB/JSON compatible).
 */
import { z } from 'zod';
import { idSchema } from './contracts.ts';

declare const projectIdBrand: unique symbol;
declare const taskIdBrand: unique symbol;
declare const codeTaskIdBrand: unique symbol;
declare const runIdBrand: unique symbol;

export type ProjectId = string & { readonly [projectIdBrand]: 'ProjectId' };
export type TaskId = string & { readonly [taskIdBrand]: 'TaskId' };
export type CodeTaskId = string & { readonly [codeTaskIdBrand]: 'CodeTaskId' };
export type RunId = string & { readonly [runIdBrand]: 'RunId' };

export const projectIdSchema = idSchema.transform((s) => s as ProjectId);
export const taskIdSchema = idSchema.transform((s) => s as TaskId);
export const codeTaskIdSchema = idSchema.transform((s) => s as CodeTaskId);
export const runIdSchema = idSchema.transform((s) => s as RunId);

/** Parse or throw ZodError — use at HTTP/trust boundaries. */
export function parseProjectId(raw: unknown): ProjectId {
  return projectIdSchema.parse(raw);
}
export function parseTaskId(raw: unknown): TaskId {
  return taskIdSchema.parse(raw);
}
export function parseCodeTaskId(raw: unknown): CodeTaskId {
  return codeTaskIdSchema.parse(raw);
}
export function parseRunId(raw: unknown): RunId {
  return runIdSchema.parse(raw);
}

/** Soft cast for values already validated upstream (internal only). */
export function asProjectId(id: string): ProjectId {
  return id as ProjectId;
}
export function asTaskId(id: string): TaskId {
  return id as TaskId;
}
export function asCodeTaskId(id: string): CodeTaskId {
  return id as CodeTaskId;
}
export function asRunId(id: string): RunId {
  return id as RunId;
}

/** Opaque DB row — prefer over `any` when mapping SQL results. */
export type DbRow = Record<string, unknown>;
