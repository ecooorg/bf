import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIntentDiff, draftIntentContract, validateIntentContract } from '../scripts/intentContractLib.mjs';

const scripts = { check: 'npm run test:intent-contract', build: 'vite build', 'test:security': 'node tests/security.test.mjs', 'test:project': 'node tests/project.test.mjs' };

test('P89: creates a draft and separates user goal from inferred criteria', () => {
  const result = draftIntentContract({ task: 'Fix Project Mode ZIP download', changedFiles: ['server/projectRoutes.ts'], verification: [{ script: 'check', required: true, status: 'REQUIRED_NOT_RUN', source: 'P87_required_gate' }], scripts });
  assert.equal(result.kind, 'biforge-intent-contract');
  assert.equal(result.status, 'DRAFT_NOT_APPROVED');
  assert.equal(result.goal.source, 'user_request');
  assert.equal(result.acceptanceCriteria[0].source, 'inferred_draft');
  assert.equal(result.acceptanceCriteria[0].status, 'UNVERIFIED');
  assert.ok(result.requiredInvariants.some((x) => x.source === 'inferred_repository_risk'));
  assert.ok(result.requiredVerification.some((x) => x.command === 'npm run check'));
});

test('P89: explicit acceptance criteria are preserved and replace inferred criterion', () => {
  const result = draftIntentContract({ task: 'Add export', acceptanceCriteria: ['Exported ZIP is non-empty.', 'Download response includes content length.'], scripts });
  assert.deepEqual(result.acceptanceCriteria.map((x) => x.text), ['Exported ZIP is non-empty.', 'Download response includes content length.']);
  assert.ok(result.acceptanceCriteria.every((x) => x.source === 'explicit_user_input'));
});

test('P89: empty goal and empty criteria are rejected by contract validator', () => {
  const result = validateIntentContract({ schemaVersion: 1, kind: 'biforge-intent-contract', goal: { text: '' }, acceptanceCriteria: [], requiredVerification: [] }, { scripts });
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((x) => x.includes('Goal is required')));
  assert.ok(result.errors.some((x) => x.includes('At least one acceptance criterion')));
});

test('P89: high-impact task without explicit criteria raises a review flag', () => {
  const result = draftIntentContract({ task: 'Change database migration and authorization', scripts });
  assert.ok(result.openQuestions.some((x) => x.includes('High-impact boundary')));
});

test('P89: unknown verification script is rejected, not silently suggested', () => {
  const result = draftIntentContract({ task: 'Review change', verification: [{ script: 'test:does-not-exist' }], scripts });
  assert.ok(result.validation.errors.some((x) => x.includes('Unknown verification command: test:does-not-exist')));
  assert.equal(result.status, 'DRAFT_INVALID');
});

test('P89: allowed and out-of-scope overlap is a scope conflict', () => {
  const result = draftIntentContract({ task: 'Update route', changedFiles: ['server/projectRoutes.ts'], outOfScope: ['server/projectRoutes.ts'], scripts });
  assert.ok(result.validation.errors.some((x) => x.includes('Scope conflict')));
});

test('P89: incompatible invariants are detected', () => {
  const result = draftIntentContract({ task: 'Change API', requiredInvariants: ['Preserve API compatibility', 'Allow breaking API changes'], scripts });
  assert.ok(result.validation.errors.some((x) => x.includes('Conflicting invariants')));
});

test('P89: an unsupported PASS claim is warned against', () => {
  const result = validateIntentContract({ schemaVersion: 1, kind: 'biforge-intent-contract', status: 'DRAFT_NOT_APPROVED', goal: { text: 'Fix issue' }, acceptanceCriteria: [{ id: 'AC-01', text: 'Works', source: 'explicit_user_input' }], requiredVerification: [{ script: 'test:project', status: 'PASS', source: 'P87_verification_planner' }] }, { scripts });
  assert.equal(result.status, 'PASS_WITH_WARNINGS');
  assert.ok(result.warnings.some((x) => x.includes('without an execution-evidence source')));
});

test('P89: intent diff defaults to UNVERIFIED and only uses supplied evidence states', () => {
  const contract = draftIntentContract({ task: 'Fix issue', acceptanceCriteria: ['No empty ZIP is returned.'], scripts });
  assert.deepEqual(buildIntentDiff(contract, { 'AC-01': 'PASS' }).map((x) => x.status), ['PASS']);
  assert.deepEqual(buildIntentDiff(contract).map((x) => x.status), ['UNVERIFIED']);
});

test('P89: context and impact references are linked without duplicating evidence', () => {
  const result = draftIntentContract({ task: 'Fix route', contextPlanRef: 'context-plan.json', impactEvidenceRef: 'impact-report.json', scripts });
  assert.deepEqual(result.references, { contextPlan: 'context-plan.json', impactEvidence: 'impact-report.json' });
});

test('P89: changed-area paths are normalized, deduplicated, and sorted', () => {
  const result = draftIntentContract({ task: 'Fix route', changedFiles: ['./server/z.ts', 'server\\a.ts', 'server/z.ts'], scripts });
  assert.deepEqual(result.scope.allowedAreas, ['server/a.ts', 'server/z.ts']);
});

test('P89: malformed non-object contract fails safely', () => {
  const result = validateIntentContract(null, { scripts });
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors[0].includes('JSON object'));
});

test('P89: unavailable P85/P86 evidence is explicit rather than treated as complete', () => {
  const result = draftIntentContract({ task: 'Review a change', scripts });
  assert.equal(result.contextEvidence.status, 'UNAVAILABLE');
  assert.equal(result.impactEvidence.status, 'UNAVAILABLE');
  assert.equal(result.references.contextPlan, null);
  assert.equal(result.references.impactEvidence, null);
});

test('P89: available but partial context and impact retain their uncertainty', () => {
  const result = draftIntentContract({
    task: 'Fix route', scripts,
    contextSummary: { status: 'AVAILABLE', completeness: 'PARTIAL', matchedFeatures: ['api-contract'], candidateFiles: ['server.ts'], uncertainties: ['Dynamic route wiring unknown.'] },
    impactSummary: { status: 'PARTIAL', sourceStatus: 'AVAILABLE', impactedSurfaces: ['server.ts'], uncertainties: ['Dynamic import not traced.'] },
  });
  assert.equal(result.contextEvidence.completeness, 'PARTIAL');
  assert.deepEqual(result.contextEvidence.uncertainties, ['Dynamic route wiring unknown.']);
  assert.equal(result.impactEvidence.status, 'PARTIAL');
  assert.deepEqual(result.impactEvidence.uncertainties, ['Dynamic import not traced.']);
});
