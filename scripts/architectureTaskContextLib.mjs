/** P85: deterministic task-to-evidence hints, layered on the existing P81 planner. */
import fs from 'node:fs';
import path from 'node:path';
import { root } from './architectureLib.mjs';
import { planContext } from './architectureContextLib.mjs';

const FEATURES = [
  { id: 'project-artifact', pattern: /\b(zip|archive|download|artifact|bundle|tetris|project mode|project build)\b|архив|скач|загруз|проект|тетри/i,
    files: ['server/projectRoutes.ts', 'server/artifactRepository.ts', 'server/artifactFormat.ts', 'server/appBuilderPipeline.ts'], tests: ['test:project', 'test:database'],
    invariant: 'A download URL does not prove ZIP integrity, persistence or successful transfer.', contract: 'Project Mode build/download and artifact storage' },
  { id: 'persistence', pattern: /\b(database|migration|persist|save|postgres|sql|storage)\b|баз[аыу]|сохран|миграц/i,
    files: ['server/database.ts', 'server/projectRepository.ts', 'server/projectRoutes.ts'], tests: ['test:database'],
    invariant: 'Preserve existing data and migration compatibility.', contract: 'Database schema and project persistence' },
  { id: 'api-contract', pattern: /\b(api|endpoint|route|request|response|contract|auth)\b|маршрут|контракт|авторизац/i,
    files: ['server/contracts.ts', 'server/projectRoutes.ts', 'server.ts'], tests: ['test:core', 'test:project', 'test:security'],
    invariant: 'Preserve request/response compatibility and authorization boundaries.', contract: 'HTTP request and response schemas' },
  { id: 'ui-guide', pattern: /\b(ui|interface|user guide|copy|text|button|menu|screen|react)\b|интерфейс|руководств|кнопк|меню|текст/i,
    files: ['src/UserGuide.tsx', 'src/ProjectMode.tsx'], tests: ['lint:copy', 'test:core'],
    invariant: 'Preserve accessible user flows and concise visible copy.', contract: 'User-facing UI behavior' },
  { id: 'configuration', pattern: /\b(env|environment|config|setting|secret|feature flag)\b|настрой|конфиг|переменн|секрет/i,
    files: ['.env.example', 'server.ts', 'package.json'], tests: ['test:security'],
    invariant: 'Do not expose secrets or silently change configuration defaults.', contract: 'Environment configuration' },
];
const exists = (p) => fs.existsSync(path.join(root, p));
const item = (file, reason, evidence = 'heuristic') => ({ file, reason, evidence });
const unique = (items) => [...new Map(items.map((x) => [x.file, x])).values()];

export function planTaskContext(task, { contextPlanner = planContext, fileExists = exists } = {}) {
  if (typeof task !== 'string' || !task.trim()) throw new Error('Provide a non-empty --task description.');
  if (task.length > 4000) throw new Error('Task description exceeds 4000 characters.');
  const summary = task.trim().replace(/\s+/g, ' ');
  const matched = FEATURES.filter((f) => f.pattern.test(summary));
  const candidateFiles = [...new Set(matched.flatMap((f) => f.files))].filter(fileExists);
  // Use P81's existing dependency and integration evidence; never treat keyword hits as verified dependencies.
  const existing = candidateFiles.length ? contextPlanner(candidateFiles) : null;
  const changeTargets = candidateFiles.map((file) => item(file, `Keyword match: ${matched.filter((f) => f.files.includes(file)).map((f) => f.id).join(', ')}`, 'heuristic'));
  const supporting = existing ? unique([...existing.staticContextCandidates, ...existing.supportingContext].map((e) => item(e.file, e.reasons.join('; '), e.reasons.some((r) => r.startsWith('static ')) ? 'static' : 'contract'))) : [];
  const tests = [...new Set(matched.flatMap((f) => f.tests).concat(existing?.suggestedNpmScripts || []))].sort();
  const gaps = [];
  if (!matched.length) gaps.push('No recognized feature keywords: target selection is UNKNOWN; identify one relevant file or clarify the task.');
  if (matched.length > 2) gaps.push('Several feature areas matched; narrow the change before editing.');
  if (matched.some((f) => f.id === 'project-artifact')) gaps.push('Artifact build, persistence, HTTP completion and client receipt are separate evidence stages; live download status is not available to this static planner.');
  if (matched.some((f) => f.id === 'persistence')) gaps.push('Static context cannot establish live database state or migration safety.');
  return {
    schemaVersion: 1, kind: 'task-context-plan', taskSummary: summary,
    classification: { matchedFeatures: matched.map((f) => f.id), evidence: 'heuristic', completeness: !matched.length ? 'UNKNOWN' : matched.length > 2 ? 'PARTIAL' : 'PARTIAL' },
    acceptanceCriteria: [{ text: `Verify the requested outcome: ${summary}`, status: 'draft', evidence: 'heuristic' }],
    outOfScope: [], assumptions: [{ text: 'Feature keywords indicate possible areas, not confirmed change targets.', evidence: 'heuristic' }],
    changeTargets, mustRead: changeTargets.slice(0, 5), readIfNeeded: supporting.slice(0, 12), notNeededByDefault: [],
    contracts: matched.map((f) => ({ name: f.contract, evidence: 'heuristic', sourceCandidates: f.files.filter(fileExists) })),
    requiredTests: tests.map((name) => ({ name, reason: 'Feature or P81 context mapping', evidence: 'heuristic' })),
    mandatoryChecks: ['npm run check:docs', 'npm run architecture:check', 'npm run check'],
    invariants: matched.map((f) => ({ text: f.invariant, evidence: 'heuristic', status: 'review-required' })),
    integrationPoints: existing?.integrationPoints || [],
    uncertainties: [...gaps, ...(existing?.uncertainties || []), 'Task intent, test coverage, dynamic dependencies and runtime outcomes require human verification.'],
    confidence: !matched.length ? 'UNKNOWN' : 'HEURISTIC',
    scope: 'Deterministic keyword-to-file hints plus existing P81 one-hop static evidence. No runtime execution, model inference, or network access.',
  };
}
