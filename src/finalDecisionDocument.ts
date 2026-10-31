/**
 * P122.4 — Final decision document builder, recommendation quality, confidence calibration,
 * stage completion criteria, and decision-quality rubric.
 */
import type {
  Decision,
  Hypothesis,
  Option,
  Step,
  Synthesis,
} from './decision.ts';
import {
  isActiveHypothesis,
  isVerifiedFact,
  labelClaim,
  openUnknowns,
  summarizeAnalyticalIntegrity,
  detectContradictions,
} from './analyticalIntegrity.ts';
import { reconstructContext } from './expertWorkflow.ts';

/** Structured final decision document (P122.4 §8.1). Sections may be empty when not applicable. */
export interface FinalDecisionDocument {
  executiveSummary: string;
  originalProblem: string;
  decisionObjective: string;
  constraints: string[];
  verifiedFacts: string[];
  userProvidedUnverified: string[];
  assumptions: string[];
  interpretations: string[];
  importantUnknowns: string[];
  evidenceSummary: string[];
  mainAlternatives: { id: string; title: string; description: string; risks: string; door: string }[];
  comparisonOfAlternatives: string;
  benefits: string[];
  costs: string[];
  risks: string[];
  redTeamFindings: string[];
  preMortemFindings: string[];
  criticalUncertainties: string[];
  expectedConsequences: string[];
  numericalCalculations: string[];
  recommendedOption: string;
  justification: string;
  reasonsForRejectingOthers: string[];
  conditionsForChange: string[];
  implementationPlan: string[];
  validationMilestones: string[];
  successCriteria: string[];
  contingencyPlan: string[];
  unresolvedQuestions: string[];
  confidenceAndLimitations: string;
  userRetainsControl: true;
  generatedAt: number;
  stage: Step;
}

function clean(s: unknown): string {
  return String(s ?? '').trim();
}

function unique(items: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of items) {
    const t = clean(x);
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Build a complete structured final decision document from stored Decision state. Does not invent facts. */
export function buildFinalDecisionDocument(d: Decision): FinalDecisionDocument {
  const integrity = summarizeAnalyticalIntegrity(d);
  const contradictions = d.contradictions?.length ? d.contradictions : detectContradictions(d);
  const unknowns = openUnknowns(d);

  const verifiedFacts: string[] = [];
  const userProvided: string[] = [];
  const assumptions: string[] = [];
  const interpretations: string[] = [];

  for (const c of d.radar?.facts || []) {
    const label = labelClaim(c);
    if (label === 'VERIFIED_FACT') verifiedFacts.push(c.text);
    else userProvided.push(c.text);
  }
  for (const f of d.brief?.facts || []) {
    if (!verifiedFacts.includes(f) && !userProvided.includes(f)) userProvided.push(f);
  }
  for (const c of d.radar?.assumptions || []) assumptions.push(c.text);
  for (const a of d.brief?.assumptions || []) {
    if (!assumptions.includes(a)) assumptions.push(a);
  }
  for (const c of d.radar?.interpretations || []) interpretations.push(c.text);

  const evidenceSummary = (d.evidence || []).map((e) => {
    const rel = e.relation && e.relation !== 'NONE' ? ` [${e.relation}]` : '';
    const ver = e.verified ? ' verified' : ' unverified';
    return `${e.claim} — ${e.sourceLabel}${rel}${ver}`;
  });

  const mainAlternatives = (d.options || []).map((o) => ({
    id: o.id,
    title: o.title,
    description: o.description,
    risks: o.exitCost || o.keyAssumption || '',
    door: o.door,
  }));

  const redTeamFindings: string[] = [];
  for (const round of d.redTeam || []) {
    for (const obj of round.objections || []) {
      redTeamFindings.push(
        `${obj.argument}${obj.failureMode ? ` (failure: ${obj.failureMode})` : ''}`
      );
    }
  }

  const preMortemFindings = (d.preMortem?.causes || []).map((c) => c.text).filter(Boolean);

  const numericalCalculations = (d.calculations || []).map(
    (c) =>
      `${c.kind}: result=${c.result}${c.units ? ` ${c.units}` : ''}; formula=${c.formula}; limitations=${c.limitations}`
  );

  const chosenId = d.decision?.chosenOptionId || d.preferredOptionId;
  const chosen = (d.options || []).find((o) => o.id === chosenId);
  const recommendedOption =
    d.decision?.kind === 'POSTPONE'
      ? 'Postpone the decision until critical uncertainties are resolved'
      : d.decision?.kind === 'REFUSE'
        ? 'No proposed option is sufficiently justified'
        : d.decision?.kind === 'RUN_TESTS'
          ? 'Run tests before deciding'
          : chosen
            ? `${chosen.title}${chosen.description ? `: ${chosen.description}` : ''}`
            : d.decision?.whatIDecided || '(No recommendation recorded — user retains control)';

  const reasonsForRejectingOthers = (d.options || [])
    .filter((o) => o.id !== chosenId)
    .map((o) => `${o.title}: not selected${o.keyAssumption ? ` (key assumption: ${o.keyAssumption})` : ''}`);

  const conditionsForChange = unique([
    ...unknowns.map((u) => `If resolved: ${u.question || u.text}`),
    ...(d.decision?.acceptedUncertainties || []).map((u) => `Accepted uncertainty: ${u}`),
    ...contradictions.map((c) => `Unresolved contradiction: ${c.explanation}`),
  ]);

  const criticalUncertainties = unique([
    ...unknowns.map((u) => u.question || u.text),
    ...contradictions.map((c) => c.explanation),
  ]);

  const synthesisText =
    d.synthesis?.editedByUser ||
    (d.synthesis?.paragraphs || []).map(clean).filter(Boolean).join('\n\n');

  const justification =
    d.decision?.whatIDecided ||
    synthesisText ||
    'No formal justification recorded yet. The user owns the final choice.';

  const confidenceAndLimitations = calibrateConfidence(d, integrity, contradictions.length);

  const executiveSummary = buildExecutiveSummary(d, recommendedOption, criticalUncertainties);

  return {
    executiveSummary,
    originalProblem: clean(d.brief?.decision) || clean(d.title),
    decisionObjective: clean(d.brief?.goal) || clean(d.brief?.decision),
    constraints: unique(d.brief?.constraints || []),
    verifiedFacts: unique(verifiedFacts),
    userProvidedUnverified: unique(userProvided),
    assumptions: unique(assumptions),
    interpretations: unique(interpretations),
    importantUnknowns: unique(unknowns.map((u) => u.question || u.text)),
    evidenceSummary: unique(evidenceSummary),
    mainAlternatives,
    comparisonOfAlternatives: compareAlternatives(d.options || [], chosenId),
    benefits: extractBenefits(d, chosen),
    costs: extractCosts(d, chosen),
    risks: unique([
      ...redTeamFindings.slice(0, 8),
      ...preMortemFindings.slice(0, 8),
      ...(chosen?.exitCost ? [chosen.exitCost] : []),
    ]),
    redTeamFindings: unique(redTeamFindings),
    preMortemFindings: unique(preMortemFindings),
    criticalUncertainties,
    expectedConsequences: unique([
      ...(chosen?.description ? [chosen.description] : []),
      ...(d.preMortem?.narrative ? [d.preMortem.narrative] : []),
    ]),
    numericalCalculations,
    recommendedOption,
    justification,
    reasonsForRejectingOthers,
    conditionsForChange,
    implementationPlan: buildImplementationPlan(d),
    validationMilestones: (d.experiments || [])
      .filter((e) => e.metric || e.deadline)
      .map((e) => [e.test, e.metric, e.deadline].filter(Boolean).join(' · ')),
    successCriteria: unique(
      (d.experiments || [])
        .map((e) => e.successThreshold)
        .filter(Boolean) as string[]
    ),
    contingencyPlan: unique(
      (d.experiments || [])
        .map((e) => e.ifFailure || e.whatToDoAfterStop)
        .filter(Boolean) as string[]
    ),
    unresolvedQuestions: unique([
      ...criticalUncertainties,
      ...(d.synthesis?.openGaps || []),
      ...(d.synthesis?.needsExternalCheck || []),
    ]),
    confidenceAndLimitations,
    userRetainsControl: true,
    generatedAt: Date.now(),
    stage: d.step,
  };
}

function buildExecutiveSummary(
  d: Decision,
  recommended: string,
  uncertainties: string[]
): string {
  const problem = clean(d.brief?.decision) || clean(d.title) || 'Decision';
  const unc =
    uncertainties.length > 0
      ? ` Critical uncertainties remain (${uncertainties.length}).`
      : '';
  return `${problem} Recommendation: ${recommended}.${unc} The user retains final authority over the decision.`;
}

function compareAlternatives(options: Option[], chosenId?: string): string {
  if (!options.length) return 'No structured alternatives recorded.';
  return options
    .map((o) => {
      const mark = o.id === chosenId ? ' [selected]' : '';
      return `${o.title}${mark}: ${o.description || '—'}; door=${o.door}; assumption=${o.keyAssumption || '—'}`;
    })
    .join('\n');
}

function extractBenefits(d: Decision, chosen?: Option): string[] {
  const out: string[] = [];
  if (chosen?.description) out.push(chosen.description);
  if (d.decision?.onWhichValues) out.push(`Aligned values: ${d.decision.onWhichValues}`);
  return unique(out);
}

function extractCosts(d: Decision, chosen?: Option): string[] {
  const out: string[] = [];
  if (chosen?.exitCost) out.push(chosen.exitCost);
  if (d.brief?.errorCost?.final) out.push(`Error cost level: ${d.brief.errorCost.final}`);
  if (d.brief?.errorCost?.note) out.push(d.brief.errorCost.note);
  return unique(out);
}

function buildImplementationPlan(d: Decision): string[] {
  const steps: string[] = [];
  if (d.decision?.kind === 'RUN_TESTS') {
    for (const e of d.experiments || []) {
      if (e.test) steps.push(`Run test: ${e.test}`);
    }
  }
  if (d.decision?.kind === 'CHOOSE_OPTION' && d.decision.whatIDecided) {
    steps.push(d.decision.whatIDecided);
  }
  for (const e of d.experiments || []) {
    if (e.ifSuccess) steps.push(`If success: ${e.ifSuccess}`);
  }
  return unique(steps);
}

/** Confidence must reflect evidence quality — not fluent language. */
export function calibrateConfidence(
  d: Decision,
  integrity = summarizeAnalyticalIntegrity(d),
  contradictionCount = (d.contradictions || []).length
): string {
  const parts: string[] = [];
  if (integrity.verifiedFacts === 0 && integrity.userProvidedFacts > 0) {
    parts.push('Most factual claims are user-provided and not independently verified.');
  }
  if (integrity.verifiedFacts > 0) {
    parts.push(`${integrity.verifiedFacts} claim(s) marked as externally verified.`);
  }
  if (integrity.assumptions > 0) {
    parts.push(`${integrity.assumptions} assumption(s) remain active.`);
  }
  if (integrity.openUnknowns > 0) {
    parts.push(`${integrity.openUnknowns} critical unknown(s) are unresolved.`);
  }
  if (contradictionCount > 0) {
    parts.push(`${contradictionCount} contradiction(s) are unresolved — affected conclusions are not certain.`);
  }
  if (integrity.unsupportedClaims > 0) {
    parts.push(`${integrity.unsupportedClaims} fact-labelled claim(s) lack linked evidence.`);
  }
  if (!parts.length) {
    parts.push('Limited structured evidence recorded; treat recommendation confidence as low until evidence is attached.');
  }
  parts.push('Do not equate fluent synthesis text with high confidence.');
  return parts.join(' ');
}

// --- Stage completion criteria (P122.4 §8.6) ---

export interface StageCompletion {
  stage: Step;
  complete: boolean;
  reasons: string[];
  limitationsAccepted?: boolean;
}

export function evaluateStageCompletion(d: Decision, stage: Step = d.step): StageCompletion {
  const reasons: string[] = [];
  let complete = true;

  switch (stage) {
    case 'BRIEF': {
      if (!clean(d.brief?.decision)) {
        complete = false;
        reasons.push('Decision problem not formulated');
      }
      break;
    }
    case 'UNDERSTAND': {
      const unknowns = openUnknowns(d);
      const hasRadar = !!(d.radar?.facts?.length || d.radar?.assumptions?.length || d.radar?.unknowns?.length);
      if (!hasRadar && !(d.brief?.facts?.length || d.brief?.assumptions?.length)) {
        complete = false;
        reasons.push('No facts/assumptions/unknowns identified');
      }
      if (hasRadar && unknowns.length === 0 && !(d.radar?.unknowns?.length)) {
        // Not necessarily incomplete — user may have no critical unknowns
        reasons.push('No open critical unknowns (acceptable if none exist)');
      }
      break;
    }
    case 'EXPAND': {
      if ((d.options || []).length < 2) {
        complete = false;
        reasons.push('Fewer than two alternatives');
      }
      break;
    }
    case 'ATTACK': {
      const hasCritique =
        (d.redTeam || []).some((r) => (r.objections || []).length > 0) ||
        (d.preMortem?.causes || []).length > 0;
      if (!hasCritique) {
        complete = false;
        reasons.push('No substantive Red Team or Pre-Mortem challenge recorded');
      }
      break;
    }
    case 'TEST': {
      const ready = (d.experiments || []).filter((e) => e.status === 'READY' || e.lockedAt || e.status === 'COMPLETED');
      if ((d.hypotheses || []).some((h) => h.selectedByUser) && ready.length === 0) {
        complete = false;
        reasons.push('Selected hypotheses lack experiment cards');
      }
      break;
    }
    case 'DECIDE': {
      if (!d.decision?.whatIDecided && !d.decision?.kind) {
        complete = false;
        reasons.push('No decision recorded (user may postpone)');
      }
      break;
    }
    case 'SYNTHESIS': {
      const hasDoc = !!(d.synthesis?.paragraphs?.some(Boolean) || d.synthesis?.editedByUser);
      const ctr = d.contradictions?.length ? d.contradictions : detectContradictions(d);
      if (!hasDoc) {
        complete = false;
        reasons.push('No synthesis document');
      }
      if (ctr.length) {
        reasons.push(`${ctr.length} contradiction(s) still visible — must not be hidden`);
      }
      break;
    }
    default:
      break;
  }

  return { stage, complete, reasons };
}

// --- Recommendation quality checklist (P122.4 §8.2) ---

export interface RecommendationQuality {
  answersWhat: boolean;
  answersWhy: boolean;
  showsEvidence: boolean;
  showsAssumptions: boolean;
  showsRisks: boolean;
  showsAlternatives: boolean;
  showsWhatCouldMakeWrong: boolean;
  showsWhatWouldChange: boolean;
  showsNextSteps: boolean;
  canPostponeOrRefuse: boolean;
  score: number; // 0–10
  gaps: string[];
}

export function evaluateRecommendationQuality(d: Decision): RecommendationQuality {
  const doc = buildFinalDecisionDocument(d);
  const gaps: string[] = [];
  const answersWhat = !!clean(doc.recommendedOption) && doc.recommendedOption !== '(No recommendation recorded — user retains control)';
  const answersWhy = !!clean(doc.justification) && doc.justification.length > 20;
  const showsEvidence = doc.evidenceSummary.length > 0 || doc.verifiedFacts.length > 0 || doc.userProvidedUnverified.length > 0;
  const showsAssumptions = doc.assumptions.length > 0;
  const showsRisks = doc.risks.length > 0 || doc.redTeamFindings.length > 0;
  const showsAlternatives = doc.mainAlternatives.length > 0;
  const showsWhatCouldMakeWrong = doc.conditionsForChange.length > 0 || doc.criticalUncertainties.length > 0;
  const showsWhatWouldChange = doc.conditionsForChange.length > 0;
  const showsNextSteps = doc.implementationPlan.length > 0 || doc.validationMilestones.length > 0;
  const canPostponeOrRefuse =
    d.decision?.kind === 'POSTPONE' ||
    d.decision?.kind === 'REFUSE' ||
    d.decision?.kind === 'RUN_TESTS' ||
    true; // system supports these kinds

  if (!answersWhat) gaps.push('what');
  if (!answersWhy) gaps.push('why');
  if (!showsEvidence) gaps.push('evidence');
  if (!showsAssumptions) gaps.push('assumptions');
  if (!showsRisks) gaps.push('risks');
  if (!showsAlternatives) gaps.push('alternatives');
  if (!showsWhatCouldMakeWrong) gaps.push('what_could_make_wrong');
  if (!showsWhatWouldChange) gaps.push('what_would_change');
  if (!showsNextSteps) gaps.push('next_steps');

  const flags = [
    answersWhat,
    answersWhy,
    showsEvidence,
    showsAssumptions,
    showsRisks,
    showsAlternatives,
    showsWhatCouldMakeWrong,
    showsWhatWouldChange,
    showsNextSteps,
    canPostponeOrRefuse,
  ];
  const score = flags.filter(Boolean).length;

  return {
    answersWhat,
    answersWhy,
    showsEvidence,
    showsAssumptions,
    showsRisks,
    showsAlternatives,
    showsWhatCouldMakeWrong,
    showsWhatWouldChange,
    showsNextSteps,
    canPostponeOrRefuse,
    score,
    gaps,
  };
}

// --- Decision-quality rubric (P122.4 §8.9) ---

export type RubricScore = 0 | 1 | 2 | 3 | 4 | 5;

export interface RubricDimension {
  id: string;
  question: string;
  score: RubricScore;
  explanation: string;
}

export interface RubricResult {
  dimensions: RubricDimension[];
  average: number;
  criticalFailures: string[];
}

export function evaluateDecisionQualityRubric(d: Decision): RubricResult {
  const doc = buildFinalDecisionDocument(d);
  const integrity = summarizeAnalyticalIntegrity(d);
  const stageSyn = evaluateStageCompletion(d, 'SYNTHESIS');
  const rec = evaluateRecommendationQuality(d);
  const criticalFailures: string[] = [];

  const dim = (
    id: string,
    question: string,
    score: RubricScore,
    explanation: string,
    critical = false
  ): RubricDimension => {
    if (critical && score <= 1) criticalFailures.push(`${id}: ${explanation}`);
    return { id, question, score, explanation };
  };

  const dimensions: RubricDimension[] = [
    dim(
      'problem_understanding',
      'Did Expert understand the actual decision?',
      clean(doc.originalProblem) ? (clean(doc.decisionObjective) ? 4 : 3) : 1,
      clean(doc.originalProblem) ? 'Problem statement present' : 'Missing problem statement',
      true
    ),
    dim(
      'factual_integrity',
      'Were facts distinguished from assumptions?',
      integrity.assumptions > 0 || integrity.verifiedFacts + integrity.userProvidedFacts > 0
        ? integrity.unsupportedClaims === 0
          ? 4
          : 2
        : 1,
      `verified=${integrity.verifiedFacts} userProvided=${integrity.userProvidedFacts} assumptions=${integrity.assumptions} unsupported=${integrity.unsupportedClaims}`,
      true
    ),
    dim(
      'evidence_quality',
      'Were important claims supported?',
      doc.evidenceSummary.length > 0 ? 3 : integrity.userProvidedFacts > 0 ? 2 : 1,
      `evidence entries=${doc.evidenceSummary.length}`
    ),
    dim(
      'completeness',
      'Were important alternatives considered?',
      doc.mainAlternatives.length >= 3 ? 4 : doc.mainAlternatives.length >= 2 ? 3 : doc.mainAlternatives.length === 1 ? 2 : 0,
      `alternatives=${doc.mainAlternatives.length}`
    ),
    dim(
      'critical_reasoning',
      'Were weaknesses and counterarguments identified?',
      doc.redTeamFindings.length + doc.preMortemFindings.length >= 2
        ? 4
        : doc.redTeamFindings.length + doc.preMortemFindings.length >= 1
          ? 3
          : 1,
      `redTeam=${doc.redTeamFindings.length} preMortem=${doc.preMortemFindings.length}`
    ),
    dim(
      'consistency',
      'Were conclusions logically consistent?',
      (d.contradictions || detectContradictions(d)).length === 0 ? 4 : 2,
      `contradictions=${(d.contradictions || detectContradictions(d)).length}`
    ),
    dim(
      'uncertainty',
      'Were limitations and unknowns preserved?',
      doc.criticalUncertainties.length > 0 || doc.confidenceAndLimitations.length > 40 ? 4 : 2,
      `unknowns=${doc.importantUnknowns.length}`
    ),
    dim(
      'practicality',
      'Can the user act on the recommendation?',
      rec.showsNextSteps || doc.implementationPlan.length > 0 ? 4 : rec.answersWhat ? 2 : 1,
      `nextSteps=${doc.implementationPlan.length}`
    ),
    dim(
      'traceability',
      'Can the user understand why the recommendation was made?',
      rec.answersWhy && (rec.showsEvidence || rec.showsAssumptions) ? 4 : rec.answersWhy ? 2 : 1,
      rec.answersWhy ? 'justification present' : 'justification weak'
    ),
    dim(
      'user_control',
      'Does the user retain control?',
      doc.userRetainsControl ? 5 : 0,
      'Expert is decision-support, not autonomous authority',
      true
    ),
  ];

  const average =
    dimensions.reduce((s, x) => s + x.score, 0) / (dimensions.length || 1);

  return { dimensions, average, criticalFailures };
}

/** Render final document as plain-text sections for export / display. */
export function finalDocumentToText(doc: FinalDecisionDocument): string {
  const lines: string[] = [];
  const section = (title: string, body: string | string[]) => {
    if (Array.isArray(body)) {
      if (!body.length) return;
      lines.push(`## ${title}`);
      for (const b of body) lines.push(`- ${b}`);
      lines.push('');
    } else {
      if (!clean(body)) return;
      lines.push(`## ${title}`);
      lines.push(body);
      lines.push('');
    }
  };
  section('Executive summary', doc.executiveSummary);
  section('Original decision problem', doc.originalProblem);
  section('Decision objective', doc.decisionObjective);
  section('Constraints', doc.constraints);
  section('Verified facts', doc.verifiedFacts);
  section('User-provided (unverified)', doc.userProvidedUnverified);
  section('Assumptions', doc.assumptions);
  section('Interpretations', doc.interpretations);
  section('Important unknowns', doc.importantUnknowns);
  section('Evidence summary', doc.evidenceSummary);
  if (doc.mainAlternatives.length) {
    lines.push('## Main alternatives');
    for (const a of doc.mainAlternatives) {
      lines.push(`- ${a.title}: ${a.description} (door=${a.door})`);
    }
    lines.push('');
  }
  section('Comparison of alternatives', doc.comparisonOfAlternatives);
  section('Benefits', doc.benefits);
  section('Costs', doc.costs);
  section('Risks', doc.risks);
  section('Red Team findings', doc.redTeamFindings);
  section('Pre-Mortem findings', doc.preMortemFindings);
  section('Critical uncertainties', doc.criticalUncertainties);
  section('Numerical calculations', doc.numericalCalculations);
  section('Recommended option', doc.recommendedOption);
  section('Justification', doc.justification);
  section('Reasons for rejecting other options', doc.reasonsForRejectingOthers);
  section('Conditions under which the recommendation changes', doc.conditionsForChange);
  section('Implementation plan', doc.implementationPlan);
  section('Validation milestones', doc.validationMilestones);
  section('Success criteria', doc.successCriteria);
  section('Contingency plan', doc.contingencyPlan);
  section('Unresolved questions', doc.unresolvedQuestions);
  section('Confidence and limitations', doc.confidenceAndLimitations);
  lines.push('## User control');
  lines.push('This is decision support. The user retains final authority over the decision.');
  lines.push('');
  return lines.join('\n');
}
