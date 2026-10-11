// Gate Engine (TZ 12, P17 / BX-20). Pure rules: no database, no network, no model.
// PASS exists only as a function of registered evidence bound to the current commit SHA (12.1, 12.5).
export const GATE_RULES_VERSION = 'gates-v1';
export const GATE_STATUSES = ['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN', 'REAL_ONLY', 'WAIVED'] as const;
export type GateStatus = (typeof GATE_STATUSES)[number];
export const GATES = ['requirements', 'spec', 'build', 'test', 'test_integrity', 'security', 'review', 'release_candidate'] as const;
export type GateName = (typeof GATES)[number];
/** Gates a Release Candidate depends on (everything except itself). */
export const RC_REQUIRED_GATES: GateName[] = GATES.filter((g) => g !== 'release_candidate');
/** Evidence sources. A model's statement is never a source (12.1). */
export const EVIDENCE_SOURCES = ['ci', 'diff', 'approval', 'system'] as const;
export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];
/** Which sources may produce evidence for which gate (12.4). */
export const GATE_SOURCES: Record<GateName, EvidenceSource[]> = {
  requirements: ['approval'], spec: ['approval'], build: ['ci'], test: ['ci'], test_integrity: ['diff'],
  security: ['ci'], review: ['approval'], release_candidate: ['system'],
};
export const PROTECTED_TEST_PREFIX = 'tests/acceptance/';

export interface EvidenceRecord {
  gate: GateName; checkName: string; status: GateStatus; commitSha: string; source: EvidenceSource; rulesVersion: string;
  tool: string; toolVersion?: string | null; exitCode?: number | null; invalidated?: boolean; createdAt?: string | Date;
}
export interface WaiverRecord { gate: GateName; commitSha: string; reason: string; actor: string }
export interface GateResult { gate: GateName; status: GateStatus; reasons: string[] }

export const isGateName = (v: unknown): v is GateName => typeof v === 'string' && (GATES as readonly string[]).includes(v);
export const isCommitSha = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{40}$/i.test(v);

/** Deterministic mapping of a completed GitHub check run to a status. Logs are never interpreted (12.5). */
export function statusFromCheckRun(status: string | null | undefined, conclusion: string | null | undefined): GateStatus {
  if (status !== 'completed') return 'NOT_RUN';
  switch (conclusion) {
    case 'success': return 'PASS';
    case 'failure': return 'FAIL';
    case 'timed_out': case 'cancelled': case 'action_required': case 'startup_failure': case 'stale': return 'BLOCKED';
    default: return 'NOT_RUN'; // neutral, skipped, null: not proof of anything
  }
}

export type CheckMap = Array<{ gate: 'build' | 'test' | 'security'; pattern: RegExp }>;
/** Default name -> gate map. Order matters: the first match wins. Unmatched checks produce no evidence. */
export const DEFAULT_CHECK_MAP: CheckMap = [
  { gate: 'security', pattern: /secret|security|audit|codeql|dependabot/i },
  { gate: 'test', pattern: /\btests?\b|acceptance|unit|integration|\bcheck\b/i },
  { gate: 'build', pattern: /\bbuild\b|compile|lint|typecheck/i },
];
export function gateForCheckName(name: string, map: CheckMap = DEFAULT_CHECK_MAP): 'build' | 'test' | 'security' | null {
  for (const rule of map) if (rule.pattern.test(name)) return rule.gate;
  return null;
}

/** Normalised path of a changed file, or null when it is unsafe. */
export function normalizeRepoPath(p: string): string | null {
  if (typeof p !== 'string' || !p || p.includes('\0') || p.includes('\\') || p.startsWith('/')) return null;
  const parts = p.split('/');
  if (parts.some((s) => s === '' || s === '.' || s === '..')) return null;
  return parts.join('/');
}
export const isProtectedTestPath = (p: string): boolean => {
  const n = normalizeRepoPath(p);
  return n === null ? true : n.toLowerCase().startsWith(PROTECTED_TEST_PREFIX); // an unsafe path is treated as protected
};
export interface ChangedFile { filename: string; status?: string; previous_filename?: string }

/** Test Integrity (12.4): any add, change, rename or removal under tests/acceptance/** is FAIL unless a human waived it. */
export function evaluateTestIntegrity(files: ChangedFile[], opts: { truncated?: boolean } = {}): { status: GateStatus; reasons: string[]; touched: string[] } {
  if (opts.truncated) return { status: 'BLOCKED', reasons: ['diff_truncated'], touched: [] };
  const touched = new Set<string>();
  for (const f of files) {
    for (const name of [f.filename, f.previous_filename]) if (name && isProtectedTestPath(name)) touched.add(name);
  }
  return touched.size
    ? { status: 'FAIL', reasons: ['protected_tests_changed'], touched: [...touched].sort().slice(0, 50) }
    : { status: 'PASS', reasons: [], touched: [] };
}

/** An evidence record may be stored only when it satisfies the rules; PASS needs a real source, SHA, tool and rules version. */
export function validateEvidence(e: EvidenceRecord): string | null {
  if (!isGateName(e.gate)) return 'unknown_gate';
  if (!(GATE_STATUSES as readonly string[]).includes(e.status)) return 'unknown_status';
  if (e.status === 'WAIVED') return 'waived_requires_waiver_record';
  if (!(EVIDENCE_SOURCES as readonly string[]).includes(e.source)) return 'untrusted_source';
  if (!GATE_SOURCES[e.gate].includes(e.source)) return 'source_not_allowed_for_gate';
  if (!isCommitSha(e.commitSha)) return 'invalid_commit_sha';
  if (e.rulesVersion !== GATE_RULES_VERSION) return 'unknown_rules_version';
  if (!e.tool || !e.checkName) return 'missing_tool_or_check';
  return null;
}

const SEVERITY: GateStatus[] = ['FAIL', 'BLOCKED', 'NOT_RUN', 'REAL_ONLY']; // anything here prevents PASS, in this order

/** Status of one gate for one commit. Evidence for any other commit or invalidated evidence is ignored. */
export function evaluateGate(gate: GateName, evidence: EvidenceRecord[], commitSha: string, waivers: WaiverRecord[] = []): GateResult {
  const waiver = waivers.find((w) => w.gate === gate && w.commitSha === commitSha && w.reason.trim() && w.actor.trim());
  if (waiver) return { gate, status: 'WAIVED', reasons: [`waived_by:${waiver.actor}`] };
  // latest evidence per check name wins
  const latest = new Map<string, EvidenceRecord>();
  for (const e of evidence) {
    if (e.gate !== gate || e.commitSha !== commitSha || e.invalidated || validateEvidence(e)) continue;
    const prev = latest.get(e.checkName);
    if (!prev || new Date(e.createdAt ?? 0).getTime() >= new Date(prev.createdAt ?? 0).getTime()) latest.set(e.checkName, e);
  }
  if (!latest.size) return { gate, status: 'NOT_RUN', reasons: ['no_evidence'] };
  const statuses = [...latest.values()].map((e) => e.status);
  for (const s of SEVERITY) if (statuses.includes(s)) return { gate, status: s, reasons: [...latest.values()].filter((e) => e.status === s).map((e) => `${e.checkName}:${s}`).slice(0, 20) };
  return { gate, status: 'PASS', reasons: [] };
}

export function evaluateAll(evidence: EvidenceRecord[], commitSha: string, waivers: WaiverRecord[] = []): Record<GateName, GateResult> {
  const out = {} as Record<GateName, GateResult>;
  for (const g of RC_REQUIRED_GATES) out[g] = evaluateGate(g, evidence, commitSha, waivers);
  const blockers = RC_REQUIRED_GATES.filter((g) => out[g].status !== 'PASS' && out[g].status !== 'WAIVED');
  const rc = evaluateGate('release_candidate', evidence, commitSha, waivers);
  // The Release Candidate is derived by the engine: PASS only when every other gate is PASS or WAIVED at this commit.
  out.release_candidate = rc.status === 'WAIVED' ? rc
    : blockers.length ? { gate: 'release_candidate', status: out[blockers[0]].status === 'FAIL' ? 'FAIL' : out[blockers[0]].status === 'BLOCKED' ? 'BLOCKED' : 'NOT_RUN', reasons: blockers.map((g) => `${g}:${out[g].status}`) }
    : { gate: 'release_candidate', status: 'PASS', reasons: [] };
  return out;
}

/** 12.5: moving to the next stage is forbidden while a required gate is FAIL, BLOCKED or NOT_RUN (REAL_ONLY also blocks). */
export function canAdvance(results: Partial<Record<GateName, GateResult>>, required: GateName[]): { allowed: boolean; blockers: string[] } {
  const blockers = required.filter((g) => { const s = results[g]?.status; return s !== 'PASS' && s !== 'WAIVED'; }).map((g) => `${g}:${results[g]?.status ?? 'NOT_RUN'}`);
  return { allowed: blockers.length === 0, blockers };
}

/** Release Candidate manifest (12.4): complete only when every field is present. */
export function releaseManifest(results: Record<GateName, GateResult>, evidence: EvidenceRecord[], commitSha: string, waivers: WaiverRecord[], risks: string[] = []) {
  const used = evidence.filter((e) => e.commitSha === commitSha && !e.invalidated && !validateEvidence(e));
  return {
    commit: commitSha, rules_version: GATE_RULES_VERSION,
    gates: Object.fromEntries(Object.entries(results).map(([g, r]) => [g, r.status])),
    tools: [...new Set(used.map((e) => `${e.tool}${e.toolVersion ? `@${e.toolVersion}` : ''}`))].sort(),
    decisions: waivers.filter((w) => w.commitSha === commitSha).map((w) => ({ gate: w.gate, actor: w.actor, reason: w.reason })),
    risks, complete: results.release_candidate.status === 'PASS' || results.release_candidate.status === 'WAIVED',
  };
}
