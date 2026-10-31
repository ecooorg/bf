/**
 * P122.2 — Analytical reliability & evidence integrity helpers.
 * Pure functions: no I/O. Enforce fact/assumption separation, hypothesis lifecycle,
 * contradiction detection, EVPI audit trail, and dependency invalidation.
 */
import type {
  CalculationRecord,
  Claim,
  Contradiction,
  Decision,
  EpistemicKind,
  Evidence,
  Hypothesis,
  HypothesisStatus,
  Unknown,
} from './decision.ts';
import { uid } from './decision.ts';
import { evpi, evpiRange, evpiVerdict, validateEvpiInput } from './evpi.ts';

/** Kinds that must never be silently treated as verified facts. */
const NON_FACT_KINDS: ReadonlySet<EpistemicKind> = new Set([
  'ASSUMPTION',
  'INTERPRETATION',
  'VALUE',
  'UNKNOWN',
  'EXTERNAL_VERIFY',
]);

export type ClaimLabel =
  | 'VERIFIED_FACT'
  | 'USER_PROVIDED_FACT'
  | 'ASSUMPTION'
  | 'INTERPRETATION'
  | 'OPINION'
  | 'HYPOTHESIS'
  | 'UNKNOWN'
  | 'DISPUTED';

/** Classify a claim for display / reasoning; never promote assumption → verified fact. */
export function labelClaim(claim: Pick<Claim, 'kind' | 'status' | 'sourceType'>): ClaimLabel {
  if (claim.kind === 'UNKNOWN') return 'UNKNOWN';
  if (claim.kind === 'ASSUMPTION') return 'ASSUMPTION';
  if (claim.kind === 'INTERPRETATION') return 'INTERPRETATION';
  if (claim.kind === 'VALUE') return 'OPINION';
  if (claim.kind === 'EXTERNAL_VERIFY') return 'UNKNOWN';
  // FACT
  if (claim.status === 'EXTERNALLY_VERIFIED') return 'VERIFIED_FACT';
  if (claim.sourceType === 'USER') return 'USER_PROVIDED_FACT';
  if (claim.status === 'USER_CONFIRMED') return 'USER_PROVIDED_FACT';
  if (claim.status === 'REJECTED') return 'DISPUTED';
  return 'USER_PROVIDED_FACT';
}

/** True if this claim may be treated as independently verified. */
export function isVerifiedFact(claim: Pick<Claim, 'kind' | 'status'>): boolean {
  return claim.kind === 'FACT' && claim.status === 'EXTERNALLY_VERIFIED';
}

/**
 * Refuse silent promotion: an assumption (or non-fact kind) must not become FACT
 * without an explicit, recorded status change to EXTERNALLY_VERIFIED plus evidence.
 */
export function canPromoteToVerifiedFact(
  claim: Pick<Claim, 'kind' | 'status'>,
  evidenceIds: string[],
  evidence: Evidence[]
): { ok: boolean; reason: string } {
  if (NON_FACT_KINDS.has(claim.kind as EpistemicKind) && claim.kind !== 'EXTERNAL_VERIFY') {
    return { ok: false, reason: 'non_fact_kind_cannot_become_verified_without_reclassification' };
  }
  if (!evidenceIds.length) {
    return { ok: false, reason: 'no_evidence' };
  }
  const found = evidence.filter((e) => evidenceIds.includes(e.id) && e.verified);
  if (!found.length) {
    return { ok: false, reason: 'no_verified_evidence' };
  }
  return { ok: true, reason: 'has_verified_evidence' };
}

/** Valid hypothesis status transitions (controlled lifecycle). */
const HYPOTHESIS_TRANSITIONS: Record<HypothesisStatus, HypothesisStatus[]> = {
  PROPOSED: ['UNDER_INVESTIGATION', 'REJECTED', 'UNRESOLVED'],
  UNDER_INVESTIGATION: ['SUPPORTED', 'WEAKENED', 'CONTRADICTED', 'REJECTED', 'UNRESOLVED'],
  SUPPORTED: ['WEAKENED', 'CONTRADICTED', 'REJECTED', 'UNRESOLVED'],
  WEAKENED: ['SUPPORTED', 'CONTRADICTED', 'REJECTED', 'UNDER_INVESTIGATION', 'UNRESOLVED'],
  CONTRADICTED: ['REJECTED', 'UNDER_INVESTIGATION', 'UNRESOLVED'],
  REJECTED: [], // terminal for active reasoning
  UNRESOLVED: ['PROPOSED', 'UNDER_INVESTIGATION', 'REJECTED'],
};

export function normalizeHypothesisStatus(h: Hypothesis): HypothesisStatus {
  return h.status || 'PROPOSED';
}

export function canTransitionHypothesis(
  from: HypothesisStatus,
  to: HypothesisStatus
): boolean {
  if (from === to) return true;
  return (HYPOTHESIS_TRANSITIONS[from] || []).includes(to);
}

/**
 * Apply a status change. Rejected hypotheses must not silently reappear as facts.
 * Returns updated hypothesis or error.
 */
export function transitionHypothesis(
  h: Hypothesis,
  to: HypothesisStatus,
  reason: string,
  at = Date.now()
): { ok: true; hypothesis: Hypothesis } | { ok: false; error: string } {
  const from = normalizeHypothesisStatus(h);
  if (!canTransitionHypothesis(from, to)) {
    return { ok: false, error: `invalid_transition:${from}->${to}` };
  }
  if (!reason || !reason.trim()) {
    return { ok: false, error: 'status_reason_required' };
  }
  return {
    ok: true,
    hypothesis: {
      ...h,
      status: to,
      statusReason: reason.trim(),
      statusChangedAt: at,
    },
  };
}

/** Rejected hypotheses must not be treated as established facts downstream. */
export function isActiveHypothesis(h: Hypothesis): boolean {
  const s = normalizeHypothesisStatus(h);
  return s !== 'REJECTED';
}

/** Validate evidence reference integrity on a claim. */
export function validateEvidenceRefs(
  claim: Pick<Claim, 'id' | 'evidenceIds'>,
  evidence: Evidence[]
): { ok: boolean; missing: string[] } {
  const ids = new Set(evidence.map((e) => e.id));
  const missing = (claim.evidenceIds || []).filter((id) => id && !ids.has(id));
  return { ok: missing.length === 0, missing };
}

/** Build provenance-aware evidence record (caller supplies values; no fabrication). */
export function createEvidence(input: {
  claim: string;
  sourceType: Evidence['sourceType'];
  sourceLabel: string;
  sourceLocator?: string;
  sourceDate?: string;
  quotation?: string;
  reliabilityNote?: string;
  limitations?: string;
  relatedClaimIds?: string[];
  relation?: Evidence['relation'];
  verified?: boolean;
  notes?: string;
}): Evidence {
  const now = Date.now();
  return {
    id: uid('ev'),
    claim: input.claim,
    sourceType: input.sourceType,
    sourceLabel: input.sourceLabel,
    sourceLocator: input.sourceLocator,
    sourceDate: input.sourceDate,
    accessedAt: now,
    quotation: input.quotation,
    reliabilityNote: input.reliabilityNote,
    limitations: input.limitations,
    relatedClaimIds: tailIds(input.relatedClaimIds),
    relation: input.relation || 'NONE',
    verified: !!input.verified,
    verifiedAt: input.verified ? now : undefined,
    notes: input.notes,
  };
}

function tailIds(ids?: string[]): string[] | undefined {
  if (!ids || !ids.length) return undefined;
  return [...ids];
}

/**
 * Detect simple textual / structural contradictions in a decision.
 * Conservative: only flags clear opposing pairs, does not invent content.
 */
export function detectContradictions(d: Decision): Contradiction[] {
  const found: Contradiction[] = [];
  const now = Date.now();

  // Brief facts vs assumptions that share near-identical text (mis-labelling)
  const briefFacts = new Set((d.brief?.facts || []).map((s) => norm(s)));
  for (const a of d.brief?.assumptions || []) {
    if (briefFacts.has(norm(a))) {
      found.push({
        id: uid('ctr'),
        statementA: a,
        statementB: a,
        sourceA: 'brief.assumptions',
        sourceB: 'brief.facts',
        explanation: 'Same statement appears both as fact and as assumption',
        resolvable: true,
        detectedAt: now,
      });
    }
  }

  // Radar: fact vs assumption with same text
  const radarFacts = (d.radar?.facts || []).map((c) => ({ text: norm(c.text), id: c.id, raw: c.text }));
  for (const a of d.radar?.assumptions || []) {
    const hit = radarFacts.find((f) => f.text && f.text === norm(a.text));
    if (hit) {
      found.push({
        id: uid('ctr'),
        statementA: a.text,
        statementB: hit.raw,
        sourceA: `radar.assumptions:${a.id}`,
        sourceB: `radar.facts:${hit.id}`,
        explanation: 'Claim is listed both as fact and as assumption in UNDERSTAND radar',
        resolvable: true,
        detectedAt: now,
      });
    }
  }

  // Preferred vs opposite option same id
  if (
    d.preferredOptionId &&
    d.oppositeOptionId &&
    d.preferredOptionId === d.oppositeOptionId
  ) {
    found.push({
      id: uid('ctr'),
      statementA: `preferred=${d.preferredOptionId}`,
      statementB: `opposite=${d.oppositeOptionId}`,
      explanation: 'Preferred and opposite options refer to the same option id',
      resolvable: true,
      detectedAt: now,
    });
  }

  // Supported hypothesis that is also REJECTED (should not happen if transitions enforced)
  for (const h of d.hypotheses || []) {
    if (h.status === 'REJECTED' && (h.supportingEvidenceIds || []).length > 0) {
      // not a contradiction per se; skip
    }
  }

  // Evidence that both SUPPORTS and CONTRADICTS same claim
  const byClaim = new Map<string, Set<string>>();
  for (const e of d.evidence || []) {
    for (const cid of e.relatedClaimIds || []) {
      if (!byClaim.has(cid)) byClaim.set(cid, new Set());
      if (e.relation) byClaim.get(cid)!.add(e.relation);
    }
  }
  for (const [cid, rels] of byClaim) {
    if (rels.has('SUPPORTS') && rels.has('CONTRADICTS')) {
      found.push({
        id: uid('ctr'),
        statementA: `claim ${cid} supported`,
        statementB: `claim ${cid} contradicted`,
        explanation: 'Same claim has both supporting and contradicting evidence',
        resolvable: false,
        detectedAt: now,
        affectsConclusionIds: [cid],
      });
    }
  }

  return found;
}

function norm(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Unknowns that remain open and should stay visible. */
export function openUnknowns(d: Decision): Unknown[] {
  const list = d.radar?.unknowns || [];
  return list.filter(
    (u) =>
      !u.discarded &&
      !u.answer &&
      u.status !== 'USER_UNKNOWN' &&
      u.status !== 'ACCEPTED_UNCERTAINTY' &&
      u.status !== 'REJECTED'
  );
}

/**
 * When the user changes a critical field, mark dependent analytical objects as invalidated.
 * Does not delete prior work; records explicit invalidation.
 */
export function invalidateOnUserChange(
  d: Decision,
  change: { path: string; reason: string }
): Decision {
  const affected: string[] = [];
  const path = change.path;

  if (path.startsWith('brief.') || path === 'brief') {
    affected.push('radar', 'knowledgeMap', 'options', 'redTeam', 'preMortem', 'hypotheses', 'experiments', 'decision', 'synthesis');
  } else if (path.startsWith('options') || path === 'preferredOptionId' || path === 'oppositeOptionId') {
    affected.push('redTeam', 'preMortem', 'decision', 'synthesis');
  } else if (path.startsWith('hypotheses') || path.startsWith('evidence')) {
    affected.push('experiments', 'decision', 'synthesis');
  } else if (path.startsWith('experiments')) {
    affected.push('decision', 'synthesis');
  } else {
    affected.push('synthesis');
  }

  const entry = {
    at: Date.now(),
    reason: change.reason,
    affectedPaths: affected,
  };

  return {
    ...d,
    invalidated: [...(d.invalidated || []), entry],
    updatedAt: Date.now(),
  };
}

/**
 * Auditable EVPI calculation. Never invents precision beyond inputs.
 * Returns a CalculationRecord suitable for Decision.calculations.
 */
export function auditEvpi(input: {
  p: number;
  gain: number;
  loss: number;
  testCost: number;
  unit?: string;
  assumptions?: string[];
}): { ok: true; record: CalculationRecord; verdict: ReturnType<typeof evpiVerdict> } | { ok: false; error: string } {
  const err = validateEvpiInput(input.p, input.gain, input.loss, input.testCost);
  if (err) return { ok: false, error: err };

  const result = evpi(input.p, input.gain, input.loss);
  const range = evpiRange(input.p, input.gain, input.loss);
  const verdict = evpiVerdict(input.testCost, range);

  const record: CalculationRecord = {
    id: uid('calc'),
    kind: 'EVPI',
    inputs: {
      p: input.p,
      gain: input.gain,
      loss: input.loss,
      testCost: input.testCost,
    },
    units: input.unit || '',
    assumptions: input.assumptions || [
      'Probability p is a subjective assessment, not a measured frequency',
      'Gain and loss are point estimates',
    ],
    formula: 'EV_open = p*G - (1-p)*L; EV_perfect = p*G; EVPI = EV_perfect - max(EV_open, 0)',
    result: result.evpi,
    interpretation: `EVPI=${result.evpi}; range≈[${range.min}, ${range.max}]; verdict=${verdict.code}: ${verdict.text}`,
    limitations:
      'Point estimates only; does not account for imperfect tests, implementation costs beyond testCost, or distributional uncertainty beyond ±0.1 on p.',
    createdAt: Date.now(),
  };

  return { ok: true, record, verdict };
}

/**
 * Ensure rejected hypotheses are not present in active assumption lists.
 * Returns cleaned decision (shallow updates).
 */
export function purgeRejectedHypothesesFromAssumptions(d: Decision): Decision {
  const rejectedTexts = new Set(
    (d.hypotheses || [])
      .filter((h) => normalizeHypothesisStatus(h) === 'REJECTED')
      .map((h) => norm(h.rewrittenByUser || h.text))
      .filter(Boolean)
  );
  if (!rejectedTexts.size || !d.radar) return d;

  const assumptions = (d.radar.assumptions || []).filter((c) => !rejectedTexts.has(norm(c.text)));
  if (assumptions.length === (d.radar.assumptions || []).length) return d;

  return {
    ...d,
    radar: { ...d.radar, assumptions },
  };
}

/** Alternatives must differ on at least one meaningful dimension for EXPAND quality checks. */
export function alternativesAreDistinct(
  options: { title: string; description: string; keyAssumption?: string; door?: string }[]
): { distinct: boolean; reason?: string } {
  if (options.length < 2) return { distinct: true };
  const sigs = options.map((o) =>
    norm([o.title, o.description, o.keyAssumption || '', o.door || ''].join('|'))
  );
  const unique = new Set(sigs);
  if (unique.size < options.length) {
    return { distinct: false, reason: 'duplicate_or_near_duplicate_alternatives' };
  }
  // Titles alone nearly identical
  const titles = options.map((o) => norm(o.title));
  if (new Set(titles).size < options.length) {
    return { distinct: false, reason: 'duplicate_titles' };
  }
  return { distinct: true };
}

export function summarizeAnalyticalIntegrity(d: Decision): {
  verifiedFacts: number;
  userProvidedFacts: number;
  assumptions: number;
  openUnknowns: number;
  activeHypotheses: number;
  rejectedHypotheses: number;
  contradictions: number;
  calculations: number;
  unsupportedClaims: number;
} {
  const claims: Claim[] = [
    ...(d.radar?.facts || []),
    ...(d.radar?.assumptions || []),
    ...(d.radar?.interpretations || []),
  ];
  let verifiedFacts = 0;
  let userProvidedFacts = 0;
  let assumptions = 0;
  let unsupportedClaims = 0;
  for (const c of claims) {
    const label = labelClaim(c);
    if (label === 'VERIFIED_FACT') verifiedFacts++;
    else if (label === 'USER_PROVIDED_FACT') userProvidedFacts++;
    else if (label === 'ASSUMPTION') assumptions++;
    if (!(c.evidenceIds || []).length && c.kind === 'FACT') unsupportedClaims++;
  }
  const hyps = d.hypotheses || [];
  return {
    verifiedFacts,
    userProvidedFacts,
    assumptions,
    openUnknowns: openUnknowns(d).length,
    activeHypotheses: hyps.filter(isActiveHypothesis).length,
    rejectedHypotheses: hyps.filter((h) => normalizeHypothesisStatus(h) === 'REJECTED').length,
    contradictions: (d.contradictions || detectContradictions(d)).length,
    calculations: (d.calculations || []).length,
    unsupportedClaims,
  };
}
