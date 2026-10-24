/**
 * Default (conservative) capability profile.
 * Adapter may replace with registry-derived limits; core never hard-codes
 * "free"/"paid" — only Profile numbers.
 */

import { SCHEMA_VERSION, type Profile } from './core-types.ts';

/** Safe defaults when model limits are unknown. */
export function conservativeProfile(id = 'conservative'): Profile {
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    maxOutputTokens: 2048,
    requestsPerMinute: 5,
    tokensPerMinute: 32_000,
    maxParallel: 1,
    maxCallsPerJob: 25,
    contextTokens: 8192,
    supportsLongOutput: false,
    maxUnits: 16,
  };
}

/** Role → profile id mapping (adapter may override). */
export type RoleProfileMap = {
  planner: Profile;
  coder: Profile;
  reviewer: Profile;
};

export function defaultRoleProfiles(base?: Profile): RoleProfileMap {
  const p = base ?? conservativeProfile();
  return {
    planner: { ...p, id: `${p.id}:planner` },
    coder: { ...p, id: `${p.id}:coder` },
    reviewer: { ...p, id: `${p.id}:reviewer` },
  };
}
