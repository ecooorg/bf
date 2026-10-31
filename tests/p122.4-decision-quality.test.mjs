/**
 * P122.4 — Decision quality, final document, stage completion, rubric, five scenarios (Layer A).
 * Layer B (real-model) is defined in tests/p122.4-real-model-eval.mjs and is NOT part of normal CI.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const decisionMod = await import(pathToFileURL(path.join(root, 'src/decision.ts')).href);
const finalMod = await import(pathToFileURL(path.join(root, 'src/finalDecisionDocument.ts')).href);
const integrity = await import(pathToFileURL(path.join(root, 'src/analyticalIntegrity.ts')).href);
const workflow = await import(pathToFileURL(path.join(root, 'src/expertWorkflow.ts')).href);
const storageMod = await import(pathToFileURL(path.join(root, 'src/storage.ts')).href);

// localStorage mock for scenario D recovery path
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(String(k), String(v)),
  removeItem: (k) => mem.delete(String(k)),
  clear: () => mem.clear(),
};

const { emptyDecision, uid } = decisionMod;
const {
  buildFinalDecisionDocument,
  finalDocumentToText,
  evaluateStageCompletion,
  evaluateRecommendationQuality,
  evaluateDecisionQualityRubric,
  calibrateConfidence,
} = finalMod;
const { invalidateOnUserChange, labelClaim } = integrity;
const { reconstructContext, formatExpertFailure, transitionWorkflow } = workflow;
const { saveDecisions, getStoredDecisions } = storageMod;

function opt(id, title, extra = {}) {
  return {
    id,
    title,
    description: extra.description || `${title} path`,
    byUser: false,
    keyAssumption: extra.keyAssumption || 'assumption',
    exitCost: extra.exitCost || 'medium',
    cheapestTest: 'pilot',
    door: extra.door || 'TWO_WAY',
    realistic: 'YES',
    linkedUnknownIds: [],
    ...extra,
  };
}

function baseComplexDecision() {
  const d = emptyDecision();
  d.title = 'EU expansion';
  d.step = 'SYNTHESIS';
  d.brief.decision = 'Should we open an office in the EU this year?';
  d.brief.goal = 'Grow revenue without irreversible over-commitment';
  d.brief.constraints = ['Budget under 200k', 'Must keep HQ team intact'];
  d.brief.facts = ['HQ is in Berlin'];
  d.brief.assumptions = ['EU demand will grow 20%'];
  d.radar = {
    facts: [
      {
        id: 'f1',
        kind: 'FACT',
        text: 'HQ is in Berlin',
        source: 'USER_DATA',
        sourceType: 'USER',
        status: 'USER_CONFIRMED',
        evidenceIds: [],
        createdAt: 0,
        updatedAt: 0,
      },
    ],
    assumptions: [
      {
        id: 'a1',
        kind: 'ASSUMPTION',
        text: 'EU demand will grow 20%',
        source: 'USER_DATA',
        sourceType: 'USER',
        status: 'UNRESOLVED',
        evidenceIds: [],
        createdAt: 0,
        updatedAt: 0,
      },
    ],
    interpretations: [],
    values: [],
    unknowns: [
      {
        id: 'u1',
        kind: 'UNKNOWN',
        text: 'What is year-1 demand?',
        source: 'USER_DATA',
        sourceType: 'MODEL',
        status: 'UNRESOLVED',
        evidenceIds: [],
        createdAt: 0,
        updatedAt: 0,
        question: 'What is year-1 demand in target market?',
        whyChangesDecision: 'Changes office size and budget',
        howToFindOut: 'Customer interviews',
        effort: 'WEEKS',
        branchIfA: { answer: 'High', leadsTo: 'Full office' },
        branchIfB: { answer: 'Low', leadsTo: 'Remote only' },
        critical: true,
      },
    ],
    needsExternalCheck: [],
    meta: { model: 'test', fallback: false, at: 0, durationMs: 0 },
  };
  d.options = [
    opt('o1', 'Full office', { door: 'ONE_WAY', exitCost: 'high lease', keyAssumption: 'Demand high' }),
    opt('o2', 'Remote-first', { door: 'TWO_WAY', exitCost: 'low', keyAssumption: 'Clients accept remote' }),
    opt('o3', 'Pilot-month pilot', { door: 'TWO_WAY', exitCost: 'low', keyAssumption: 'Pilot predicts demand', kind: 'HYBRID_OR_PILOT' }),
  ];
  d.preferredOptionId = 'o3';
  d.redTeam = [
    {
      targetOptionId: 'o3',
      role: 'PREFERRED',
      objections: [
        {
          id: 'obj1',
          argument: 'Pilot may not represent real demand',
          hiddenAssumption: 'Sample is representative',
          failureMode: 'False positive on demand',
          whatMustBeTrueForCritiqueToBeWeak: 'Diverse customer sample',
          verifiability: 'TESTABLE',
        },
      ],
      meta: { model: 't', fallback: false, at: 0, durationMs: 0 },
    },
  ];
  d.preMortem = {
    horizonMonths: 12,
    causes: [{ text: 'Underestimated regulatory cost', verifiability: 'TESTABLE' }],
    narrative: 'Office opens, costs overrun, team stretched',
    whatDistinguishesFromForecast: 'Focuses on failure mechanisms',
    meta: { model: 't', fallback: false, at: 0, durationMs: 0 },
  };
  d.hypotheses = [
    { id: 'h1', text: 'Pilot predicts 12-month demand', verifiability: 'TESTABLE', status: 'UNDER_INVESTIGATION', selectedByUser: true },
  ];
  d.experiments = [
    {
      id: 'e1',
      hypothesisId: 'h1',
      whyCritical: 'Avoids irreversible lease',
      test: '3-month sales pilot',
      metric: 'Qualified leads / month',
      deadline: '2026-04-01',
      successThreshold: '>= 10 leads',
      stopThreshold: '< 3 leads',
      ifSuccess: 'Expand to full office plan',
      ifFailure: 'Stay remote-first',
      validityThreats: [],
      thresholdQuestions: [],
      status: 'READY',
      evidenceIds: [],
      history: [],
      thresholdShiftedAfterStart: false,
    },
  ];
  d.decision = {
    kind: 'RUN_TESTS',
    whatIDecided: 'Run a 3-month pilot before signing a lease',
    onWhichValues: 'Reversibility and capital discipline',
    underWhichData: 'User-provided HQ fact; demand is assumed',
    acceptedUncertainties: ['Year-1 demand unknown'],
    decidedAt: Date.now(),
  };
  d.synthesis = {
    paragraphs: [
      'We know HQ is in Berlin and budget is capped.',
      'We do not know year-1 demand.',
      'Demand evidence would change office size.',
      'A pilot is the cheapest test.',
      'Regulatory cost needs external check.',
    ],
    derivedNumbers: [],
    openGaps: ['Year-1 demand'],
    needsExternalCheck: ['Regulatory cost'],
    unverifiedNumbers: [],
    meta: { model: 't', fallback: false, at: 0, durationMs: 0 },
  };
  d.calculations = [
    {
      id: 'calc1',
      kind: 'EVPI',
      inputs: { p: 0.4, gain: 100, loss: 150, testCost: 10 },
      units: 'USD',
      assumptions: ['Subjective p'],
      formula: 'EVPI = EV_perfect - max(EV_open, 0)',
      result: 40,
      interpretation: 'Test may be justified',
      limitations: 'Point estimates only',
      createdAt: Date.now(),
    },
  ];
  return d;
}

describe('P122.4 final decision document', () => {
  it('includes core sections for a complex decision', () => {
    const d = baseComplexDecision();
    const doc = buildFinalDecisionDocument(d);
    assert.ok(doc.executiveSummary);
    assert.equal(doc.originalProblem.includes('EU'), true);
    assert.ok(doc.constraints.length);
    assert.ok(doc.userProvidedUnverified.length || doc.verifiedFacts.length);
    assert.ok(doc.assumptions.length);
    assert.ok(doc.importantUnknowns.length);
    assert.ok(doc.mainAlternatives.length >= 3);
    assert.ok(doc.redTeamFindings.length);
    assert.ok(doc.preMortemFindings.length);
    assert.ok(doc.numericalCalculations.length);
    assert.ok(doc.recommendedOption);
    assert.ok(doc.justification);
    assert.ok(doc.conditionsForChange.length);
    assert.equal(doc.userRetainsControl, true);
    const text = finalDocumentToText(doc);
    assert.ok(text.includes('Executive summary'));
    assert.ok(text.includes('User control'));
  });

  it('calibrateConfidence does not invent high confidence without evidence', () => {
    const d = emptyDecision();
    d.brief.decision = 'x';
    const msg = calibrateConfidence(d);
    assert.ok(/low|Limited|not independently verified|assumption/i.test(msg));
  });
});

describe('P122.4 stage completion', () => {
  it('UNDERSTAND incomplete without radar/facts', () => {
    const d = emptyDecision();
    d.step = 'UNDERSTAND';
    const r = evaluateStageCompletion(d, 'UNDERSTAND');
    assert.equal(r.complete, false);
  });

  it('EXPAND incomplete with one option', () => {
    const d = emptyDecision();
    d.options = [opt('o1', 'Only')];
    const r = evaluateStageCompletion(d, 'EXPAND');
    assert.equal(r.complete, false);
  });

  it('ATTACK incomplete without critique', () => {
    const d = emptyDecision();
    const r = evaluateStageCompletion(d, 'ATTACK');
    assert.equal(r.complete, false);
  });

  it('SYNTHESIS complete when paragraphs exist', () => {
    const d = baseComplexDecision();
    const r = evaluateStageCompletion(d, 'SYNTHESIS');
    assert.equal(r.complete, true);
  });
});

describe('P122.4 recommendation quality & rubric', () => {
  it('scores a complete decision above mid-scale', () => {
    const d = baseComplexDecision();
    const q = evaluateRecommendationQuality(d);
    assert.ok(q.answersWhat);
    assert.ok(q.showsAlternatives);
    assert.ok(q.score >= 6);
    const rubric = evaluateDecisionQualityRubric(d);
    assert.ok(rubric.average >= 2.5);
    assert.equal(rubric.dimensions.length >= 10, true);
  });
});

describe('P122.4 Scenario A — Complex decision', () => {
  it('produces defensible structured recommendation with alternatives and risks', () => {
    const d = baseComplexDecision();
    const doc = buildFinalDecisionDocument(d);
    assert.ok(doc.mainAlternatives.length >= 3);
    assert.ok(doc.risks.length || doc.redTeamFindings.length);
    assert.ok(doc.implementationPlan.length || doc.validationMilestones.length);
    assert.ok(doc.assumptions.length);
  });
});

describe('P122.4 Scenario B — Changed information', () => {
  it('invalidates dependent analysis when budget constraint changes', () => {
    const d = baseComplexDecision();
    const next = invalidateOnUserChange(d, {
      path: 'brief.constraints',
      reason: 'Budget reduced to 50k',
    });
    assert.ok(next.invalidated?.length);
    assert.ok(next.invalidated[0].affectedPaths.includes('options'));
    assert.ok(next.invalidated[0].affectedPaths.includes('synthesis'));
    // Unaffected identity preserved
    assert.equal(next.id, d.id);
    assert.equal(next.brief.decision, d.brief.decision);
  });
});

describe('P122.4 Scenario C — False or questionable assumption', () => {
  it('does not label user assumption as verified fact', () => {
    const d = baseComplexDecision();
    const assumption = d.radar.assumptions[0];
    assert.equal(labelClaim(assumption), 'ASSUMPTION');
    assert.notEqual(labelClaim(assumption), 'VERIFIED_FACT');
    const doc = buildFinalDecisionDocument(d);
    assert.ok(doc.assumptions.some((a) => a.includes('20%')));
    assert.ok(doc.confidenceAndLimitations.length > 0);
  });
});

describe('P122.4 Scenario D — Model failure preserves work', () => {
  it('failed operation message states work preserved; storage intact', () => {
    mem.clear();
    const d = baseComplexDecision();
    saveDecisions([d]);
    const msg = formatExpertFailure({
      operation: 'synthesis',
      category: 'INVALID_MODEL_JSON',
      message: 'AI returned invalid JSON',
    });
    assert.ok(msg.includes('previous work is still saved'));
    const loaded = getStoredDecisions();
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].brief.decision, d.brief.decision);
    // Invalid workflow jump rejected
    const bad = transitionWorkflow('FAILED', 'COMPLETED');
    assert.equal(bad.ok, false);
    const good = transitionWorkflow('FAILED', 'RECOVERABLE');
    assert.equal(good.ok, true);
  });
});

describe('P122.4 Scenario E — Complete decision cycle', () => {
  it('full document is coherent and actionable', () => {
    const d = baseComplexDecision();
    const doc = buildFinalDecisionDocument(d);
    const text = finalDocumentToText(doc);
    assert.ok(text.includes(doc.originalProblem));
    assert.ok(doc.recommendedOption);
    assert.ok(doc.justification);
    assert.ok(doc.risks.length || doc.redTeamFindings.length);
    assert.ok(doc.unresolvedQuestions.length);
    assert.equal(doc.userRetainsControl, true);
    const ctx = reconstructContext(d);
    assert.ok(ctx.text.includes('Objective:'));
    const rubric = evaluateDecisionQualityRubric(d);
    assert.ok(rubric.criticalFailures.every((f) => typeof f === 'string'));
  });
});
