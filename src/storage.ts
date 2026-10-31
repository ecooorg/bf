/** Decision persistence — localStorage with integrity, revision, recovery (P122.1) */

import {
  emptyDecision,
  SCHEMA_VERSION,
} from './decision.ts';
import type { Decision, Step } from './decision.ts';

const KEY = 'bifurcation_decisions_v11';
const BACKUP_KEY = 'bifurcation_decisions_backup_v11';
const ACTIVE = 'bifurcation_active_id_v11';
const PRIVACY = 'bifurcation_privacy_v11';
const ARCHIVE = 'bifurcation_archive_v11';
const MIGRATION_REPORT = 'bifurcation_migration_report_v11';
const LAST_SAVE_META = 'bifurcation_last_save_meta_v11';

const VALID_STEPS: Step[] = [
  'TRIAGE',
  'BRIEF',
  'UNDERSTAND',
  'EXPAND',
  'ATTACK',
  'TEST',
  'DECIDE',
  'SYNTHESIS',
  'LEARN',
];

const VALID_STEPS_SET = new Set(VALID_STEPS);

export type SaveStatus = 'saved' | 'saving' | 'failed' | 'unsaved' | 'restoring';

export interface SaveMeta {
  at: number;
  count: number;
  status: SaveStatus;
  error?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  decision?: Decision;
}

/** Validate a single Decision for required fields, stage, references. */
export function validateDecision(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['not_an_object'] };
  }
  const d = raw as Record<string, unknown>;

  if (typeof d.id !== 'string' || !d.id.trim()) errors.push('missing_or_invalid_id');
  if (typeof d.title !== 'string') errors.push('missing_title');
  if (!Number.isFinite(d.createdAt as number)) errors.push('invalid_createdAt');
  if (!Number.isFinite(d.updatedAt as number)) errors.push('invalid_updatedAt');
  if (!Number.isFinite(d.schemaVersion as number)) errors.push('invalid_schemaVersion');
  if (typeof d.step !== 'string' || !VALID_STEPS_SET.has(d.step as Step)) {
    errors.push('invalid_step');
  }
  if (!d.brief || typeof d.brief !== 'object' || Array.isArray(d.brief)) {
    errors.push('missing_brief');
  } else {
    const brief = d.brief as Record<string, unknown>;
    if (typeof brief.decision !== 'string') errors.push('brief.decision_missing');
  }

  const arrayFields = ['options', 'redTeam', 'hypotheses', 'experiments', 'evidence', 'journal'] as const;
  for (const key of arrayFields) {
    if (d[key] !== undefined && !Array.isArray(d[key])) {
      errors.push(`${key}_not_array`);
    }
  }

  if (d.modelSuggestions !== undefined && (typeof d.modelSuggestions !== 'object' || Array.isArray(d.modelSuggestions))) {
    errors.push('modelSuggestions_not_object');
  }
  if (d.stepHistory !== undefined && (typeof d.stepHistory !== 'object' || Array.isArray(d.stepHistory))) {
    errors.push('stepHistory_not_object');
  }

  // Reference integrity: preferred/opposite option ids should exist if set
  if (typeof d.preferredOptionId === 'string' && d.preferredOptionId && Array.isArray(d.options)) {
    const opts = d.options as { id?: string }[];
    if (!opts.some((o) => o && o.id === d.preferredOptionId)) {
      errors.push('preferredOptionId_dangling');
    }
  }
  if (typeof d.oppositeOptionId === 'string' && d.oppositeOptionId && Array.isArray(d.options)) {
    const opts = d.options as { id?: string }[];
    if (!opts.some((o) => o && o.id === d.oppositeOptionId)) {
      errors.push('oppositeOptionId_dangling');
    }
  }

  // Evidence references on claims (best-effort)
  if (Array.isArray(d.evidence) && Array.isArray((d as any).radar?.facts)) {
    const evidenceIds = new Set((d.evidence as { id?: string }[]).map((e) => e?.id).filter(Boolean));
    for (const claim of (d as any).radar.facts as { evidenceIds?: string[] }[]) {
      if (Array.isArray(claim.evidenceIds)) {
        for (const eid of claim.evidenceIds) {
          if (eid && !evidenceIds.has(eid)) {
            errors.push(`missing_evidence_ref:${eid}`);
            break;
          }
        }
      }
    }
  }

  if (errors.length) return { ok: false, errors };

  // Normalize revision
  const decision = { ...(d as unknown as Decision) };
  if (!Number.isFinite(decision.revision as number) || (decision.revision as number) < 1) {
    decision.revision = 1;
  }
  if (!decision.schemaVersion) decision.schemaVersion = SCHEMA_VERSION;

  return { ok: true, errors: [], decision };
}

function mapOldStep(x: any): Step {
  if (VALID_STEPS.includes(x.step)) return x.step;
  if (VALID_STEPS.includes(x.stage)) return x.stage;
  if (x.phase === 'ANALYSIS' || x.phase === 'VERIFY') return 'TEST';
  if (x.phase === 'RADAR') return 'UNDERSTAND';
  if (x.phase === 'DECIDED') return 'DECIDE';
  return 'TRIAGE';
}

/** Read-only archive of pre-v11 data; no auto-conversion of scores/scenarios */
export function migrateFromLegacy(raw: any): {
  decision: Decision | null;
  report: string[];
} {
  const report: string[] = [];
  try {
    const e = emptyDecision();
    const d: Decision = {
      ...e,
      id: raw.id || e.id,
      title: raw.title || 'Archived decision',
      createdAt: raw.createdAt || Date.now(),
      updatedAt: Date.now(),
      schemaVersion: SCHEMA_VERSION,
      revision: 1,
      step: mapOldStep(raw),
      cycleCount: raw.cycleCount || 1,
      brief: {
        ...e.brief,
        decision: raw.brief?.decision || raw.rawInput || '',
        goal: raw.brief?.goal,
        facts: raw.brief?.facts || [],
        unknowns: raw.brief?.unknowns || [],
        assumptions: raw.brief?.assumptions || [],
        values: raw.brief?.values || [],
        constraints: raw.brief?.constraints || [],
        myOptions: (raw.brief?.myOptions || raw.brief?.alternatives || []).map(
          (o: any, i: number) => ({
            id: o.id || `opt_user_${i}`,
            title: o.title || o.tagline || `Option ${i + 1}`,
          })
        ),
        leaningOptionId: raw.brief?.leaningOptionId || 'NONE',
        errorCost: raw.brief?.errorCost || {},
        reversibility: raw.brief?.reversibility || {},
        reviewDates: raw.brief?.reviewDates || raw.reviewDates || [],
      },
      options: [],
      redTeam: [],
      hypotheses: [],
      experiments: [],
      evidence: [],
      journal: [],
      modelSuggestions: {},
      stepHistory: {},
    };

    if (raw.scenarios || raw.scores) {
      report.push(
        'Sliders and legacyRunway were not migrated; savings horizon can be entered as text in Constraints'
      );
    }
    if (raw.suggestedCalibration || raw.forecasts?.some((f: any) => f.estimateSource === 'MODEL')) {
      report.push('Model forecasts are not shown as user forecasts');
    }
    if (raw.executiveComment) {
      report.push('executiveComment kept only as archive note (not a verdict)');
      d.modelSuggestions.archivedExecutiveComment = raw.executiveComment;
    }
    if (raw.rawInput) {
      report.push('rawInput available for manual transfer into Brief');
      d.modelSuggestions.archivedRawInput = raw.rawInput;
    }

    return { decision: d, report };
  } catch (err) {
    report.push(`Migration error: ${String(err)}`);
    return { decision: null, report };
  }
}

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Load decisions with validation and recovery from backup if primary is corrupt. */
export function getStoredDecisions(): Decision[] {
  try {
    const rawPrimary = localStorage.getItem(KEY);
    const primary = safeParse(rawPrimary);
    let list: unknown[] = [];
    if (Array.isArray(primary)) {
      list = primary;
    } else if (rawPrimary) {
      // Primary present but corrupt or wrong shape — try backup
      const backup = safeParse(localStorage.getItem(BACKUP_KEY));
      if (Array.isArray(backup)) {
        list = backup;
        try {
          localStorage.setItem(KEY, JSON.stringify(backup));
        } catch { /* quota */ }
      }
    } else {
      // Empty primary: attempt legacy migration
      const oldKeys = [
        'bifurcation_decisions_v6',
        'bifurcation_decisions_v2',
        'bifurcation_decisions',
      ];
      for (const k of oldKeys) {
        const old = localStorage.getItem(k);
        if (old) {
          localStorage.setItem(ARCHIVE, old);
          const parsed = safeParse(old);
          const reports: string[] = [];
          if (Array.isArray(parsed)) {
            reports.push(`Archived ${parsed.length} records from ${k}`);
            for (const item of parsed.slice(0, 5)) {
              const { report } = migrateFromLegacy(item);
              reports.push(...report);
            }
          }
          localStorage.setItem(MIGRATION_REPORT, JSON.stringify(reports));
          localStorage.removeItem(k);
        }
      }
      return [];
    }

    const out: Decision[] = [];
    for (const item of list) {
      const v = validateDecision(item);
      if (v.ok && v.decision) out.push(v.decision);
      // Invalid items are dropped rather than crashing the session
    }
    return out;
  } catch {
    // Last resort: try backup alone
    try {
      const backup = safeParse(localStorage.getItem(BACKUP_KEY));
      if (Array.isArray(backup)) {
        return backup
          .map((item) => validateDecision(item))
          .filter((v): v is ValidationResult & { decision: Decision } => v.ok && !!v.decision)
          .map((v) => v.decision);
      }
    } catch { /* ignore */ }
    return [];
  }
}

function writeMeta(meta: SaveMeta) {
  try {
    localStorage.setItem(LAST_SAVE_META, JSON.stringify(meta));
  } catch { /* ignore */ }
}

export function getLastSaveMeta(): SaveMeta | null {
  try {
    const raw = localStorage.getItem(LAST_SAVE_META);
    if (!raw) return null;
    const m = JSON.parse(raw);
    if (m && typeof m.at === 'number' && typeof m.status === 'string') return m as SaveMeta;
  } catch { /* ignore */ }
  return null;
}

/**
 * Persist decisions. Performs:
 * - validation of each decision
 * - revision bump for items that changed (caller should already have updatedAt)
 * - backup of previous good state before overwrite
 * - atomic-ish write (write primary, on failure leave previous intact)
 */
export function saveDecisions(ds: Decision[]): { ok: boolean; status: SaveStatus; error?: string; saved: Decision[] } {
  writeMeta({ at: Date.now(), count: ds.length, status: 'saving' });

  const validated: Decision[] = [];
  for (const item of ds) {
    const v = validateDecision(item);
    if (v.ok && v.decision) {
      // Ensure revision is present
      if (!Number.isFinite(v.decision.revision as number)) v.decision.revision = 1;
      validated.push(v.decision);
    }
  }

  try {
    // Snapshot current primary as backup before overwrite
    const current = localStorage.getItem(KEY);
    if (current) {
      try {
        localStorage.setItem(BACKUP_KEY, current);
      } catch { /* quota — proceed without backup */ }
    }

    const payload = JSON.stringify(validated);
    localStorage.setItem(KEY, payload);

    // Verify read-back
    const check = localStorage.getItem(KEY);
    if (check !== payload) {
      writeMeta({ at: Date.now(), count: validated.length, status: 'failed', error: 'readback_mismatch' });
      return { ok: false, status: 'failed', error: 'readback_mismatch', saved: validated };
    }

    // Keep backup in sync after successful write so recovery always has a last-good copy
    try {
      localStorage.setItem(BACKUP_KEY, payload);
    } catch { /* quota */ }

    writeMeta({ at: Date.now(), count: validated.length, status: 'saved' });
    return { ok: true, status: 'saved', saved: validated };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    writeMeta({ at: Date.now(), count: validated.length, status: 'failed', error: message });
    return { ok: false, status: 'failed', error: message, saved: validated };
  }
}

/** Detect whether an incoming decision list would overwrite a newer revision. */
export function detectRevisionConflicts(
  current: Decision[],
  incoming: Decision[]
): { id: string; currentRev: number; incomingRev: number }[] {
  const map = new Map(current.map((d) => [d.id, d.revision ?? 1]));
  const conflicts: { id: string; currentRev: number; incomingRev: number }[] = [];
  for (const d of incoming) {
    const cur = map.get(d.id);
    if (cur !== undefined) {
      const inc = d.revision ?? 1;
      if (inc < cur) {
        conflicts.push({ id: d.id, currentRev: cur, incomingRev: inc });
      }
    }
  }
  return conflicts;
}

/** Merge incoming decisions preferring higher revision; never drop newer local work silently. */
export function mergeByRevision(
  local: Decision[],
  incoming: Decision[]
): { merged: Decision[]; conflicts: { id: string; currentRev: number; incomingRev: number }[] } {
  const byId = new Map<string, Decision>();
  for (const d of local) byId.set(d.id, d);
  const conflicts: { id: string; currentRev: number; incomingRev: number }[] = [];

  for (const inc of incoming) {
    const existing = byId.get(inc.id);
    if (!existing) {
      byId.set(inc.id, inc);
      continue;
    }
    const er = existing.revision ?? 1;
    const ir = inc.revision ?? 1;
    if (ir > er) {
      byId.set(inc.id, inc);
    } else if (ir < er) {
      conflicts.push({ id: inc.id, currentRev: er, incomingRev: ir });
      // keep local (newer)
    } else {
      // same revision — prefer newer updatedAt
      if ((inc.updatedAt || 0) > (existing.updatedAt || 0)) {
        byId.set(inc.id, inc);
      }
    }
  }

  return { merged: Array.from(byId.values()), conflicts };
}

/** Bump revision on a decision that is being updated. */
export function bumpRevision(d: Decision): Decision {
  return {
    ...d,
    revision: (d.revision ?? 1) + 1,
    updatedAt: Date.now(),
  };
}

export const getActiveDecisionId = () => localStorage.getItem(ACTIVE) || '';
export const setActiveDecisionId = (id: string) =>
  localStorage.setItem(ACTIVE, id);
export const getPrivacyAccepted = () =>
  localStorage.getItem(PRIVACY) === 'true';
export const setPrivacyAccepted = (v: boolean) =>
  localStorage.setItem(PRIVACY, String(v));
export const getArchived = () => localStorage.getItem(ARCHIVE);
export const getMigrationReport = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(MIGRATION_REPORT) || '[]');
  } catch {
    return [];
  }
};
