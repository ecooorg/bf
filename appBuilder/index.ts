/**
 * Public entry of the App Builder core (P93.1: contracts only; no engine yet).
 * Server adapter and tests import from here.
 */

export {
  SCHEMA_VERSION,
  SchemaVersionError,
  assertSchemaVersion,
  type SchemaVersion,
  type UnitKind,
  type UnitStatus,
  type JobStatus,
  type ReportStatus,
  type ModelRole,
  type Spec,
  type Unit,
  type Plan,
  type Profile,
  type JobState,
  type ReportFile,
  type ReportUnit,
  type ReportValidator,
  type BuildReport,
  type BuildInput,
} from './core-types.ts';

export {
  isModelError,
  type ModelFinishReason,
  type ModelUsage,
  type ModelSuccess,
  type ModelErrorCode,
  type ModelError,
  type ModelResult,
  type ModelCompleteArgs,
  type ModelPort,
  type UnitResultRecord,
  type StorePort,
  type EventLevel,
  type EventPayload,
  type EventPort,
  type ClockPort,
  type Ports,
} from './core-ports.ts';

export {
  isSafePath,
  topoSort,
  validatePlan,
  nextRunnable,
  rejectUnknownSchemaVersion,
  type PlanValidationIssue,
  type PlanValidationResult,
} from './core-plan.ts';

export {
  parseFileMarkers,
  formatFileMarker,
  type ParsedFile,
  type MarkerParseResult,
} from './core-markers.ts';

export {
  conservativeProfile,
  defaultRoleProfiles,
  type RoleProfileMap,
} from './profile-default.ts';

export { runBuild, type BuildResult, type EngineOptions } from './core-engine.ts';
export { makeCacheKey, sha256, PROMPT_VERSION } from './core-cache.ts';
export { packZip, type PackFile } from './pack-zip.ts';
export { promptFor, PROMPT_VERSIONS } from './core-prompts.ts';
