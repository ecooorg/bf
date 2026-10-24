import test from 'node:test';
import assert from 'node:assert/strict';
import { assessContextCompleteness, validateCompletenessEvidence } from '../scripts/contextCompletenessGuardLib.mjs';

function completeInputs(overrides = {}) {
  const criterion = { id: 'AC-01', text: 'Requested behavior works.', status: 'PASS', source: 'observed_execution_evidence', evidence: [{ ref: 'ci://run/123' }] };
  return {
    taskContext: { classification: { completeness: 'COMPLETE' }, uncertainties: [] },
    impact: { status: 'COMPLETE', generatedArtifacts: {}, uncertainties: [] },
    verificationPlan: { testChain: { errors: [] }, requiredFullGates: [{ command: 'npm run check' }, { command: 'npm run build' }, { name: 'GitHub Actions required workflow', status: 'NOT_RUN' }] },
    intentContract: { goal: { text: 'Fix the task' }, acceptanceCriteria: [criterion] },
    verificationEvidence: {
      checks: [
        { command: 'npm run check', status: 'PASS', source: 'observed_execution_evidence', logRef: 'ci://run/123/check' },
        { command: 'npm run build', status: 'PASS', source: 'observed_execution_evidence', logRef: 'ci://run/123/build' },
        { name: 'GitHub Actions required workflow', status: 'PASS', source: 'observed_execution_evidence', logRef: 'ci://run/123' },
      ],
      criteria: [], expectedDependencies: [], observedDependencies: [], resolvedIssues: [],
    },
    ...overrides,
  };
}

test('P91: scoped COMPLETE requires supplied plans, passing criteria and traceable required checks', () => {
  const report = assessContextCompleteness(completeInputs());
  assert.equal(report.status, 'COMPLETE');
  assert.equal(report.issueCount, 0);
});

test('P91: missing sources yield UNVERIFIED, not PASS', () => {
  const report = assessContextCompleteness({});
  assert.equal(report.status, 'UNVERIFIED');
  assert.ok(report.issues.some((x) => x.code === 'P85_CONTEXT_UNAVAILABLE'));
  assert.ok(report.issues.some((x) => x.code === 'P91_EXECUTION_EVIDENCE_MISSING'));
});

test('P91: an expected dependency absent from observed dependencies blocks COMPLETE', () => {
  const input = completeInputs();
  input.verificationEvidence.expectedDependencies = ['server/artifactRepository.ts'];
  input.verificationEvidence.observedDependencies = [];
  const report = assessContextCompleteness(input);
  assert.notEqual(report.status, 'COMPLETE');
  assert.ok(report.issues.some((x) => x.code === 'P91_GOLD_DEPENDENCY_MISSING'));
});

test('P91: reviewed note cannot hide a missing known gold dependency', () => {
  const input = completeInputs();
  input.verificationEvidence.expectedDependencies = ['server/artifactRepository.ts'];
  input.verificationEvidence.observedDependencies = [];
  input.verificationEvidence.resolvedIssues = [{ code: 'P91_GOLD_DEPENDENCY_MISSING', missingEvidence: 'Expected dependency is absent from observedDependencies.', source: 'human_review', reference: 'review://PR-42/dependencies', note: 'Noted for follow-up.' }];
  const report = assessContextCompleteness(input);
  assert.notEqual(report.status, 'COMPLETE');
  assert.ok(report.issues.some((x) => x.code === 'P91_GOLD_DEPENDENCY_MISSING'));
});

test('P91: PASS without observed execution reference is rejected as evidence', () => {
  const input = completeInputs();
  input.verificationEvidence.checks[0] = { command: 'npm run check', status: 'PASS', source: 'planner' };
  const report = assessContextCompleteness(input);
  assert.notEqual(report.status, 'COMPLETE');
  assert.ok(report.issues.some((x) => x.code === 'P91_REQUIRED_CHECK_NOT_PROVEN'));
  assert.ok(report.issues.some((x) => x.code === 'P91_UNSUPPORTED_PASS_CLAIM'));
});

test('P91: hosted CI remains a required gate and cannot be inferred from local checks', () => {
  const input = completeInputs();
  input.verificationEvidence.checks = input.verificationEvidence.checks.filter((item) => item.name !== 'GitHub Actions required workflow');
  const report = assessContextCompleteness(input);
  assert.notEqual(report.status, 'COMPLETE');
  assert.ok(report.issues.some((x) => x.code === 'P91_REQUIRED_CHECK_NOT_PROVEN' && x.consequence.includes('GitHub Actions')));
});

test('P91: unresolved acceptance criterion keeps the report partial', () => {
  const input = completeInputs();
  input.intentContract.acceptanceCriteria[0].status = 'UNVERIFIED';
  const report = assessContextCompleteness(input);
  assert.equal(report.status, 'PARTIAL');
  assert.ok(report.issues.some((x) => x.code === 'P89_CRITERION_UNVERIFIED'));
});

test('P91: stale generated artifact is material uncertainty', () => {
  const input = completeInputs();
  input.impact.generatedArtifacts = { 'docs/generated-route-inventory.json': { status: 'STALE' } };
  const report = assessContextCompleteness(input);
  assert.notEqual(report.status, 'COMPLETE');
  assert.ok(report.issues.some((x) => x.code === 'P86_ARTIFACT_STALE'));
});

test('P91: a referenced human review can resolve a declared issue without erasing its trace', () => {
  const input = completeInputs();
  input.taskContext.classification.completeness = 'PARTIAL';
  input.taskContext.uncertainties = ['Static call mapping needs review.'];
  input.verificationEvidence.resolvedIssues = [{ code: 'P85_SCOPE_NOT_COMPLETE', missingEvidence: 'P85 reports completeness=PARTIAL.', source: 'human_review', reference: 'review://PR-42/context', note: 'Reviewed the declared file scope against the request.' }];
  const report = assessContextCompleteness(input);
  assert.equal(report.resolvedIssueCount, 1);
  assert.ok(report.resolutions.some((x) => x.reference === 'review://PR-42/context'));
  assert.ok(report.issues.some((x) => x.code === 'P85_UNRESOLVED_CONTEXT'));
});

test('P91: evidence schema rejects untraceable resolution claims', () => {
  const validation = validateCompletenessEvidence({ resolvedIssues: [{ code: 'P85_SCOPE_NOT_COMPLETE', source: 'handwave' }] });
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((x) => x.includes('source')));
  assert.ok(validation.errors.some((x) => x.includes('reference')));
  assert.ok(validation.errors.some((x) => x.includes('note')));
});

test('P91: evidence schema requires observed check fields', () => {
  const validation = validateCompletenessEvidence({ checks: [{ status: 'PASS' }] });
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((x) => x.includes('command')));
});
