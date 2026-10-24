/** P89 draft-only intent contract builder/validator. No model calls or side effects. */

const HIGH_RISK = /\b(auth(?:entication|orization)?|security|secret|credential|database|migration|payment|billing|delete|destructive|external integration|production data|permission)\b/i;
const INVARIANT_RULES = [
  { id: 'security', pattern: /\b(auth|authorization|authentication|security|secret|credential|permission)\b/i, text: 'Preserve existing authentication, authorization, and secret-handling guarantees.' },
  { id: 'compatibility', pattern: /\b(api|endpoint|compatib|client|backward|breaking change)\b/i, text: 'Preserve documented API compatibility unless a breaking change is explicitly requested.' },
  { id: 'persistence', pattern: /\b(database|migration|persist|artifact|ledger|storage|download|zip|archive)\b/i, text: 'Preserve data integrity and report incomplete persistence or delivery as failure, not success.' },
  { id: 'ui', pattern: /\b(ui|user interface|screen|button|visible text|guide|copy)\b/i, text: 'Preserve unrelated user-visible behavior and accessibility expectations.' },
];

function clean(value) { return String(value ?? '').trim().replace(/\s+/g, ' '); }
function uniqueClean(values = []) { return [...new Set(values.map(clean).filter(Boolean))]; }
function normalizePath(value) { return clean(value).replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, ''); }

export function draftIntentContract({
  task = '', changedFiles = [], outOfScope = [], requiredInvariants = [], acceptanceCriteria = [],
  verification = [], contextPlanRef = null, impactEvidenceRef = null, contextSummary = null, impactSummary = null, scripts = {}, evidence = {},
} = {}) {
  const goal = clean(task);
  const files = [...new Set(changedFiles.map(normalizePath).filter(Boolean))].sort();
  const explicitOutOfScope = uniqueClean(outOfScope);
  const explicitInvariants = uniqueClean(requiredInvariants);
  const explicitCriteria = uniqueClean(acceptanceCriteria);
  const inferredInvariants = INVARIANT_RULES.filter((rule) => rule.pattern.test(`${goal} ${files.join(' ')}`));
  const invariantItems = [
    ...explicitInvariants.map((text) => ({ id: `inv-explicit-${stableId(text)}`, text, source: 'explicit_user_input' })),
    ...inferredInvariants.filter((rule) => !explicitInvariants.some((text) => text.toLowerCase() === rule.text.toLowerCase()))
      .map((rule) => ({ id: `inv-inferred-${rule.id}`, text: rule.text, source: 'inferred_repository_risk' })),
  ];
  const inferredCriteria = explicitCriteria.length ? [] : [inferCriterion(goal)];
  const criteriaItems = [
    ...explicitCriteria.map((text, i) => ({ id: `AC-${String(i + 1).padStart(2, '0')}`, text, source: 'explicit_user_input', status: 'UNVERIFIED', evidence: [] })),
    ...inferredCriteria.map((text, i) => ({ id: `AC-I${i + 1}`, text, source: 'inferred_draft', status: 'UNVERIFIED', evidence: [] })),
  ];
  const verificationItems = verification.map((item) => {
    const raw = clean(item.script || item.command || item.name);
    const isNpmScript = Boolean(item.script) || /^npm run\s+/.test(raw);
    const name = isNpmScript ? raw.replace(/^npm run\s+/, '') : '';
    const known = !isNpmScript || Boolean(scripts[name]);
    return {
      command: name ? `npm run ${name}` : clean(item.command || item.name),
      script: name || null,
      source: item.source || 'P87_verification_planner',
      required: Boolean(item.required),
      status: item.status || (known ? 'SUGGESTED_NOT_RUN' : 'UNKNOWN_COMMAND'),
      knownCommand: known,
      reason: clean(item.reason),
    };
  });
  const openQuestions = [];
  if (HIGH_RISK.test(`${goal} ${files.join(' ')}`) && explicitCriteria.length === 0) {
    openQuestions.push('High-impact boundary needs human review: confirm the intended compatibility, authorization, or data-safety outcome before accepting implementation.');
  }
  if (!files.length) openQuestions.push('Changed areas are not specified; P85/P86 context and impact references remain unavailable until supplied.');
  const contract = {
    schemaVersion: 1,
    kind: 'biforge-intent-contract',
    status: 'DRAFT_NOT_APPROVED',
    generatedBy: 'P89 deterministic draft builder',
    goal: { text: goal, source: 'user_request' },
    scope: {
      changedAreas: files.map((path) => ({ path, source: 'user_supplied_candidate' })),
      allowedAreas: files,
      outOfScope: explicitOutOfScope.map((text) => ({ text, source: 'explicit_user_input' })),
    },
    requiredInvariants: invariantItems,
    acceptanceCriteria: criteriaItems,
    requiredVerification: verificationItems,
    assumptions: inferredInvariants.map((rule) => ({ text: `Potentially relevant invariant: ${rule.text}`, source: 'inferred_repository_risk', status: 'REVIEW_DRAFT' })),
    openQuestions,
    references: {
      contextPlan: contextPlanRef ? clean(contextPlanRef) : null,
      impactEvidence: impactEvidenceRef ? clean(impactEvidenceRef) : null,
    },
    contextEvidence: contextSummary && typeof contextSummary === 'object' ? { source: 'P85', status: contextSummary.status || 'AVAILABLE', completeness: contextSummary.completeness || 'UNKNOWN', matchedFeatures: contextSummary.matchedFeatures || [], candidateFiles: contextSummary.candidateFiles || [], uncertainties: contextSummary.uncertainties || [] } : { source: 'P85', status: 'UNAVAILABLE', uncertainties: ['P85 context plan could not be generated in this environment.'] },
    impactEvidence: impactSummary && typeof impactSummary === 'object' ? { source: 'P86', status: impactSummary.sourceStatus === 'UNAVAILABLE' ? 'UNAVAILABLE' : (impactSummary.status || 'UNKNOWN'), impactedSurfaces: impactSummary.impactedSurfaces || [], uncertainties: impactSummary.uncertainties || [] } : { source: 'P86', status: 'UNAVAILABLE', uncertainties: ['P86 impact evidence could not be generated; provide changed file paths and ensure P86 is installed.'] },
    intentDiff: criteriaItems.map((criterion) => ({ criterionId: criterion.id, criterion: criterion.text, status: evidence[criterion.id] ? normalizeEvidence(evidence[criterion.id]) : 'UNVERIFIED', evidence: [] })),
    notes: [
      'Draft only: inferred criteria and invariants are not user-approved requirements.',
      'Suggested verification is not execution evidence; statuses remain NOT RUN unless actual evidence is supplied.',
      'Candidate changed areas are not a hard prohibition against discovering required dependencies.',
    ],
  };
  contract.validation = validateIntentContract(contract, { scripts });
  contract.status = contract.validation.errors.length ? 'DRAFT_INVALID' : 'DRAFT_NOT_APPROVED';
  return contract;
}

export function validateIntentContract(contract, { scripts = {} } = {}) {
  const errors = [];
  const warnings = [];
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) return { status: 'FAIL', errors: ['Contract must be a JSON object.'], warnings: [] };
  if (contract.schemaVersion !== 1 || contract.kind !== 'biforge-intent-contract') errors.push('Unsupported or missing contract schemaVersion/kind.');
  if (!clean(contract.goal?.text)) errors.push('Goal is required and must be non-empty.');
  if (!Array.isArray(contract.acceptanceCriteria) || contract.acceptanceCriteria.length === 0) errors.push('At least one acceptance criterion is required.');
  for (const criterion of contract.acceptanceCriteria || []) {
    if (!clean(criterion.text)) errors.push(`Acceptance criterion ${criterion.id || '(missing id)'} has empty text.`);
  }
  const scopes = (contract.scope?.outOfScope || []).map((x) => clean(typeof x === 'string' ? x : x.text).toLowerCase());
  const areas = (contract.scope?.allowedAreas || []).map((x) => normalizePath(typeof x === 'string' ? x : x.path).toLowerCase());
  for (const area of areas) {
    if (scopes.includes(area)) errors.push(`Scope conflict: ${area} is both an allowed area and explicitly out of scope.`);
  }
  const invariantTexts = (contract.requiredInvariants || []).map((x) => clean(typeof x === 'string' ? x : x.text).toLowerCase());
  const hasPreserve = invariantTexts.some((x) => /preserv|maintain|backward compatible|must not break/.test(x));
  const hasBreak = invariantTexts.some((x) => /allow breaking|permit breaking|intentionally break/.test(x));
  if (hasPreserve && hasBreak) errors.push('Conflicting invariants: compatibility preservation conflicts with an explicitly allowed breaking change.');
  for (const item of contract.requiredVerification || []) {
    const raw = clean(item.script || item.command);
    const isNpmScript = Boolean(item.script) || /^npm run\s+/.test(raw);
    const name = isNpmScript ? raw.replace(/^npm run\s+/, '') : '';
    if (name && Object.keys(scripts).length && !scripts[name]) errors.push(`Unknown verification command: ${name}.`);
    if (item.status === 'PASS' && item.source !== 'observed_execution_evidence') warnings.push(`Verification ${name || item.command} claims PASS without an execution-evidence source.`);
  }
  if (contract.status === 'APPROVED') errors.push('P89 draft builder cannot mark a contract APPROVED; approval belongs to the human owner.');
  if ((contract.acceptanceCriteria || []).some((x) => x.source === 'inferred_draft')) warnings.push('Acceptance criteria include inferred draft text; review it before implementation or acceptance.');
  return { status: errors.length ? 'FAIL' : warnings.length ? 'PASS_WITH_WARNINGS' : 'PASS', errors, warnings };
}

export function buildIntentDiff(contract, evidence = {}) {
  return (contract.acceptanceCriteria || []).map((criterion) => ({
    criterionId: criterion.id,
    criterion: criterion.text,
    source: criterion.source,
    status: evidence[criterion.id] ? normalizeEvidence(evidence[criterion.id]) : 'UNVERIFIED',
    evidence: [],
  }));
}

function inferCriterion(goal) {
  if (!goal) return 'The intended outcome is not specified; add a concrete, observable acceptance criterion.';
  if (/\b(fix|repair|resolve|prevent)\b/i.test(goal)) return `The reported problem described by the request is corrected without unrelated regressions. (Inferred; review before use.)`;
  if (/\b(add|create|implement|introduce|support)\b/i.test(goal)) return 'The requested capability is available and behaves as described, with relevant negative cases covered. (Inferred; review before use.)';
  return 'The requested outcome is demonstrably achieved and relevant existing behavior remains intact. (Inferred; review before use.)';
}
function stableId(text) { return Buffer.from(text).toString('hex').slice(0, 12) || 'empty'; }
function normalizeEvidence(value) {
  const status = clean(typeof value === 'string' ? value : value.status).toUpperCase().replaceAll(' ', '_');
  return ['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN', 'PARTIAL', 'UNKNOWN', 'UNVERIFIED'].includes(status) ? status : 'UNKNOWN';
}
