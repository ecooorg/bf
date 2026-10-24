/**
 * Ports (interfaces) that the App Builder core depends on.
 * Adapters in server/ implement these; the core never imports server/ or src/.
 */

import type { ModelRole, JobState, BuildReport } from './core-types.ts';

export type ModelFinishReason = 'stop' | 'length' | 'content_filter' | 'error' | string;

export interface ModelUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ModelSuccess {
  text: string;
  finishReason: ModelFinishReason;
  usage?: ModelUsage;
  modelId: string;
}

export type ModelErrorCode =
  | 'rate_limited'
  | 'truncated'
  | 'unavailable'
  | 'bad_request';

export interface ModelError {
  code: ModelErrorCode;
  message: string;
  retryAfterMs?: number;
  modelId?: string;
  detail?: unknown;
}

export type ModelResult = ModelSuccess | ModelError;

export function isModelError(r: ModelResult): r is ModelError {
  return r != null && typeof r === 'object' && 'code' in r && !('text' in r);
}

export interface ModelCompleteArgs {
  role: ModelRole;
  system: string;
  prompt: string;
  maxOutputTokens: number;
  signal?: AbortSignal;
}

export interface ModelPort {
  complete(args: ModelCompleteArgs): Promise<ModelResult>;
}

export interface UnitResultRecord {
  jobId: string;
  unitId: string;
  cacheKey: string;
  content: string;
  contentHash: string;
  createdAt: string;
}

export interface StorePort {
  saveJob(state: JobState): Promise<void>;
  loadJob(jobId: string): Promise<JobState | null>;
  listResumable(olderThanMs: number): Promise<JobState[]>;
  putUnitResult(record: UnitResultRecord): Promise<void>;
  getUnitResult(cacheKey: string): Promise<UnitResultRecord | null>;
  putArtifact(jobId: string, bytes: Uint8Array, meta: { filename: string; contentType: string }): Promise<string>;
}

export type EventLevel = 'debug' | 'info' | 'warn' | 'error';

export interface EventPayload {
  jobId: string;
  unitId?: string;
  type: string;
  level: EventLevel;
  data?: Record<string, unknown>;
}

export interface EventPort {
  emit(event: EventPayload): void | Promise<void>;
}

export interface ClockPort {
  now(): number;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
}

/** Bundle passed into the engine. */
export interface Ports {
  model: ModelPort;
  store: StorePort;
  events: EventPort;
  clock: ClockPort;
}
