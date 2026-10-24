/** P87 deterministic, read-only verification planning. Commands are suggestions only. */

const RULES = [
  {
    id: 'project-artifact-delivery',
    matches: (files, task) => /projectRoutes|appBuilderPipeline|artifactRepository|artifactFormat|ProjectMode|ProjectDelivery|exportZip/i.test(files.join(' ')) || /zip|archive|download|artifact|project mode|project build|delivery/i.test(task),
    fast: ['typecheck'], targeted: ['test:project', 'test:pipeline', 'test:impact-lineage'],
    counterexamples: [
      'Empty or malformed archive is rejected; no success URL is returned.',
      'Expected archive entries are present and saved/read-back bytes retain the same size and digest.',
      'Missing artifact or interrupted download is reported as incomplete, not successful.',
    ],
    risks: ['artifact integrity', 'persistence', 'HTTP delivery'],
  },
  {
    id: 'database-persistence',
    matches: (files, task) => /(^|\/)(migrations?|db|database)|artifactRepository|Repository\.ts/i.test(files.join(' ')) || /database|migration|postgres|persistence|transaction|ledger/i.test(task),
    fast: ['typecheck'], targeted: ['test:database', 'test:project'],
    counterexamples: [
      'Persistence failure does not produce a success result.',
      'A repeated operation or conflicting write preserves the documented idempotency/conflict behavior.',
    ],
    risks: ['database state', 'migration compatibility', 'persistence'],
  },
  {
    id: 'api-server',
    matches: (files, task) => /(^|\/)(server|routes?)(\/|\.)|server\.ts$/i.test(files.join(' ')) || /api|route|endpoint|authorization|session|http/i.test(task),
    fast: ['typecheck'], targeted: ['test:core', 'test:security', 'test:integrations'],
    counterexamples: [
      'Unauthenticated or unauthorized requests remain rejected where required.',
      'Invalid input returns a controlled error without partial state changes.',
    ],
    risks: ['API compatibility', 'authorization', 'error handling'],
  },
  {
    id: 'security-config',
    matches: (files, task) => /(^|\/)(\.env|.*\.env|.*security.*|.*auth.*|.*session.*)|security/i.test(files.join(' ')) || /secret|credential|auth|security|permission|environment variable/i.test(task),
    fast: ['typecheck'], targeted: ['test:security', 'test:core'],
    counterexamples: [
      'Secrets are not returned in logs, errors, generated files, or client responses.',
      'Missing or invalid credentials fail closed rather than bypassing the guard.',
    ],
    risks: ['security', 'secret handling', 'authorization'],
  },
  {
    id: 'ui-copy',
    matches: (files, task) => /(^|\/)(src\/.*\.(tsx|jsx|css)|UserGuide\.tsx)$/i.test(files.join(' ')) || /ui|interface|button|screen|visible text|copy|guide/i.test(task),
    fast: ['typecheck', 'lint:copy'], targeted: ['test:ui', 'test:core'],
    counterexamples: [
      'The affected flow remains reachable and its visible action is wired to the expected behavior.',
      'Empty, long, or invalid user input produces a readable state rather than a crash.',
    ],
    risks: ['user-visible behavior', 'accessibility', 'copy rules'],
  },
  {
    id: 'docs-generated-inventory',
    matches: (files, task) => /(^|\/)docs\/|docsGenerate|generated-(route|env|migration|module)|architecture.*(Map|Inventory)/i.test(files.join(' ')) || /documentation|inventory|generated file|module map/i.test(task),
    fast: ['check:docs'], targeted: ['docs:check', 'architecture:check', 'test:impact-lineage'],
    counterexamples: [
      'Generated inventory is valid and points only to existing source paths.',
      'A stale or malformed generated artifact is detected rather than silently accepted.',
    ],
    risks: ['generated artifacts', 'source-to-inventory lineage'],
  },
  {
    id: 'test-or-build-tooling',
    matches: (files, task) => /(^|\/)(tests?\/|scripts\/|package\.json|.*\.ya?ml$)/i.test(files.join(' ')) || /test|ci|workflow|build|verification|check chain/i.test(task),
    fast: ['typecheck'], targeted: ['test:regression', 'architecture:check'],
    counterexamples: [
      'The new or changed test is actually reachable from npm run check or an explicitly declared CI step.',
      'An unknown or misspelled npm script is rejected by the planner rather than suggested as runnable.',
    ],
    risks: ['verification coverage', 'CI wiring'],
  },
];

const SECURITY_OR_HIGH_RISK = new Set(['project-artifact-delivery', 'database-persistence', 'security-config']);

export function validateTestChain(scripts, separateCiSteps = []) {
  const errors = [];
  const chain = new Set([...String(scripts.check || '').matchAll(/npm run ([\w:-]+)/g)].map((m) => m[1]));
  const separate = new Set(separateCiSteps);
  for (const name of Object.keys(scripts)) {
    if (!/^(test|lint|typecheck|verify)/.test(name) || name === 'check') continue;
    if (!chain.has(name) && !separate.has(name)) errors.push(`Script ${name} is neither in npm run check nor declared as a separate CI step.`);
  }
  for (const name of chain) if (!scripts[name]) errors.push(`npm run check references missing script ${name}.`);
  return errors;
}

export function planVerification({ task = '', changedFiles = [], scripts = {}, separateCiSteps = [] } = {}) {
  const normalizedFiles = [...new Set(changedFiles.map((f) => String(f).replaceAll('\\', '/').replace(/^\.\//, '')).filter(Boolean))].sort();
  const normalizedTask = String(task).trim().replace(/\s+/g, ' ');
  if (!normalizedTask && normalizedFiles.length === 0) throw new Error('Provide --task and/or at least one changed file.');
  const matched = RULES.filter((rule) => rule.matches(normalizedFiles, normalizedTask));
  const unknownFiles = normalizedFiles.filter((file) => !matched.some((rule) => rule.matches([file], '')));
  const reasons = new Map();
  const add = (name, tier, reason, required = false) => {
    if (!scripts[name]) return;
    const previous = reasons.get(name);
    if (!previous || tierRank(tier) < tierRank(previous.tier)) reasons.set(name, { command: `npm run ${name}`, script: name, tier, reason, required, status: 'SUGGESTED_NOT_RUN' });
    else if (previous) previous.required ||= required;
  };
  for (const rule of matched) {
    for (const name of rule.fast) add(name, 'fast', `Direct low-cost check for ${rule.id}.`);
    for (const name of rule.targeted) add(name, 'targeted', `Targeted coverage for ${rule.id}.`);
  }
  // Full gates are deliberately retained for every plan; targeted checks never imply completion.
  add('check', 'full', 'Mandatory repository check chain; never replaced by a fast tier.', true);
  add('build', 'full', 'Required build/type integration gate for a code change.', true);
  const chainErrors = validateTestChain(scripts, separateCiSteps);
  const highRisk = matched.some((rule) => SECURITY_OR_HIGH_RISK.has(rule.id));
  const allCounterexamples = [...new Set(matched.flatMap((rule) => rule.counterexamples))];
  const allRisks = [...new Set(matched.flatMap((rule) => rule.risks))];
  const commands = [...reasons.values()].sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || a.script.localeCompare(b.script));
  const mandatoryCi = {
    name: 'GitHub Actions required workflow',
    status: 'NOT_RUN',
    reason: 'Must be confirmed on the hosted CI after pushing; this local planner cannot claim it passed.',
  };
  const uncertainties = [];
  if (!matched.length) uncertainties.push('No change category matched. Mapping/coverage is UNKNOWN; inspect the changed files and add an explicit rule if needed.');
  if (unknownFiles.length) uncertainties.push(`Files without a recognized ownership rule: ${unknownFiles.join(', ')}`);
  if (chainErrors.length) uncertainties.push('P56 test-chain invariant violations detected; fix these before treating any plan as complete.');
  if (highRisk) uncertainties.push('High-risk change: fast checks are preliminary only; targeted checks and full mandatory gates remain required.');
  return {
    schemaVersion: 1,
    kind: 'verification-plan',
    task: normalizedTask,
    changedFiles: normalizedFiles,
    matchedAreas: matched.map(({ id }) => id),
    status: chainErrors.length ? 'BLOCKED' : matched.length && !unknownFiles.length ? 'PLANNED' : 'PARTIAL',
    coverage: matched.length && !unknownFiles.length ? 'RULE_BASED_PARTIAL' : 'UNKNOWN_OR_PARTIAL',
    risk: highRisk ? 'HIGH' : allRisks.length ? 'MODERATE' : 'UNKNOWN',
    suggestedCommands: commands,
    requiredFullGates: [
      { command: 'npm run check', status: scripts.check ? 'REQUIRED_NOT_RUN' : 'BLOCKED_MISSING_SCRIPT' },
      { command: 'npm run build', status: scripts.build ? 'REQUIRED_NOT_RUN' : 'BLOCKED_MISSING_SCRIPT' },
      mandatoryCi,
    ],
    counterexamples: allCounterexamples,
    testChain: { status: chainErrors.length ? 'FAIL' : 'PASS', errors: chainErrors },
    uncertainties,
    guarantees: [
      'No command is executed by this planner.',
      'A fast or targeted tier never substitutes for full repository checks or hosted required CI.',
      'A command is suggested only when its npm script exists in package.json.',
    ],
  };
}

function tierRank(tier) { return ({ fast: 0, targeted: 1, full: 2 })[tier] ?? 9; }
