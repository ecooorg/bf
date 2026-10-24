/** P91: scoped completeness guard. Missing evidence never becomes PASS. */

const NON_COMPLETE = new Set(['UNKNOWN', 'UNAVAILABLE', 'MISSING', 'INVALID', 'STALE', 'PARTIAL', 'UNVERIFIED', 'NOT_RUN', 'SUGGESTED_NOT_RUN', 'BLOCKED', 'FAIL']);
const NON_RESOLVABLE_CODES = new Set(['P91_GOLD_DEPENDENCY_MISSING', 'P91_REQUIRED_CHECK_NOT_PROVEN', 'P91_UNSUPPORTED_PASS_CLAIM']);
const clean = (value) => String(value ?? '').trim();
const list = (value) => Array.isArray(value) ? value : [];

function issue(code, severity, consequence, missingEvidence, nextAction, source = 'P91 rule') {
  return { code, severity, consequence, missingEvidence, nextAction, source };
}

function evidenceStatus(item) {
  return clean(typeof item === 'string' ? item : item?.status).toUpperCase().replace(/[ -]+/g, '_');
}

function hasExecutionEvidence(item) {
  if (!item || typeof item !== 'object') return false;
  const source = clean(item.source).toLowerCase();
  const refs = list(item.evidence).length || clean(item.logRef) || clean(item.runId) || clean(item.command);
  return source === 'observed_execution_evidence' && Boolean(refs);
}

/**
 * verificationEvidence format:
 * { checks:[{command,status:'PASS',source:'observed_execution_evidence',logRef:'...'}],
 *   criteria:[{id,status:'PASS',source:'observed_execution_evidence',evidence:[{ref:'...'}]}],
 *   expectedDependencies:['path'], observedDependencies:['path'] }
 */
export function assessContextCompleteness({ taskContext = null, impact = null, verificationPlan = null, intentContract = null, verificationEvidence = null, expectedDependencies = [] } = {}) {
  const issues = [];
  const evidence = verificationEvidence && typeof verificationEvidence === 'object' && !Array.isArray(verificationEvidence) ? verificationEvidence : null;
  const declaredExpected = [...new Set([...list(expectedDependencies), ...list(evidence?.expectedDependencies)].map(clean).filter(Boolean))].sort();
  const observed = new Set(list(evidence?.observedDependencies).map(clean).filter(Boolean));

  if (!taskContext) issues.push(issue('P85_CONTEXT_UNAVAILABLE', 'material', 'Relevant files or contracts may be omitted from the plan.', 'P85 task-context output is absent.', 'Run the task-context planner and inspect its candidate files.'));
  else {
    const completeness = clean(taskContext.classification?.completeness || taskContext.completeness || 'UNKNOWN').toUpperCase();
    const reviewed = evidence?.scopeReview?.taskContext;
    if ((NON_COMPLETE.has(completeness) || completeness !== 'COMPLETE') && !(clean(reviewed?.status).toUpperCase() === 'COMPLETE' && clean(reviewed?.source) && clean(reviewed?.reference))) {
      issues.push(issue('P85_SCOPE_NOT_COMPLETE', 'material', 'Static task mapping may omit a relevant area.', `P85 reports completeness=${completeness}.`, 'Review candidate files and explicitly record any uncovered area.'));
    }
    if (list(taskContext.uncertainties).length && !(clean(evidence?.scopeReview?.taskContext?.status).toUpperCase() === 'COMPLETE' && clean(evidence?.scopeReview?.taskContext?.source) && clean(evidence?.scopeReview?.taskContext?.reference))) issues.push(issue('P85_UNRESOLVED_CONTEXT', 'material', 'One or more task-context assumptions remain unresolved.', list(taskContext.uncertainties).slice(0, 5).join(' '), 'Resolve material uncertainties or explicitly mark the scope as partial.'));
  }

  if (!impact) issues.push(issue('P86_IMPACT_UNAVAILABLE', 'material', 'Downstream consumers or generated artifacts may be missed.', 'P86 impact-lineage output is absent.', 'Run impact:lineage for the changed files.'));
  else {
    const status = clean(impact.status || 'UNKNOWN').toUpperCase();
    const reviewed = evidence?.scopeReview?.impact;
    if ((NON_COMPLETE.has(status) || status !== 'COMPLETE') && !(clean(reviewed?.status).toUpperCase() === 'COMPLETE' && clean(reviewed?.source) && clean(reviewed?.reference))) issues.push(issue('P86_IMPACT_NOT_COMPLETE', 'material', 'The known impact graph may be incomplete.', `P86 status=${status}.`, 'Review the impact graph and resolve or acknowledge dynamic/unmapped relationships.'));
    for (const [file, artifact] of Object.entries(impact.generatedArtifacts || {})) {
      const artifactState = clean(artifact?.status || 'UNKNOWN').toUpperCase();
      if (artifactState !== 'PRESENT' && artifactState !== 'HEALTHY') issues.push(issue('P86_ARTIFACT_' + artifactState, 'material', `Generated artifact ${file} may be missing, stale or invalid.`, `${file} status=${artifactState}.`, 'Run the documented generator and its verification checks.'));
    }
    if (list(impact.uncertainties).length && !(clean(evidence?.scopeReview?.impact?.status).toUpperCase() === 'COMPLETE' && clean(evidence?.scopeReview?.impact?.source) && clean(evidence?.scopeReview?.impact?.reference))) issues.push(issue('P86_UNRESOLVED_LINEAGE', 'material', 'Static lineage cannot confirm all runtime relationships.', list(impact.uncertainties).slice(0, 5).join(' '), 'Inspect unresolved edges and add explicit evidence where needed.'));
  }

  if (!verificationPlan) issues.push(issue('P87_PLAN_UNAVAILABLE', 'material', 'Required checks may not be identified.', 'P87 verification plan is absent.', 'Generate a verification plan for the task and changed files.'));
  else {
    const chainErrors = list(verificationPlan.testChainErrors || verificationPlan.chainErrors);
    if (chainErrors.length) issues.push(issue('P87_TEST_CHAIN_GAP', 'material', 'A test or verification script may not run in the repository check chain.', chainErrors.join(' '), 'Fix the check chain or document the existing explicit CI step.'));
    const required = list(verificationPlan.requiredFullGates).filter((x) => x.required !== false);
    const reviewed = evidence?.scopeReview?.verificationPlan;
    if (!required.length && !(clean(reviewed?.status).toUpperCase() === 'COMPLETE' && clean(reviewed?.source) && clean(reviewed?.reference))) issues.push(issue('P87_REQUIRED_GATES_UNKNOWN', 'material', 'Mandatory verification scope is not established.', 'No required full gates were supplied by P87.', 'Review the verification plan and identify the repository-required gates.'));
  }

  if (!intentContract) issues.push(issue('P89_INTENT_UNAVAILABLE', 'material', 'The intended outcome and acceptance criteria may be underspecified.', 'P89 intent contract is absent.', 'Draft or review an intent contract and acceptance criteria.'));
  else {
    if (!clean(intentContract.goal?.text)) issues.push(issue('P89_GOAL_MISSING', 'material', 'There is no explicit goal to compare against the result.', 'Intent contract goal is empty.', 'State the requested outcome in one observable sentence.'));
    const criteria = list(intentContract.acceptanceCriteria);
    if (!criteria.length) issues.push(issue('P89_CRITERIA_MISSING', 'material', 'The intended behavior cannot be checked against acceptance criteria.', 'No acceptance criteria are present.', 'Add observable criteria and review inferred criteria.'));
    for (const criterion of criteria) {
      const status = evidenceStatus(criterion);
      if (status !== 'PASS' || !hasExecutionEvidence(criterion)) {
        issues.push(issue('P89_CRITERION_UNVERIFIED', 'material', `Acceptance criterion ${criterion.id || '(missing id)'} is not supported by observed verification evidence.`, `Criterion status=${status || 'UNKNOWN'}; execution evidence=${hasExecutionEvidence(criterion) ? 'present' : 'absent'}.`, 'Run a relevant check or human-reviewed behavior test and attach its evidence reference.'));
      }
    }
  }

  if (!evidence) {
    issues.push(issue('P91_EXECUTION_EVIDENCE_MISSING', 'material', 'The plan may be complete on paper but actual checks have not been evidenced.', 'No verification-evidence JSON was supplied.', 'Provide observed command results and acceptance-criterion evidence; do not infer PASS from suggestions.'));
  } else {
    const checks = list(evidence.checks);
    const requiredGates = list(verificationPlan?.requiredFullGates).filter((x) => x.required !== false).map((x) => ({ label: clean(x.command || x.name), matchKeys: [clean(x.command), clean(x.name)].filter(Boolean) })).filter((x) => x.label);
    if (!checks.length) issues.push(issue('P91_CHECK_EVIDENCE_MISSING', 'material', 'No actual verification runs are recorded.', 'verificationEvidence.checks is empty.', 'Record required checks with status, source and a log/run reference.'));
    for (const gate of requiredGates) {
      const match = checks.find((item) => gate.matchKeys.includes(clean(item.command)) || gate.matchKeys.includes(clean(item.name)));
      if (!match || evidenceStatus(match) !== 'PASS' || !hasExecutionEvidence(match)) {
        issues.push(issue('P91_REQUIRED_CHECK_NOT_PROVEN', 'material', `Required check ${gate.label} cannot be treated as passed.`, match ? `status=${evidenceStatus(match) || 'UNKNOWN'} or execution evidence missing.` : 'No matching check record.', 'Run the required check (including hosted CI where required) and attach observed execution evidence.'));
      }
    }
    for (const check of checks) {
      if (evidenceStatus(check) === 'PASS' && !hasExecutionEvidence(check)) issues.push(issue('P91_UNSUPPORTED_PASS_CLAIM', 'material', `Check ${clean(check.command) || '(unnamed)'} claims PASS without traceable execution evidence.`, 'The record lacks source=observed_execution_evidence and a reference.', 'Attach a CI/log/run reference or downgrade the status.'));
    }
  }

  const missingDependencies = declaredExpected.filter((dependency) => !observed.has(dependency));
  for (const dependency of missingDependencies) {
    issues.push(issue('P91_GOLD_DEPENDENCY_MISSING', 'material', `Expected dependency ${dependency} is not accounted for.`, 'Expected dependency is absent from observedDependencies.', 'Inspect the dependency mapping and either supply evidence or correct the reviewed expected set.'));
  }

  const resolutionKey = (item) => `${clean(item.code)}\u0000${clean(item.missingEvidence)}`;
  const resolutions = new Map(list(evidence?.resolvedIssues).filter((r) => clean(r.code) && clean(r.missingEvidence) && clean(r.source) && clean(r.reference) && clean(r.note)).map((r) => [resolutionKey(r), r]));
  const unresolved = issues.filter((x) => NON_RESOLVABLE_CODES.has(x.code) || !resolutions.has(resolutionKey(x)));
  const deduped = [...new Map(unresolved.map((x) => [`${x.code}:${x.missingEvidence}`, x])).values()];
  const status = deduped.length === 0 ? 'COMPLETE' : deduped.some((x) => x.severity === 'material') ? (taskContext && impact && verificationPlan && intentContract && evidence ? 'PARTIAL' : 'UNVERIFIED') : 'PARTIAL';
  return {
    schemaVersion: 1,
    kind: 'biforge-context-completeness',
    status,
    scope: 'Declared task and supplied evidence only; not a proof of whole-application completeness or correctness.',
    summary: status === 'COMPLETE'
      ? 'All required links in this declared scenario have supplied, traceable evidence under the current rules.'
      : status === 'PARTIAL'
        ? `${deduped.length} material evidence gap(s) remain; do not report overall success as fully verified.`
        : `${deduped.length} material evidence gap(s) remain and one or more required evidence sources are unavailable; completeness is unverified.`,
    issueCount: deduped.length,
    issues: deduped,
    expectedDependencies: declaredExpected,
    missingExpectedDependencies: missingDependencies,
    resolvedIssueCount: issues.length - deduped.length,
    resolutions: [...resolutions.values()].map((r) => ({ code: clean(r.code), missingEvidence: clean(r.missingEvidence), source: clean(r.source), reference: clean(r.reference), note: clean(r.note) })),
    evidenceSources: {
      taskContext: taskContext ? 'supplied' : 'missing',
      impact: impact ? 'supplied' : 'missing',
      verificationPlan: verificationPlan ? 'supplied' : 'missing',
      intentContract: intentContract ? 'supplied' : 'missing',
      executionEvidence: evidence ? 'supplied' : 'missing',
    },
    notes: [
      'A missing detected relationship is not proof that no relationship exists.',
      'Suggested commands are not execution evidence; PASS requires a traceable observed result.',
      'COMPLETE is scoped to this declared scenario and validated rule coverage only.',
    ],
  };
}

export function validateCompletenessEvidence(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { valid: false, errors: ['Evidence must be a JSON object.'] };
  for (const field of ['checks', 'criteria', 'expectedDependencies', 'observedDependencies', 'resolvedIssues']) {
    if (value[field] !== undefined && !Array.isArray(value[field])) errors.push(`${field} must be an array when supplied.`);
  }
  for (const [index, check] of list(value.checks).entries()) {
    if (!clean(check?.command)) errors.push(`checks[${index}].command is required.`);
    if (!clean(check?.status)) errors.push(`checks[${index}].status is required.`);
  }
  for (const [index, resolution] of list(value.resolvedIssues).entries()) {
    if (!clean(resolution?.code)) errors.push(`resolvedIssues[${index}].code is required.`);
    if (!clean(resolution?.missingEvidence)) errors.push(`resolvedIssues[${index}].missingEvidence is required to resolve only the matching issue.`);
    if (!['human_review', 'observed_execution_evidence', 'repository_evidence'].includes(clean(resolution?.source))) errors.push(`resolvedIssues[${index}].source must identify a supported evidence type.`);
    if (!clean(resolution?.reference)) errors.push(`resolvedIssues[${index}].reference is required.`);
    if (!clean(resolution?.note)) errors.push(`resolvedIssues[${index}].note is required.`);
  }
  if (value.scopeReview !== undefined) {
    if (!value.scopeReview || typeof value.scopeReview !== 'object' || Array.isArray(value.scopeReview)) errors.push('scopeReview must be an object.');
    else for (const field of ['taskContext', 'impact', 'verificationPlan']) {
      const item = value.scopeReview[field];
      if (item && (clean(item.status).toUpperCase() !== 'COMPLETE' || !clean(item.source) || !clean(item.reference))) errors.push(`scopeReview.${field} requires status COMPLETE, source and reference.`);
    }
  }
  return { valid: errors.length === 0, errors };
}
