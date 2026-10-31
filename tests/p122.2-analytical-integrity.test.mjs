/**
 * P122.2 — Analytical reliability & evidence integrity
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const decisionMod = await import(pathToFileURL(path.join(root, 'src/decision.ts')).href);
const integrity = await import(pathToFileURL(path.join(root, 'src/analyticalIntegrity.ts')).href);

const { emptyDecision, uid } = decisionMod;
const {
  labelClaim,
  isVerifiedFact,
  canPromoteToVerifiedFact,
  normalizeHypothesisStatus,
  canTransitionHypothesis,
  transitionHypothesis,
  isActiveHypothesis,
  validateEvidenceRefs,
  createEvidence,
  detectContradictions,
  openUnknowns,
  invalidateOnUserChange,
  auditEvpi,
  purgeRejectedHypothesesFromAssumptions,
  alternativesAreDistinct,
  summarizeAnalyticalIntegrity,
} = integrity;

function claim(partial) {
  return {
    id: uid('c'),
    kind: 'FACT',
    text: 'x',
    source: 'USER_DATA',
    sourceType: 'USER',
    status: 'UNRESOLVED',
    evidenceIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...partial,
  };
}

describe('P122.2 fact / assumption separation', () => {
  it('does not label assumption as verified fact', () => {
    const c = claim({ kind: 'ASSUMPTION', status: 'USER_CONFIRMED' });
    assert.equal(labelClaim(c), 'ASSUMPTION');
    assert.equal(isVerifiedFact(c), false);
  });

  it('user-provided fact stays user-provided unless externally verified', () => {
    const c2 = claim({ kind: 'FACT', sourceType: 'USER', status: 'USER_CONFIRMED' });
    assert.equal(labelClaim(c2), 'USER_PROVIDED_FACT');
    assert.equal(isVerifiedFact(c2), false);
  });

  it('only EXTERNALLY_VERIFIED FACT is verified fact', () => {
    const c = claim({ kind: 'FACT', status: 'EXTERNALLY_VERIFIED', sourceType: 'EXTERNAL' });
    assert.equal(labelClaim(c), 'VERIFIED_FACT');
    assert.equal(isVerifiedFact(c), true);
  });

  it('assumption cannot be promoted without reclassification and verified evidence', () => {
    const c = claim({ kind: 'ASSUMPTION' });
    const r = canPromoteToVerifiedFact(c, ['e1'], [
      { id: 'e1', claim: 'x', sourceType: 'USER_DOCUMENT', sourceLabel: 'u', verified: true },
    ]);
    assert.equal(r.ok, false);
  });

  it('FACT with verified evidence can be promoted', () => {
    const c = claim({ kind: 'FACT', status: 'UNRESOLVED' });
    const r = canPromoteToVerifiedFact(c, ['e1'], [
      { id: 'e1', claim: 'x', sourceType: 'EXTERNAL_SOURCE', sourceLabel: 'src', verified: true },
    ]);
    assert.equal(r.ok, true);
  });
});

describe('P122.2 hypothesis lifecycle', () => {
  it('defaults missing status to PROPOSED', () => {
    assert.equal(normalizeHypothesisStatus({ id: 'h', text: 't', verifiability: 'TESTABLE' }), 'PROPOSED');
  });

  it('allows PROPOSED -> UNDER_INVESTIGATION with reason', () => {
    const h = { id: 'h1', text: 'T', verifiability: 'TESTABLE', status: 'PROPOSED' };
    const r = transitionHypothesis(h, 'UNDER_INVESTIGATION', 'Selected for test');
    assert.equal(r.ok, true);
    assert.equal(r.hypothesis.status, 'UNDER_INVESTIGATION');
  });

  it('rejects invalid transition REJECTED -> SUPPORTED', () => {
    const h = { id: 'h1', text: 'T', verifiability: 'TESTABLE', status: 'REJECTED' };
    const r = transitionHypothesis(h, 'SUPPORTED', 'nope');
    assert.equal(r.ok, false);
  });

  it('requires status reason', () => {
    const h = { id: 'h1', text: 'T', verifiability: 'TESTABLE', status: 'PROPOSED' };
    const r = transitionHypothesis(h, 'REJECTED', '  ');
    assert.equal(r.ok, false);
  });

  it('rejected hypothesis is not active', () => {
    assert.equal(isActiveHypothesis({ id: 'h', text: 't', verifiability: 'TESTABLE', status: 'REJECTED' }), false);
    assert.equal(isActiveHypothesis({ id: 'h', text: 't', verifiability: 'TESTABLE', status: 'SUPPORTED' }), true);
  });

  it('purge removes rejected hypothesis text from radar assumptions', () => {
    const d = emptyDecision();
    d.hypotheses = [
      { id: 'h1', text: 'Market will double', verifiability: 'SPECULATION', status: 'REJECTED' },
    ];
    d.radar = {
      facts: [],
      assumptions: [claim({ kind: 'ASSUMPTION', text: 'Market will double' })],
      interpretations: [],
      values: [],
      unknowns: [],
      needsExternalCheck: [],
      meta: { model: 't', fallback: false, at: 0, durationMs: 0 },
    };
    const cleaned = purgeRejectedHypothesesFromAssumptions(d);
    assert.equal(cleaned.radar.assumptions.length, 0);
  });
});

describe('P122.2 evidence integrity', () => {
  it('createEvidence records provenance fields', () => {
    const e = createEvidence({
      claim: 'Revenue grew 10%',
      sourceType: 'EXTERNAL_SOURCE',
      sourceLabel: 'Annual report 2025',
      sourceLocator: 'p.12',
      sourceDate: '2025-03-01',
      quotation: 'Revenue increased by 10% YoY',
      reliabilityNote: 'Audited',
      limitations: 'Single year',
      relatedClaimIds: ['c1'],
      relation: 'SUPPORTS',
      verified: true,
    });
    assert.ok(e.id);
    assert.equal(e.relation, 'SUPPORTS');
    assert.equal(e.verified, true);
    assert.ok(e.accessedAt);
    assert.equal(e.quotation, 'Revenue increased by 10% YoY');
  });

  it('validateEvidenceRefs detects missing evidence', () => {
    const c = claim({ evidenceIds: ['missing'] });
    const r = validateEvidenceRefs(c, []);
    assert.equal(r.ok, false);
    assert.deepEqual(r.missing, ['missing']);
  });

  it('validateEvidenceRefs accepts present evidence', () => {
    const c = claim({ evidenceIds: ['e1'] });
    const r = validateEvidenceRefs(c, [
      { id: 'e1', claim: 'x', sourceType: 'MODEL', sourceLabel: 'm', verified: false },
    ]);
    assert.equal(r.ok, true);
  });
});

describe('P122.2 contradictions and unknowns', () => {
  it('detects statement listed as both fact and assumption in brief', () => {
    const d = emptyDecision();
    d.brief.facts = ['Cash runway is 6 months'];
    d.brief.assumptions = ['Cash runway is 6 months'];
    const ctr = detectContradictions(d);
    assert.ok(ctr.length >= 1);
    assert.ok(ctr.some((c) => c.explanation.includes('fact and as assumption')));
  });

  it('detects preferred === opposite', () => {
    const d = emptyDecision();
    d.preferredOptionId = 'o1';
    d.oppositeOptionId = 'o1';
    const ctr = detectContradictions(d);
    assert.ok(ctr.some((c) => c.explanation.includes('same option')));
  });

  it('open unknowns stay visible until resolved', () => {
    const d = emptyDecision();
    d.radar = {
      facts: [],
      assumptions: [],
      interpretations: [],
      values: [],
      needsExternalCheck: [],
      unknowns: [
        {
          id: 'u1',
          kind: 'UNKNOWN',
          text: 'q',
          source: 'USER_DATA',
          sourceType: 'USER',
          status: 'UNRESOLVED',
          evidenceIds: [],
          createdAt: 0,
          updatedAt: 0,
          question: 'What is demand?',
          whyChangesDecision: 'Changes scale',
          howToFindOut: 'Survey',
          effort: 'DAYS',
          branchIfA: { answer: '', leadsTo: '' },
          branchIfB: { answer: '', leadsTo: '' },
          critical: true,
        },
        {
          id: 'u2',
          kind: 'UNKNOWN',
          text: 'q2',
          source: 'USER_DATA',
          sourceType: 'USER',
          status: 'ACCEPTED_UNCERTAINTY',
          evidenceIds: [],
          createdAt: 0,
          updatedAt: 0,
          question: 'Resolved-ish',
          whyChangesDecision: '',
          howToFindOut: '',
          effort: 'DAYS',
          branchIfA: { answer: '', leadsTo: '' },
          branchIfB: { answer: '', leadsTo: '' },
          critical: true,
        },
      ],
      meta: { model: 't', fallback: false, at: 0, durationMs: 0 },
    };
    const open = openUnknowns(d);
    assert.equal(open.length, 1);
    assert.equal(open[0].id, 'u1');
  });
});

describe('P122.2 invalidation and alternatives', () => {
  it('user change to brief invalidates dependent stages', () => {
    const d = emptyDecision();
    const next = invalidateOnUserChange(d, { path: 'brief.decision', reason: 'User rewrote problem' });
    assert.ok(next.invalidated?.length === 1);
    assert.ok(next.invalidated[0].affectedPaths.includes('radar'));
    assert.ok(next.invalidated[0].affectedPaths.includes('synthesis'));
  });

  it('near-duplicate alternatives are flagged', () => {
    const r = alternativesAreDistinct([
      { title: 'Build in-house', description: 'Hire team', keyAssumption: 'Talent available', door: 'ONE_WAY' },
      { title: 'Build in-house', description: 'Hire team', keyAssumption: 'Talent available', door: 'ONE_WAY' },
    ]);
    assert.equal(r.distinct, false);
  });

  it('meaningfully different alternatives pass', () => {
    const r = alternativesAreDistinct([
      { title: 'Build in-house', description: 'Hire', keyAssumption: 'Talent', door: 'ONE_WAY' },
      { title: 'Buy SaaS', description: 'Subscribe', keyAssumption: 'Vendor stable', door: 'TWO_WAY' },
    ]);
    assert.equal(r.distinct, true);
  });
});

describe('P122.2 numerical audit (EVPI)', () => {
  it('produces auditable calculation record', () => {
    const r = auditEvpi({ p: 0.4, gain: 100, loss: 150, testCost: 10, unit: 'USD' });
    assert.equal(r.ok, true);
    assert.equal(r.record.kind, 'EVPI');
    assert.equal(r.record.inputs.p, 0.4);
    assert.ok(r.record.formula.includes('EVPI'));
    assert.ok(typeof r.record.result === 'number');
    assert.ok(r.record.limitations.length > 0);
    assert.ok(r.record.assumptions.length > 0);
  });

  it('rejects invalid inputs', () => {
    const r = auditEvpi({ p: 2, gain: 1, loss: 1, testCost: 0 });
    assert.equal(r.ok, false);
  });
});

describe('P122.2 summary', () => {
  it('summarizeAnalyticalIntegrity counts categories', () => {
    const d = emptyDecision();
    d.radar = {
      facts: [claim({ kind: 'FACT', status: 'EXTERNALLY_VERIFIED', sourceType: 'EXTERNAL' })],
      assumptions: [claim({ kind: 'ASSUMPTION' })],
      interpretations: [],
      values: [],
      unknowns: [],
      needsExternalCheck: [],
      meta: { model: 't', fallback: false, at: 0, durationMs: 0 },
    };
    d.hypotheses = [
      { id: 'h1', text: 'a', verifiability: 'TESTABLE', status: 'PROPOSED' },
      { id: 'h2', text: 'b', verifiability: 'TESTABLE', status: 'REJECTED' },
    ];
    const s = summarizeAnalyticalIntegrity(d);
    assert.equal(s.verifiedFacts, 1);
    assert.equal(s.assumptions, 1);
    assert.equal(s.activeHypotheses, 1);
    assert.equal(s.rejectedHypotheses, 1);
  });
});
