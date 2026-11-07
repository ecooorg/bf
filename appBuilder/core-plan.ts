/**
 * Plan construction helpers and validation (cycles, deps, path safety, schema).
 */

import {
  SCHEMA_VERSION,
  SchemaVersionError,
  type Plan,
  type Profile,
  type Unit,
} from './core-types.ts';

export interface PlanValidationIssue {
  code:
    | 'schema_version'
    | 'cycle'
    | 'missing_dep'
    | 'unknown_unit_in_order'
    | 'duplicate_path'
    | 'unsafe_path'
    | 'too_many_units'
    | 'empty_units'
    | 'order_mismatch';
  message: string;
  unitId?: string;
  path?: string;
}

export interface PlanValidationResult {
  ok: boolean;
  issues: PlanValidationIssue[];
  /** Topological order when ok (may differ from plan.order if recomputed). */
  order?: string[];
}

const UNSAFE_PATH_RE = new RegExp('(?:^|/)\.\.(?:/|$)|^/|[\\]|[\x00-\x1f\x7f]');

export function isSafePath(p: string): boolean {
  if (typeof p !== 'string' || p.length === 0 || p.length > 256) return false;
  if (UNSAFE_PATH_RE.test(p)) return false;
  if (p.includes('//')) return false;
  // Validators may resolve at most one nested level (HTML-relative / legacy packages).
  const segments = p.split('/');
  if (segments.length > 2 || segments.some((part) => !part || part === '.' || part === '..')) return false;
  return true;
}

/**
 * P127.27: models sometimes emit module ids ("audio_js") as paths. Restore the extension
 * ("audio.js") when the final segment has no dot and ends with a known extension suffix.
 */
export function repairPackagePath(p: string): string {
  if (typeof p !== 'string') return p;
  const parts = p.replace(/\\/g, '/').split('/');
  const last = parts.pop() ?? '';
  if (!last || last.includes('.')) return p;
  const m = /^(.+)_(js|mjs|css|html|json|md|txt)$/i.exec(last);
  if (!m) return p;
  return [...parts, `${m[1]}.${m[2].toLowerCase()}`].join('/');
}

/**
 * P127.31: `dependsOn` and `order` only say which unit is written before which. Models name them inconsistently
 * (unit ids such as `board`, references such as `board.js`), and sometimes make two units depend on each other.
 * Rejecting such a plan replaced a usable plan with the generic template. Instead: resolve each reference by unit id,
 * file path or file stem; drop hints that name no unit and self-references; break a dependency cycle at the
 * least-connected unit; rebuild `order`. Units, paths and contracts are never added, removed or renamed, so plans that
 * are unusable for other reasons (no units, unsafe/duplicate paths, too many units) still fail `validatePlan`.
 * Pure: the input plan is not modified.
 */
export function repairPlanReferences(plan: Plan): Plan {
  if (!plan || !Array.isArray(plan.units) || plan.units.length === 0) return plan;
  const named = plan.units.filter((u): u is Unit => Boolean(u) && typeof u.id === 'string' && u.id.length > 0);
  const refToId = new Map<string, string>();
  const claim = (key: unknown, id: string) => { if (typeof key === 'string' && key && !refToId.has(key)) refToId.set(key, id); };
  for (const u of named) claim(u.id, u.id);
  for (const u of named) claim(u.path, u.id);
  for (const u of named) claim(typeof u.path === 'string' ? u.path.replace(/\.[^./]+$/, '') : '', u.id);
  const resolve = (ref: unknown): string | undefined =>
    typeof ref === 'string' ? refToId.get(ref) ?? refToId.get(repairPackagePath(ref)) : undefined;

  const units = plan.units.map((u): Unit => {
    if (!u || typeof u.id !== 'string' || !u.id) return u;
    const deps: string[] = [];
    for (const ref of Array.isArray(u.dependsOn) ? u.dependsOn : []) {
      const id = resolve(ref);
      if (id && id !== u.id && !deps.includes(id)) deps.push(id);
    }
    return { ...u, dependsOn: deps };
  });

  // Break cycles: cut one edge at a time, at the unit with the fewest dependencies (ties: the later one in the plan).
  const depsOf = new Map(units.filter((u) => u && typeof u.id === 'string' && u.id).map((u) => [u.id, u]));
  const reaches = (from: string, to: string): boolean => {
    const seen = new Set<string>();
    const stack = [...(depsOf.get(from)?.dependsOn ?? [])];
    while (stack.length) {
      const id = stack.pop()!;
      if (id === to) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push(...(depsOf.get(id)?.dependsOn ?? []));
    }
    return false;
  };
  for (let guard = units.length * units.length; guard > 0 && topoSort([...depsOf.values()]) === null; guard--) {
    const onCycle = [...depsOf.values()].filter((u) => reaches(u.id, u.id));
    if (!onCycle.length) break;
    let pick = onCycle[0];
    for (const u of onCycle) if (u.dependsOn.length <= pick.dependsOn.length) pick = u;
    const cut = pick.dependsOn.find((d) => reaches(d, pick.id) || d === pick.id);
    if (!cut) break;
    pick.dependsOn = pick.dependsOn.filter((d) => d !== cut);
  }

  const order: string[] = [];
  for (const ref of Array.isArray(plan.order) ? plan.order : []) {
    const id = resolve(ref);
    if (id && !order.includes(id)) order.push(id);
  }
  for (const id of depsOf.keys()) if (!order.includes(id)) order.push(id);
  return { ...plan, units, order };
}

/** New static_site plan units must be top-level files only (no subfolders). */
export function isFlatPackagePath(p: string): boolean {
  return typeof p === 'string' && isSafePath(p) && !p.includes('/');
}

/**
 * Kahn topological sort. Returns null if a cycle exists.
 */
export function topoSort(units: Unit[]): string[] | null {
  const byId = new Map(units.map((u) => [u.id, u]));
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const u of units) {
    indeg.set(u.id, 0);
    adj.set(u.id, []);
  }
  for (const u of units) {
    for (const d of u.dependsOn || []) {
      if (!byId.has(d)) continue;
      adj.get(d)!.push(u.id);
      indeg.set(u.id, (indeg.get(u.id) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of indeg) {
    if (deg === 0) queue.push(id);
  }
  queue.sort();
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) || []) {
      const n = (indeg.get(next) || 0) - 1;
      indeg.set(next, n);
      if (n === 0) {
        queue.push(next);
        queue.sort();
      }
    }
  }
  if (order.length !== units.length) return null;
  return order;
}

/**
 * Validate a Plan against contracts. Does not call the model.
 */
export function validatePlan(plan: unknown, profile?: Pick<Profile, 'maxUnits'>): PlanValidationResult {
  const issues: PlanValidationIssue[] = [];

  if (plan == null || typeof plan !== 'object') {
    return { ok: false, issues: [{ code: 'schema_version', message: 'Plan is not an object' }] };
  }
  const p = plan as Plan;

  if (p.schemaVersion !== SCHEMA_VERSION) {
    issues.push({
      code: 'schema_version',
      message: `Unsupported schemaVersion: ${String(p.schemaVersion)} (expected ${SCHEMA_VERSION})`,
    });
    return { ok: false, issues };
  }

  if (!Array.isArray(p.units) || p.units.length === 0) {
    issues.push({ code: 'empty_units', message: 'Plan has no units' });
    return { ok: false, issues };
  }

  const maxUnits = profile?.maxUnits ?? 32;
  if (p.units.length > maxUnits) {
    issues.push({
      code: 'too_many_units',
      message: `Plan has ${p.units.length} units; max is ${maxUnits}`,
    });
  }

  const byId = new Map<string, Unit>();
  const paths = new Map<string, string>();

  for (const u of p.units) {
    if (!u || typeof u.id !== 'string' || !u.id) {
      issues.push({ code: 'missing_dep', message: 'Unit missing id' });
      continue;
    }
    if (byId.has(u.id)) {
      issues.push({ code: 'duplicate_path', message: `Duplicate unit id ${u.id}`, unitId: u.id });
    }
    byId.set(u.id, u);

    if (u.kind === 'file') {
      if (typeof u.path !== 'string' || !u.path) {
        issues.push({ code: 'unsafe_path', message: `File unit ${u.id} has no path`, unitId: u.id });
      } else if (!isFlatPackagePath(u.path)) {
        issues.push({
          code: 'unsafe_path',
          message: `Unsafe path: ${u.path}`,
          unitId: u.id,
          path: u.path,
        });
      } else if (paths.has(u.path)) {
        issues.push({
          code: 'duplicate_path',
          message: `Duplicate path ${u.path} (units ${paths.get(u.path)} and ${u.id})`,
          unitId: u.id,
          path: u.path,
        });
      } else {
        paths.set(u.path, u.id);
      }
    }
  }

  for (const u of p.units) {
    for (const d of u.dependsOn || []) {
      if (!byId.has(d)) {
        issues.push({
          code: 'missing_dep',
          message: `Unit ${u.id} depends on missing ${d}`,
          unitId: u.id,
        });
      }
    }
  }

  const sorted = topoSort(p.units);
  if (sorted == null) {
    issues.push({ code: 'cycle', message: 'Plan unit graph contains a cycle' });
  } else if (Array.isArray(p.order)) {
    for (const id of p.order) {
      if (!byId.has(id)) {
        issues.push({
          code: 'unknown_unit_in_order',
          message: `order references unknown unit ${id}`,
          unitId: id,
        });
      }
    }
    if (p.order.length !== p.units.length) {
      issues.push({
        code: 'order_mismatch',
        message: `order length ${p.order.length} != units length ${p.units.length}`,
      });
    }
  }

  const ok = issues.length === 0;
  return { ok, issues, order: ok && sorted ? sorted : undefined };
}

/**
 * Units that have all dependencies done (or no deps) and are still pending.
 */
export function nextRunnable(plan: Plan): Unit[] {
  const byId = new Map(plan.units.map((u) => [u.id, u]));
  const ready: Unit[] = [];
  for (const id of plan.order.length ? plan.order : plan.units.map((u) => u.id)) {
    const u = byId.get(id);
    if (!u || u.status !== 'pending') continue;
    const depsOk = (u.dependsOn || []).every((d) => {
      const dep = byId.get(d);
      return dep && (dep.status === 'done' || dep.status === 'skipped');
    });
    if (depsOk) ready.push(u);
  }
  return ready;
}

export function rejectUnknownSchemaVersion(obj: { schemaVersion?: unknown }): void {
  if (obj?.schemaVersion !== SCHEMA_VERSION) {
    throw new SchemaVersionError(obj?.schemaVersion);
  }
}
