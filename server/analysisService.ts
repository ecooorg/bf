import { z } from 'zod';
import { buildContext, type ContextArtifact } from './contextBuilder.ts';
import { applyPatchToProject, PatchRejectedError } from './stateService.ts';
import { getProject, recordAuditEvent, StateVersionConflict } from './projectRepository.ts';
import { readArtifact, saveArtifact } from './artifactRepository.ts';
import { ledgerEntryFromResponse, writeLedgerEntry } from './ledger.ts';
import { newRouterState, routeCall, type RouterState } from './router.ts';
import { REGISTRY_SEED, type RegistryEntry } from './modelRegistry.ts';
import { statePatchSchema, SECTIONS, type Section } from './statePipeline.ts';
import { getPool } from './database.ts';
import type { ProviderAdapter } from './adapter.ts';
import crypto from 'node:crypto';

/** Slice S1 (TZ 18.0): project -> State -> model call -> patch -> human review -> artifact. A model never writes State directly. */
export class AnalysisError extends Error { constructor(readonly code: string, message: string, readonly status = 400) { super(message); } }
const outputSchema = z.object({ summary: z.string().max(20000).default(''), patch: statePatchSchema }).strict();
const routerState: RouterState = newRouterState();

export interface AnalysisDeps { adapters: Record<string, ProviderAdapter>; registry?: RegistryEntry[]; router?: RouterState; maxTokens?: number }

export async function runAnalysis(input: { projectId: string; expectedVersion: number; task: string; artifactIds?: string[] }, deps: AnalysisDeps) {
  const task = z.string().trim().min(1).max(4000).parse(input.task);
  const project = await getProject(input.projectId);
  if (!project) throw Object.assign(new Error('Project not found'), { code: 'NOT_FOUND' });
  if (Number(project.state_version) !== input.expectedVersion) throw new StateVersionConflict(input.expectedVersion, Number(project.state_version));
  if ((project.state.passport as { status?: string } | undefined)?.status !== 'confirmed') throw new AnalysisError('PASSPORT_NOT_CONFIRMED', 'Confirm the project passport before running an analysis', 409);
  const artifacts: ContextArtifact[] = [];
  for (const id of (input.artifactIds ?? []).slice(0, 5)) {
    const a = await readArtifact(id);
    if (!a || a.project_id !== input.projectId) throw new AnalysisError('ARTIFACT_NOT_FOUND', 'Artifact not found in this project', 404);
    artifacts.push({ id, version: Number(a.version), filename: a.filename, text: a.text });
  }
  const ctx = buildContext({ state: project.state, task, artifacts, maxTokens: deps.maxTokens });
  const runId = `${input.projectId}:${crypto.randomBytes(6).toString('hex')}`;
  const route = await routeCall({ requestId: runId, system: ctx.system, prompt: ctx.prompt, json: true, metadata: {} }, {
    registry: deps.registry ?? REGISTRY_SEED, adapters: deps.adapters, state: deps.router ?? routerState, required: ['json_output'], timeoutMs: 90_000,
    onCall: async (resp, info) => { try { await writeLedgerEntry(ledgerEntryFromResponse(resp, { runId, retries: info.retries })); } catch { /* the ledger must not break the run */ } },
  });
  if (route.status !== 'ok' || !route.response) throw new AnalysisError('MODEL_UNAVAILABLE', `The model call failed (${route.decision.reason ?? route.response?.errorClass ?? 'unknown'})`, 502);
  const parsed = outputSchema.safeParse(route.response.output);
  if (!parsed.success) throw new AnalysisError('INVALID_OUTPUT', 'The model returned an unusable result', 502);
  const sourceRef = `run:${runId}`;
  const saved = await applyPatchToProject({ projectId: input.projectId, expectedVersion: input.expectedVersion, patch: parsed.data.patch, actor: 'agent', sourceRef });
  const art = await saveArtifact({
    projectId: input.projectId, filename: 'analysis.md', mime: 'text/markdown', createdBy: sourceRef, derivedFrom: [`state:v${input.expectedVersion}`, ...artifacts.map((a) => `artifact:${a.id}@${a.version}`)],
    text: `# Analysis\n\n**Task:** ${task}\n\n${parsed.data.summary}\n\n## Proposed changes\n\n\`\`\`json\n${JSON.stringify(saved.changes, null, 2)}\n\`\`\`\n\nModel: ${route.response.providerId}/${route.response.modelId}. Run: ${runId}.\n`,
  });
  await recordAuditEvent({ eventType: 'analysis.completed', actor: 'agent', projectId: input.projectId, details: { run_id: runId, artifact_id: art.artifactId, version: art.version, estimated_input_tokens: ctx.tokens.total } });
  const usage = route.response.usage;
  return { state_version: saved.state_version, changes: saved.changes, summary: parsed.data.summary, artifact: art, run_id: runId, model: `${route.response.providerId}/${route.response.modelId}`,
    tokens: { estimated: ctx.tokens, actual: usage }, included: ctx.included, excluded_count: ctx.excluded.length, route: route.decision };
}

/** Human review of one item: confirm or reject. Goes through the same pipeline (actor human). */
export async function reviewItem(input: { projectId: string; expectedVersion: number; section: string; id: string; action: 'confirm' | 'reject'; reason?: string }) {
  const section = z.enum(['facts', 'unknowns', 'hypotheses', 'risks', 'requirements']).parse(input.section) as Section;
  const rk = SECTIONS[section].reviewKey!;
  const op = input.action === 'reject' ? { op: 'reject', section, id: input.id, reason: input.reason } : { op: 'update', section, id: input.id, changes: { [rk]: 'confirmed' } };
  return applyPatchToProject({ projectId: input.projectId, expectedVersion: input.expectedVersion, patch: { ops: [op] }, actor: 'human', sourceRef: 'ui:review' });
}

/** Only a human creates decisions. */
export async function addDecision(input: { projectId: string; expectedVersion: number; text: string; rationale: string }) {
  return applyPatchToProject({ projectId: input.projectId, expectedVersion: input.expectedVersion, actor: 'human', sourceRef: 'ui:decision', patch: { ops: [{ op: 'add', section: 'decisions', item: { text: input.text, rationale: input.rationale } }] } });
}

export async function listProjectArtifacts(projectId: string) {
  const pool = await getPool();
  const r = await pool.query(`SELECT DISTINCT ON (artifact_id) artifact_id, version, filename, size, hash, created_by, created_at FROM artifacts WHERE project_id=$1 ORDER BY artifact_id, version DESC`, [projectId]);
  return r.rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

export async function listProjectLedger(projectId: string, limit = 50) {
  const pool = await getPool();
  const r = await pool.query(`SELECT run_id, provider_id, model_id, input_tokens, cached_tokens, output_tokens, latency_ms, retries, status, error_class, created_at FROM usage_ledger WHERE starts_with(run_id, $1) ORDER BY created_at DESC LIMIT $2`, [`${projectId}:`, limit]);
  return r.rows;
}
export { PatchRejectedError };
