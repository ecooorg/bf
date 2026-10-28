/**
 * Core data contracts for the staged App Builder engine.
 * schemaVersion is mandatory; readers must reject unknown versions.
 */

export const SCHEMA_VERSION = 1 as const;

export type SchemaVersion = typeof SCHEMA_VERSION;

export type UnitKind = 'file' | 'check' | 'assemble';
export type UnitStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';
export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
export type ReportStatus = 'complete' | 'partial' | 'failed';
export type ModelRole = 'planner' | 'coder' | 'reviewer';

/** Program-level specification produced in the spec stage. */
export interface Spec {
  schemaVersion: SchemaVersion;
  title: string;
  goal: string;
  language: string;
  stack: string;
  features: string[];
  nonGoals: string[];
  acceptance: string[];
}

/** One work unit (today: typically one file). */
export interface Unit {
  id: string;
  kind: UnitKind;
  path?: string;
  purpose: string;
  dependsOn: string[];
  exports: string[];
  /** Short interface description for neighbour context (no full source). */
  contract: string;
  maxOutputTokens: number;
  status: UnitStatus;
  attempts: number;
  cacheKey?: string;
  resultRef?: string;
}

/** Ordered unit graph. */
export interface Plan {
  schemaVersion: SchemaVersion;
  specHash: string;
  units: Unit[];
  /** Topological order of unit ids. */
  order: string[];
}

/** Capability profile derived from model registry (or conservative default). */
export interface Profile {
  schemaVersion: SchemaVersion;
  id: string;
  maxOutputTokens: number;
  requestsPerMinute: number;
  tokensPerMinute: number;
  maxParallel: number;
  maxCallsPerJob: number;
  contextTokens: number;
  supportsLongOutput: boolean;
  maxUnits: number;
}

/** Persisted job state (mirrors DB row shape; adapter owns storage). */
export interface JobState {
  schemaVersion: SchemaVersion;
  id: string;
  projectId: string;
  userId: string;
  status: JobStatus;
  stage: string;
  spec: Spec | null;
  plan: Plan | null;
  callsUsed: number;
  callsBudget: number;
  error: { code: string; message: string; detail?: unknown } | null;
  report: BuildReport | null;
  artifactId: string | null;
  createdAt: string;
  updatedAt: string;
  heartbeatAt: string;
}

export interface ReportFile {
  path: string;
  bytes: number;
  sha256: string;
  unitId: string;
}

export interface ReportUnit {
  id: string;
  status: UnitStatus;
  attempts: number;
  modelId?: string;
  cacheHit?: boolean;
}

export interface ReportValidator {
  name: string;
  ok: boolean;
  issues: Array<{ path?: string; line?: number; message: string }>;
}

/** A3 completion contract (Complex Software Architect Agent). Never claim SUCCESS without a non-empty verified artifact. */
export type ArchitectOutcome = 'SUCCESS' | 'PARTIAL' | 'FAILED';

/** build-report.json inside ZIP and in API responses. */
export interface BuildReport {
  schemaVersion: SchemaVersion;
  jobId: string;
  status: ReportStatus;
  /** A3-aligned outcome: SUCCESS only with non-empty files, required validators run and ok, archive produced. */
  outcome: ArchitectOutcome;
  /** true only when every file unit is done and all required validators ok. */
  goalImplemented: boolean;
  files: ReportFile[];
  units: ReportUnit[];
  validators: ReportValidator[];
  /** Validator names that were required for this stack. */
  checksDeclared: string[];
  /** Validator names that actually ran. */
  checksRun: string[];
  /** Required validators that did not run. */
  checksNotRun: string[];
  callsUsed: number;
  durationMs: number;
  failureReason?: string;
  failedStage?: string;
}

/** Input to runBuild (engine will use this later; defined here for contracts). */
export interface BuildInput {
  schemaVersion: SchemaVersion;
  jobId: string;
  projectId: string;
  userId: string;
  taskText: string;
  language?: string;
  stackHint?: string;
}

export class SchemaVersionError extends Error {
  readonly found: unknown;
  readonly expected: number;
  constructor(found: unknown, expected: number = SCHEMA_VERSION) {
    super(`Unsupported schemaVersion: ${String(found)} (expected ${expected})`);
    this.name = 'SchemaVersionError';
    this.found = found;
    this.expected = expected;
  }
}

export function assertSchemaVersion(obj: { schemaVersion?: unknown }, label = 'object'): asserts obj is { schemaVersion: SchemaVersion } {
  if (obj == null || typeof obj !== 'object') {
    throw new SchemaVersionError(undefined);
  }
  if (obj.schemaVersion !== SCHEMA_VERSION) {
    throw new SchemaVersionError(obj.schemaVersion);
  }
}
