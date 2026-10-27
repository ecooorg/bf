/**
 * Project Mode HTTP routes and boundary middleware.
 * Extracted from server.ts (p73) without behaviour change.
 */
import type { Express, Request, Response } from 'express';
import crypto from 'node:crypto';
import JSZip from 'jszip';
import { z } from 'zod';
import { createGeminiAdapter } from './geminiAdapter.ts';
import { createOpenAICompatibleAdapter } from './openaiCompatAdapter.ts';
import { REGISTRY_ALL, REGISTRY_SEED, GEMINI_CANDIDATE_SEED, GROQ_BASE_URL, registryForGeminiCascade } from './modelRegistry.ts';
import { routeCall } from './router.ts';
import {
  consumeRateLimit,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  listStateVersions,
  recordAuditEvent,
  StateVersionConflict,
  updateProjectState,
} from './projectRepository.ts';
import { AnalysisError, addDecision, listProjectArtifacts, listProjectLedger, reviewItem, runAnalysis } from './analysisService.ts';
import {
  createPlan,
  decideApproval,
  getBudget,
  getProjectSettings,
  listApprovals,
  listPlans,
  listPlanTasks,
  setBudget,
  setProjectSettings,
  enqueuePlanTask,
} from './planService.ts';
import { createTask, getTask, listRuns, listTaskEvents, transitionTask } from './taskService.ts';
import { getPool } from './database.ts';
import { readArtifact, readArtifactBytes, saveArtifact } from './artifactRepository.ts';
import { stagedEnabled, startStagedBuild, cancelStagedBuild, createStorePort, publicJob, resumeStaleJobs, buildReportForDiagnostics, type AdapterDeps } from './appBuilderAdapter.ts';
import { runAppBuilderPipeline, irFromPlainAnswers } from './appBuilderIndex.ts';
import { createProjectRequestSchema, updateProjectStateRequestSchema, projectListLimitQuerySchema, stateVersionsLimitQuerySchema, defaultPassport } from './contracts.ts';
import { projectCapabilities } from './projectCapabilities.ts';
import { getTaskGates, recordApproval, recordWaiver } from './gateService.ts';
import { isGateName } from './gateEngine.ts';
import {
  approveCodePackage,
  cancelCodeTask,
  commitApprovedPackage,
  decideCodeTask,
  exportPackage,
  generatedSourceArtifactId,
  getCodeTask,
  listCodeTasks,
  listProjectCodeTasks,
  refreshCodeTask,
  requestRepair,
  runCodeTaskReview,
  startCodeTask,
  submitCodeResult,
  driveModelPatch,
} from './codeTaskService.ts';
import { buildTaskPackageFromBrief } from './briefWriter.ts';
import { isSameOrigin } from './security.ts';
import { parseProjectId, parseTaskId } from './domainIds.ts';
import type { TaskPackage } from './codeExecutor.ts';
import { contentDisposition, installLogCapture, diagnosticArchive, linkDiagnosticArtifact, newOperationId, recentDiagnostics, recordDiagnostic, systemDiagnostics, verifyDiagnosticArchive } from './projectDiagnostics.ts';

export type CodeAuthorCaller = (input: {
  packageMd: string;
  pkg: TaskPackage;
  taskId: string;
  projectId: string;
}) => Promise<unknown>;

export interface ProjectRouteDeps {
  projectModeEnabled: boolean;
  appAuthEnabled: boolean;
  authenticated: (req: Request) => boolean;
  clientIp: (req: Request) => string;
  callCodeAuthor: CodeAuthorCaller;
  /** Gemini client instance, or null when GEMINI_API_KEY is unset */
  ai: unknown;
  codeRouterState: import('./router.ts').RouterState;
}

export function registerProjectRoutes(app: Express, deps: ProjectRouteDeps): void {
  installLogCapture();
  const {
    projectModeEnabled: PROJECT_MODE_ENABLED,
    appAuthEnabled: APP_AUTH_ENABLED,
    authenticated,
    clientIp,
    callCodeAuthor,
    ai,
    codeRouterState,
  } = deps;

  // BX-06: Project Mode has an independent, mandatory security boundary. It is
  // deliberately opt-in to avoid changing legacy Simple Mode deployments.
  app.use('/api/projects', async (req, res, next) => {
    if (!PROJECT_MODE_ENABLED) return res.status(404).json({ success: false, error: 'Project Mode is disabled', code: 'PROJECT_MODE_DISABLED' });
    if (!APP_AUTH_ENABLED || !authenticated(req)) return res.status(401).json({ success: false, error: 'Project Mode authentication required', code: 'UNAUTHORIZED' });
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.get('origin');
      if (!origin || !isSameOrigin(origin, req.get('host'), req.protocol)) {
        return res.status(403).json({ success: false, error: 'Project Mode writes require a same-origin request', code: 'CSRF_ORIGIN' });
      }
    }
    if (!process.env.DATABASE_URL) return res.status(503).json({ success: false, error: 'Project Mode database is not configured', code: 'DATABASE_UNAVAILABLE' });
    try {
      const key = `project-api:${clientIp(req)}`;
      const result = await consumeRateLimit({ key, limit: Number(process.env.PROJECT_RATE_LIMIT_PER_MINUTE) || 300, windowMs: 60_000 });
      if (!result.allowed) {
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil((result.resetsAt.getTime() - Date.now()) / 1000))));
        return res.status(429).json({ success: false, error: 'Project Mode request limit exceeded', code: 'RATE_LIMITED' });
      }
      next();
    } catch (error) {
      console.error(JSON.stringify({ type: 'project_rate_limit_unavailable', message: String((error as Error)?.message || error).slice(0, 160) }));
      return res.status(503).json({ success: false, error: 'Project Mode rate limiter is unavailable', code: 'RATE_LIMIT_UNAVAILABLE' });
    }
  });

  // P92: all routes remain behind the mandatory Project Mode auth/rate-limit boundary.
  app.get('/api/projects/diagnostics/operations', async (_req, res) => {
    try { res.json({ success: true, data: await recentDiagnostics() }); } catch (error) { projectError(res, error); }
  });
  app.get('/api/projects/diagnostics/system', async (_req, res) => {
    try { const data = await systemDiagnostics(); await recordDiagnostic({ operationId: newOperationId(), event: 'SYSTEM_DIAGNOSTICS_RUN', stage: 'diagnostics', status: data.overall === 'FAIL' ? 'FAIL' : data.overall === 'PASS' ? 'PASS' : 'WARN' }); res.json({ success: true, data }); } catch (error) { projectError(res, error); }
  });
  app.get('/api/projects/diagnostics/export', async (req, res) => {
    const operationId = newOperationId(); const startedAt = Date.now();
    res.setHeader('X-BiForge-Operation-Id', operationId);
    await recordDiagnostic({ operationId, event: 'DIAGNOSTIC_EXPORT_STARTED', stage: 'export', status: 'STARTED' });
    try {
      const wantedJob = typeof req.query.jobId === 'string' && /^[0-9a-f-]{36}$/i.test(req.query.jobId) ? req.query.jobId : undefined;
      const bytes = await diagnosticArchive(operationId, stagedEnabled() ? await buildReportForDiagnostics(wantedJob) : []);
      const problems = await verifyDiagnosticArchive(bytes);
      if (problems.length) {
        await recordDiagnostic({ operationId, event: 'DIAGNOSTIC_EXPORT_FAILED', stage: 'export', status: 'FAIL', errorCode: 'ZIP_INVALID', bytes: bytes.length });
        return res.status(422).json({ success: false, error: 'Diagnostic ZIP failed integrity checks', code: 'ZIP_INVALID', operationId, problems });
      }
      await recordDiagnostic({ operationId, event: 'ZIP_INTEGRITY_CHECKED', stage: 'export', status: 'PASS', bytes: bytes.length, durationMs: Date.now() - startedAt });
      res.once('close', () => { void recordDiagnostic({ operationId, event: res.writableFinished ? 'DIAGNOSTIC_EXPORT_RESPONSE_FINISHED' : 'DIAGNOSTIC_EXPORT_INTERRUPTED', stage: 'export', status: res.writableFinished ? 'PASS' : 'FAIL', ...(res.writableFinished ? {} : { errorCode: 'CONNECTION_CLOSED' }) }); });
      res.setHeader('Content-Type', 'application/zip'); res.setHeader('Content-Disposition', 'attachment; filename="biforge-diagnostics.zip"'); res.setHeader('Content-Length', String(bytes.length)); res.send(bytes);
    } catch (error) { await recordDiagnostic({ operationId, event: 'DIAGNOSTIC_EXPORT_FAILED', stage: 'export', status: 'FAIL', errorCode: 'EXPORT_ERROR' }); projectError(res, error); }
  });

  app.get('/api/projects', async (req, res) => {
    try {
      const limit = projectListLimitQuerySchema.parse(req.query.limit);
      res.json({ success: true, data: await listProjects(limit) });
    } catch (error) { projectError(res, error); }
  });

  app.post('/api/projects', async (req, res) => {
    try {
      const input = createProjectRequestSchema.parse(req.body);
      const project = await createProject({ name: input.name, state: input.state ?? { passport: defaultPassport(input.goal) } });
      res.status(201).json({ success: true, data: project });
    } catch (error) { projectError(res, error); }
  });


  app.delete('/api/projects/:projectId', async (req, res) => {
    try {
      const result = await deleteProject({ projectId: req.params.projectId, actor: 'human' });
      if (!result) return res.status(404).json({ success: false, error: 'Project not found', code: 'NOT_FOUND' });
      res.json({ success: true, data: result });
    } catch (error) { projectError(res, error); }
  });

  app.get('/api/projects/:projectId', async (req, res) => {
    try {
      const project = await getProject(req.params.projectId);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found', code: 'NOT_FOUND' });
      res.json({ success: true, data: project });
    } catch (error) { projectError(res, error); }
  });

  app.get('/api/projects/:projectId/versions', async (req, res) => {
    try {
      const limit = stateVersionsLimitQuerySchema.parse(req.query.limit);
      res.json({ success: true, data: await listStateVersions(req.params.projectId, limit) });
    } catch (error) { projectError(res, error); }
  });

  app.put('/api/projects/:projectId/state', async (req, res) => {
    try {
      const input = updateProjectStateRequestSchema.parse(req.body);
      const result = await updateProjectState({ projectId: req.params.projectId, expectedVersion: input.expected_version, state: input.state, actor: 'human', sourceRef: 'api:state-update' });
      res.json({ success: true, data: result });
    } catch (error) { projectError(res, error); }
  });

  app.post('/api/projects/:projectId/analyze', async (req, res) => {
    try {
      if (!ai) return res.status(503).json({ success: false, error: 'No Gemini API key is configured on the server (GEMINI_API_KEY)', code: 'MODEL_NOT_CONFIGURED' });
      const input = z.object({ expected_version: z.number().int().min(1), task: z.string().trim().min(1).max(4000), artifact_ids: z.array(z.string().max(128)).max(5).optional() }).parse(req.body);
      const data = await runAnalysis({ projectId: req.params.projectId, expectedVersion: input.expected_version, task: input.task, artifactIds: input.artifact_ids }, { registry: [...registryForGeminiCascade('STRONG'), ...REGISTRY_ALL.filter((e) => e.providerId !== 'gemini')], adapters: { gemini: createGeminiAdapter(ai as any), ...(process.env.ENABLE_EXTERNAL_MODEL_FALLBACK === 'true' && process.env.GROQ_API_KEY ? { groq: createOpenAICompatibleAdapter({ providerId: 'groq', baseUrl: process.env.GROQ_BASE_URL || GROQ_BASE_URL, apiKey: process.env.GROQ_API_KEY }) } : {}), ...(process.env.ENABLE_EXTERNAL_MODEL_FALLBACK === 'true' && process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID ? { 'cloudflare-workers-ai': createOpenAICompatibleAdapter({ providerId: 'cloudflare-workers-ai', baseUrl: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`, apiKey: process.env.CLOUDFLARE_API_TOKEN }) } : {}) } });
      res.json({ success: true, data });
    } catch (error) { projectError(res, error); }
  });

  app.post('/api/projects/:projectId/items/review', async (req, res) => {
    try {
      const input = z.object({ expected_version: z.number().int().min(1), section: z.string().max(20), id: z.string().max(20), action: z.enum(['confirm', 'reject']), reason: z.string().max(500).optional() }).parse(req.body);
      res.json({ success: true, data: await reviewItem({ projectId: req.params.projectId, expectedVersion: input.expected_version, section: input.section, id: input.id, action: input.action, reason: input.reason }) });
    } catch (error) { projectError(res, error); }
  });

  app.post('/api/projects/:projectId/decisions', async (req, res) => {
    try {
      const input = z.object({ expected_version: z.number().int().min(1), text: z.string().trim().min(1).max(2000), rationale: z.string().trim().max(2000).default('') }).parse(req.body);
      res.status(201).json({ success: true, data: await addDecision({ projectId: req.params.projectId, expectedVersion: input.expected_version, text: input.text, rationale: input.rationale }) });
    } catch (error) { projectError(res, error); }
  });

  // Task Graph / approvals API (TZ 8.4–8.6). All decisions made through these routes are human decisions.
  app.get('/api/projects/:projectId/plans', async (req, res) => {
    try { res.json({ success: true, data: await listPlans(req.params.projectId) }); } catch (error) { projectError(res, error); }
  });
  app.post('/api/projects/:projectId/plans', async (req, res) => {
    try {
      const input = z.object({ source: z.enum(['template', 'model', 'human']).default('human'), template: z.string().max(100).optional(), goal: z.string().max(2000).optional(), nodes: z.unknown().optional() }).parse(req.body);
      const result = await createPlan({ projectId: req.params.projectId, ...input, source: input.source ?? 'human', actor: 'human' });
      res.status(201).json({ success: true, data: result });
    } catch (error) { projectError(res, error); }
  });
  app.get('/api/projects/:projectId/plans/:planId/tasks', async (req, res) => {
    try {
      const plans = await listPlans(req.params.projectId);
      if (!plans.some((p) => p.id === req.params.planId)) return res.status(404).json({ success: false, error: 'Plan not found', code: 'NOT_FOUND' });
      res.json({ success: true, data: await listPlanTasks(req.params.planId) });
    } catch (error) { projectError(res, error); }
  });
  app.get('/api/projects/:projectId/approvals', async (req, res) => {
    try {
      const status = req.query.status === undefined ? undefined : z.enum(['PENDING', 'APPROVED', 'REJECTED']).parse(req.query.status);
      res.json({ success: true, data: await listApprovals({ projectId: req.params.projectId, status }) });
    } catch (error) { projectError(res, error); }
  });
  app.post('/api/projects/:projectId/approvals/:approvalId/decision', async (req, res) => {
    try {
      const input = z.object({ decision: z.enum(['APPROVED', 'REJECTED']), reason: z.string().max(1000).optional(), budget_limits: z.object({ scope: z.enum(['project', 'task', 'run']), scope_id: z.string().min(1).max(128), limits: z.object({ max_model_calls: z.number().int().min(0).nullable().optional(), max_tokens: z.number().int().min(0).nullable().optional(), max_cost_units: z.number().int().min(0).nullable().optional(), max_wall_clock_ms: z.number().int().min(0).nullable().optional(), max_attempts: z.number().int().min(0).nullable().optional(), max_code_tasks: z.number().int().min(0).nullable().optional() }).strict() }).optional() }).parse(req.body);
      const data = await decideApproval({ approvalId: req.params.approvalId, decision: input.decision, reason: input.reason, decidedBy: 'human', actorKind: 'human', ...(input.budget_limits ? { budgetLimits: { scope: input.budget_limits.scope, scopeId: input.budget_limits.scope_id, limits: input.budget_limits.limits } } : {}) });
      res.json({ success: true, data });
    } catch (error) { projectError(res, error); }
  });
  app.get('/api/projects/:projectId/tasks', async (req, res) => {
    try {
      const pool = await getPool();
      const r = await pool.query(`SELECT t.* FROM tasks t WHERE t.project_id=$1 ORDER BY t.created_at DESC LIMIT 200`, [req.params.projectId]);
      res.json({ success: true, data: r.rows.map((t: any) => ({ id: t.id, projectId: t.project_id, title: t.title, input: t.input, state: t.state, version: t.version, blockedReason: t.blocked_reason, updatedAt: t.updated_at })) });
    } catch (error) { projectError(res, error); }
  });
  app.get('/api/projects/:projectId/budgets/:scope/:scopeId', async (req, res) => {
    try {
      const scope = z.enum(['project', 'task', 'run']).parse(req.params.scope);
      res.json({ success: true, data: await getBudget(req.params.projectId, scope, req.params.scopeId) });
    } catch (error) { projectError(res, error); }
  });
  app.put('/api/projects/:projectId/budgets/:scope/:scopeId', async (req, res) => {
    try {
      const scope = z.enum(['project', 'task', 'run']).parse(req.params.scope);
      const limits = z.object({ max_model_calls: z.number().int().min(0).nullable().optional(), max_tokens: z.number().int().min(0).nullable().optional(), max_cost_units: z.number().int().min(0).nullable().optional(), max_wall_clock_ms: z.number().int().min(0).nullable().optional(), max_attempts: z.number().int().min(0).nullable().optional(), max_code_tasks: z.number().int().min(0).nullable().optional() }).strict().parse(req.body.limits);
      res.json({ success: true, data: await setBudget({ projectId: req.params.projectId, scope, scopeId: req.params.scopeId, limits, actor: 'human', actorKind: 'human' }) });
    } catch (error) { projectError(res, error); }
  });
  app.get('/api/projects/:projectId/settings', async (req, res) => {
    try { res.json({ success: true, data: await getProjectSettings(req.params.projectId) }); } catch (error) { projectError(res, error); }
  });
  app.put('/api/projects/:projectId/settings', async (req, res) => {
    try {
      const input = z.object({ approval_mode: z.enum(['supervised', 'manual']).optional(), max_concurrent_runs: z.number().int().min(1).max(10).optional() }).strict().parse(req.body);
      res.json({ success: true, data: await setProjectSettings({ projectId: req.params.projectId, actorKind: 'human', ...(input.approval_mode ? { approvalMode: input.approval_mode } : {}), ...(input.max_concurrent_runs ? { maxConcurrentRuns: input.max_concurrent_runs } : {}) }) });
    } catch (error) { projectError(res, error); }
  });
  app.post('/api/projects/:projectId/tasks/:taskId/queue', async (req, res) => {
    try {
      const input = z.object({ expected_version: z.number().int().min(1), idempotency_key: z.string().trim().min(1).max(200) }).parse(req.body);
      const task = await getTask(req.params.taskId);
      if (!task || task.projectId !== req.params.projectId) return res.status(404).json({ success: false, error: 'Task not found', code: 'NOT_FOUND' });
      const data = await enqueuePlanTask({ taskId: task.id, expectedVersion: input.expected_version, idempotencyKey: input.idempotency_key, actor: 'human' });
      res.status(202).json({ success: true, data });
    } catch (error) { projectError(res, error); }
  });
  app.get('/api/projects/:projectId/tasks/:taskId', async (req, res) => {
    try {
      const task = await getTask(req.params.taskId);
      if (!task || task.projectId !== req.params.projectId) return res.status(404).json({ success: false, error: 'Task not found', code: 'NOT_FOUND' });
      res.json({ success: true, data: { task, runs: await listRuns(task.id), events: await listTaskEvents(task.id) } });
    } catch (error) { projectError(res, error); }
  });
  app.post('/api/projects/:projectId/tasks/:taskId/validate', async (req, res) => {
    try {
      const input = z.object({ expected_version: z.number().int().min(1), passed: z.boolean(), evidence: z.array(z.string().trim().min(1).max(500)).min(1).max(100) }).strict().parse(req.body);
      const task = await getTask(req.params.taskId);
      if (!task || task.projectId !== req.params.projectId) return res.status(404).json({ success: false, error: 'Task not found', code: 'NOT_FOUND' });
      const data = await transitionTask({ taskId: task.id, expectedVersion: input.expected_version, to: input.passed ? 'PASS' : 'FAIL', actor: 'human', ...(input.passed ? { validation: { passed: true, evidence: input.evidence } } : { reason: 'validation_failed' }) });
      res.json({ success: true, data });
    } catch (error) { projectError(res, error); }
  });

  app.get('/api/projects/:projectId/tasks/:taskId/gates', async (req, res) => {
    try {
      const task = await getTask(req.params.taskId);
      if (!task || task.projectId !== req.params.projectId) return res.status(404).json({ success: false, error: 'Task not found', code: 'NOT_FOUND' });
      res.json({ success: true, data: await getTaskGates(await getPool(), task.id) });
    } catch (error) { projectError(res, error); }
  });
  // WAIVED is a human decision with a mandatory reason, bound to one commit (TZ 12.2); it is audited.
  app.post('/api/projects/:projectId/tasks/:taskId/gates/:gate/waive', async (req, res) => {
    try {
      const input = z.object({ commit_sha: z.string().regex(/^[0-9a-f]{40}$/i), reason: z.string().trim().min(1).max(1000) }).strict().parse(req.body);
      if (!isGateName(req.params.gate)) return res.status(400).json({ success: false, error: 'Unknown gate', code: 'VALIDATION' });
      const task = await getTask(req.params.taskId);
      if (!task || task.projectId !== req.params.projectId) return res.status(404).json({ success: false, error: 'Task not found', code: 'NOT_FOUND' });
      await recordWaiver(await getPool(), { projectId: task.projectId, taskId: task.id, gate: req.params.gate, commitSha: input.commit_sha, reason: input.reason, actor: 'human' });
      res.json({ success: true, data: await getTaskGates(await getPool(), task.id, input.commit_sha) });
    } catch (error) { projectError(res, error); }
  });
  /** P20b: human approval evidence for requirements / spec / review gates. */
  app.post('/api/projects/:projectId/tasks/:taskId/gates/:gate/approve', async (req, res) => {
    try {
      const task = await taskOfProject(req, res); if (!task) return;
      const gate = req.params.gate;
      if (!['requirements', 'spec', 'review'].includes(gate)) {
        return res.status(400).json({ success: false, error: 'Only requirements, spec and review accept approval evidence', code: 'INVALID_GATE' });
      }
      const input = z.object({
        commit_sha: z.string().regex(/^[0-9a-f]{40}$/i).optional(),
        status: z.enum(['PASS', 'FAIL']).optional(),
        approval_id: z.string().trim().min(1).max(128).optional(),
      }).strict().parse(req.body ?? {});
      const pool = await getPool();
      const head = input.commit_sha ?? (await getTaskGates(pool, task.id)).commit;
      if (!head) return res.status(409).json({ success: false, error: 'No commit head for this task; open a PR or set head first', code: 'NO_HEAD' });
      await recordApproval(pool, {
        projectId: task.projectId,
        taskId: task.id,
        gate: gate as 'requirements' | 'spec' | 'review',
        commitSha: head,
        actor: 'human',
        approvalId: input.approval_id || `ui-${Date.now().toString(36)}`,
        status: input.status ?? 'PASS',
      });
      res.json({ success: true, data: await getTaskGates(pool, task.id, head) });
    } catch (error) { projectError(res, error); }
  });


  // ---- P18: Code Delivery, `manual` executor (TZ 11.4). Human session only; the actor is never read from the request body. ----
  const codeNote = z.string().max(500).optional();
  const codeResultSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('pr'), pr_number: z.number().int().min(1).max(100_000_000), note: codeNote }).strict(),
    z.object({ kind: z.literal('branch'), branch: z.string().min(1).max(200), note: codeNote }).strict(),
    z.object({ kind: z.literal('diff'), diff: z.string().min(1).max(512_000), title: z.string().max(200).optional(), note: codeNote }).strict(),
  ]);
  async function taskOfProject(req: Request, res: Response) {
    // Path params validated with shared id contract (Phase 3 branded ids).
    const projectId = parseProjectId(req.params.projectId);
    const taskId = parseTaskId(req.params.taskId);
    const task = await getTask(taskId);
    if (!task || task.projectId !== projectId) { res.status(404).json({ success: false, error: 'Task not found', code: 'NOT_FOUND' }); return null; }
    return task;
  }
  app.get('/api/projects/:projectId/tasks/:taskId/code', async (req, res) => {
    try {
      const task = await taskOfProject(req, res); if (!task) return;
      res.json({ success: true, data: await listCodeTasks(task.projectId, task.id) });
    } catch (error) { projectError(res, error); }
  });
  // P93.3: staged App Builder (flag APP_BUILDER_ENGINE=staged; unset/false keeps the legacy path and never touches app_build_* tables).
  const stagedDeps = (): AdapterDeps | null => {
    if (!ai) return null;
    const adapters: AdapterDeps['adapters'] = { gemini: createGeminiAdapter(ai as any) };
    const configured = [...new Set([...registryForGeminiCascade('LIGHT'), ...registryForGeminiCascade('STRONG')].map((e) => e.modelId))];
    const registry = [...REGISTRY_SEED, ...GEMINI_CANDIDATE_SEED].filter((e) => configured.includes(e.modelId));
    if (process.env.ENABLE_EXTERNAL_MODEL_FALLBACK === 'true' && process.env.GROQ_API_KEY) {
      adapters.groq = createOpenAICompatibleAdapter({ providerId: 'groq', baseUrl: process.env.GROQ_BASE_URL || GROQ_BASE_URL, apiKey: process.env.GROQ_API_KEY });
      registry.push(...REGISTRY_ALL.filter((e) => e.providerId === 'groq' && e.status === 'active' && e.capabilities.includes('json_output')));
    }
    if (process.env.ENABLE_EXTERNAL_MODEL_FALLBACK === 'true' && process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
      const modelId = process.env.CLOUDFLARE_WORKERS_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct';
      adapters['cloudflare-workers-ai'] = createOpenAICompatibleAdapter({ providerId: 'cloudflare-workers-ai', baseUrl: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`, apiKey: process.env.CLOUDFLARE_API_TOKEN });
      registry.push({ providerId: 'cloudflare-workers-ai', modelId, status: 'active', adapter: 'openai-compatible', capabilities: ['json_output'], qualityClass: 'C', qualityProvisional: true, dataPolicy: 'unknown', costTier: 'paid', trainingOptOutConfirmed: false, lastVerifiedAt: new Date().toISOString().slice(0,10), secretEnvRef: 'CLOUDFLARE_API_TOKEN' });
    }
    return { registry, adapters, routerState: codeRouterState };
  };
  if (stagedEnabled() && ai && process.env.DATABASE_URL) setTimeout(() => { const d = stagedDeps(); if (d) void resumeStaleJobs(d).then((n) => n && console.warn(JSON.stringify({ type: 'app_builder_jobs_resumed', count: n }))).catch(() => undefined); }, 5_000).unref?.();
  const jobIdParam = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
  app.get('/api/projects/:projectId/code/build/:jobId', async (req, res) => {
    if (!stagedEnabled() || !jobIdParam(req.params.jobId)) return res.status(404).json({ success: false, error: 'Build job not found', code: 'NOT_FOUND' });
    try {
      const job = await createStorePort().loadJob(req.params.jobId);
      if (!job || job.projectId !== req.params.projectId) return res.status(404).json({ success: false, error: 'Build job not found', code: 'NOT_FOUND' });
      res.json({ success: true, data: publicJob(job, job.projectId) });
    } catch (error) { projectError(res, error); }
  });
  app.post('/api/projects/:projectId/code/build/:jobId/cancel', async (req, res) => {
    if (!stagedEnabled() || !jobIdParam(req.params.jobId)) return res.status(404).json({ success: false, error: 'Build job not found', code: 'NOT_FOUND' });
    try {
      const store = createStorePort(); const job = await store.loadJob(req.params.jobId);
      if (!job || job.projectId !== req.params.projectId) return res.status(404).json({ success: false, error: 'Build job not found', code: 'NOT_FOUND' });
      const cancelled = await cancelStagedBuild({}, job.id);
      res.json({ success: true, data: { jobId: job.id, cancelled, status: cancelled ? 'cancelled' : job.status } });
    } catch (error) { projectError(res, error); }
  });

  /**
   * Product-facing App Builder (P59): IR → verified scaffold → optional narrow model slice → ZIP.
   * Scaffold materialization does not require CODE_EXECUTOR; model slice is optional.
   * Legacy model_patch-only path remains available via body.engine = "model_patch".
   */
  app.post('/api/projects/:projectId/code/build', async (req, res) => {
    const operationId = newOperationId(); const startedAt = Date.now();
    res.setHeader('X-BiForge-Operation-Id', operationId);
    await recordDiagnostic({ operationId, event: 'PROJECT_BUILD_STARTED', stage: 'request', status: 'STARTED' });
    res.once('finish', () => { void recordDiagnostic({ operationId, event: 'BUILD_HTTP_RESPONSE_FINISHED', stage: 'http', status: res.statusCode < 400 ? 'PASS' : 'FAIL', durationMs: Date.now() - startedAt, errorCode: res.statusCode < 400 ? undefined : `HTTP_${res.statusCode}` }); });
    try {
      const input = z.object({
        goal: z.string().trim().min(1).max(8000),
        constraints: z.string().trim().max(4000).optional(),
        idempotency_key: z.string().trim().min(1).max(200).optional(),
        engine: z.enum(['pipeline', 'model_patch']).optional(),
        ir: z.record(z.unknown()).optional(),
        kind: z.string().optional(),
        needsAuth: z.string().optional(),
        needsDb: z.string().optional(),
        language: z.string().optional(),
        stack: z.string().optional(),
        features: z.array(z.string()).optional(),
        name: z.string().optional(),
      }).strict().parse(req.body);
      const project = await getProject(req.params.projectId);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found', code: 'NOT_FOUND' });
      const passport = (project.state as any)?.passport;
      if (passport?.status !== 'confirmed') return res.status(409).json({ success: false, error: 'Confirm the project passport before creating software.', code: 'PASSPORT_NOT_CONFIRMED' });

      const engine = input.engine || 'pipeline';
      if (engine === 'model_patch') {
        if (passport?.executor !== 'model_patch' || process.env.CODE_EXECUTOR !== 'model_patch') {
          return res.status(409).json({ success: false, error: 'model_patch is not enabled on this server.', code: 'EXECUTOR_UNAVAILABLE' });
        }
        const idem = input.idempotency_key ?? `code-build-${crypto.randomUUID()}`;
        const created = await createTask({
          projectId: project.id, idempotencyKey: idem, title: input.goal.slice(0, 200),
          input: { task: input.goal, artifactRefs: [], stateVersion: Number(project.state_version), profile: 'code_author', profileVersion: '1', criteria: ['Generated source passes structural/path validation', 'Source bundle is downloadable', 'No generated code is executed by the BiForge server'] },
          actor: 'human',
        });
        const { APP_BUILDER_MAX_FILES, APP_BUILDER_MAX_CHANGED_LINES } = await import('./codeExecutor.ts');
        const pkg = buildTaskPackageFromBrief({
          taskId: created.task.id, projectId: project.id, goal: input.goal,
          constraints: [input.constraints || '', 'All generated files under generated-projects/<task-id>/.'].filter(Boolean).join('\n\n'),
          acceptanceCriteria: 'Complete source files; README with local run and manual deploy; no server-side execution of generated code.',
          allowedPaths: [`generated-projects/${created.task.id}/**`], limits: { maxFiles: APP_BUILDER_MAX_FILES, maxChangedLines: APP_BUILDER_MAX_CHANGED_LINES }, sensitivity: 'normal',
        });
        const started = await startCodeTask({ projectId: project.id, taskId: created.task.id, package: pkg, baseBranch: 'main', actorKind: 'human' }, { modelCaller: callCodeAuthor, sourceOnly: true });
        const bundleId = generatedSourceArtifactId(started.codeTask.id);
        const bundle = await readArtifactBytes(bundleId).catch(() => null);
        return res.status(201).json({ success: true, data: {
          taskId: created.task.id, codeTask: started.codeTask, created: started.created, engine: 'model_patch',
          ...(bundle && bundle.project_id === project.id ? { downloadUrl: `/api/projects/${encodeURIComponent(project.id)}/tasks/${encodeURIComponent(created.task.id)}/code/${encodeURIComponent(started.codeTask.id)}/download` } : {}),
          note: 'Legacy model_patch engine.',
        } });
      }

      // --- P93.3: staged engine (flag-gated; default stays legacy) ---
      if (stagedEnabled() && engine === 'pipeline' && !input.ir) {
        const deps = stagedDeps();
        if (deps) {
          const taskText = [input.goal, input.constraints ? `Constraints: ${input.constraints}` : ''].filter(Boolean).join('\n');
          const started = await startStagedBuild(deps, { projectId: project.id, userId: 'owner', taskText });
          res.setHeader('X-BiForge-Operation-Id', started.jobId);
          return res.status(202).json({ success: true, data: { jobId: started.jobId, engine: 'staged', operationId: started.jobId, statusUrl: `/api/projects/${encodeURIComponent(project.id)}/code/build/${started.jobId}` } });
        }
      }

      // --- Default: IR pipeline (scaffold; model optional) ---
      const stateBuilder = (project.state as any)?.appBuilder;
      const ir = input.ir
        ? { ...input.ir, goal: input.goal, constraints: input.constraints || (input.ir as any).constraints }
        : irFromPlainAnswers({
            idea: input.goal,
            name: input.name || project.name,
            kind: input.kind || stateBuilder?.answers?.kind,
            needsAuth: input.needsAuth || stateBuilder?.answers?.needsAuth,
            needsDb: input.needsDb || stateBuilder?.answers?.needsDb,
            language: input.language || stateBuilder?.answers?.language,
            constraints: input.constraints || stateBuilder?.answers?.constraints || '',
            stack: input.stack || stateBuilder?.answers?.stack || 'auto',
            features: input.features || stateBuilder?.answers?.features || [],
          });

      const modelSliceEnabled = process.env.CODE_EXECUTOR === 'model_patch' && process.env.APP_BUILDER_MODEL_SLICE === 'true';
      await recordDiagnostic({ operationId, event: 'GENERATION_STARTED', stage: 'generation', status: 'STARTED' });
      const result = await runAppBuilderPipeline({
        ir,
        allowSlice: modelSliceEnabled,
        sliceGenerate: modelSliceEnabled
          ? async ({ ir: sliceIr, stack, files }) => {
              // Narrow optional slice: ask model only for additive custom files (best-effort).
              const prefix = '';
              const prompt = [
                'Return ONLY JSON: {"files":{"relative/path":"full file content"},"notes":"..."}.',
                'You may ADD or REPLACE a few files to better match the goal. Keep the scaffold working.',
                'Do not remove README.md or package.json. No secrets. No remote scripts.',
                `Stack: ${stack}`,
                `Goal: ${sliceIr.goal}`,
                `Features: ${(sliceIr.features || []).join('; ')}`,
                `Constraints: ${sliceIr.constraints || ''}`,
                'Existing paths: ' + Object.keys(files).join(', '),
              ].join('\n');
              if (!ai) return { notes: 'no model' };
              const adapter = createGeminiAdapter(ai as any);
              const adapters: Record<string, import('./adapter.ts').ProviderAdapter> = { gemini: adapter };
              const registry = registryForGeminiCascade('STRONG').filter((entry) => entry.capabilities.includes('json_output'));
              if (process.env.ENABLE_EXTERNAL_MODEL_FALLBACK === 'true' && process.env.GROQ_API_KEY) {
                adapters.groq = createOpenAICompatibleAdapter({ providerId: 'groq', baseUrl: process.env.GROQ_BASE_URL || GROQ_BASE_URL, apiKey: process.env.GROQ_API_KEY });
                registry.push(...REGISTRY_ALL.filter((e) => e.providerId === 'groq' && e.status === 'active' && e.capabilities.includes('json_output')));
              }
              if (process.env.ENABLE_EXTERNAL_MODEL_FALLBACK === 'true' && process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
                const modelId = process.env.CLOUDFLARE_WORKERS_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct';
                adapters['cloudflare-workers-ai'] = createOpenAICompatibleAdapter({ providerId: 'cloudflare-workers-ai', baseUrl: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`, apiKey: process.env.CLOUDFLARE_API_TOKEN });
                registry.push({ providerId: 'cloudflare-workers-ai', modelId, status: 'active', adapter: 'openai-compatible', capabilities: ['json_output'], qualityClass: 'C', qualityProvisional: true, dataPolicy: 'unknown', costTier: 'paid', trainingOptOutConfirmed: false, lastVerifiedAt: new Date().toISOString().slice(0,10), secretEnvRef: 'CLOUDFLARE_API_TOKEN' });
              }
              const routed = await routeCall({
                requestId: `app-builder-slice-${project.id}`,
                system: 'Return structured JSON only. Untrusted user goal.',
                prompt, json: true, maxOutputTokens: 8192,
                metadata: { role: 'app_builder_slice', projectId: project.id },
              }, {
                registry, adapters, state: codeRouterState, required: ['json_output'], maxCalls: Math.min(7, Math.max(1, registry.length)), timeoutMs: 60_000,
                sensitivity: 'normal', paidApproved: process.env.ENABLE_EXTERNAL_MODEL_FALLBACK === 'true' ? ['groq', 'cloudflare-workers-ai'] : [], deadlineAt: Date.now() + 65_000,
              });
              if (routed.status !== 'ok' || !routed.response) {
                const d = routed.decision;
                const why = [`router:${routed.status}`, d.reason, ...d.attempts.map((a) => `${a.model}:${a.status}${a.errorClass ? `/${a.errorClass}` : ''}`), ...d.rejected.slice(0, 3).map((r) => `rejected ${r.model}:${r.reason}`)].filter(Boolean).join('; ').slice(0, 200);
                console.warn(JSON.stringify({ type: 'app_builder_slice_unavailable', why }));
                return { notes: `model call failed (${why})` };
              }
              const out = routed.response.output as any;
              if (out && typeof out === 'object' && out.files && typeof out.files === 'object') {
                return { files: out.files as Record<string, string>, notes: String(out.notes || '') };
              }
              console.warn(JSON.stringify({ type: 'app_builder_slice_bad_shape', outputType: typeof out }));
              return { notes: `model answered but not with {files:{...}} (got ${typeof out})` };
            }
          : undefined,
      });

      const sliceReason = !modelSliceEnabled ? 'the model step is disabled on this server (CODE_EXECUTOR=model_patch and APP_BUILDER_MODEL_SLICE=true are required)' : result.slice.reason;
      const goalImplemented = result.slice.status === 'applied';
      await recordDiagnostic({ operationId, event: 'GOAL_IMPLEMENTATION', stage: 'generation', status: goalImplemented ? 'PASS' : 'WARN', ...(goalImplemented ? {} : { errorCode: result.slice.status === 'failed' ? 'SLICE_FAILED' : 'SLICE_SKIPPED' }) });
      if (!goalImplemented) console.warn(JSON.stringify({ type: 'app_builder_goal_not_implemented', operationId, status: result.slice.status, reason: sliceReason.slice(0, 200) }));
      const expectedFiles = Object.entries(result.files) as [string, string][];
      if (!expectedFiles.length || !result.zipBuffer.length) { await recordDiagnostic({ operationId, event: 'ZIP_VALIDATION_FAILED', stage: 'zip', status: 'FAIL', errorCode: 'EMPTY_ZIP' }); return res.status(422).json({ success: false, error: 'Generated ZIP is empty', code: 'ZIP_INVALID', operationId }); }
      let validZip = false;
      try {
        const archive = await JSZip.loadAsync(result.zipBuffer, { checkCRC32: true });
        const entries = Object.values(archive.files).filter(f => !f.dir);
        validZip = entries.length >= expectedFiles.length && expectedFiles.every(([path, content]) => {
          const file = archive.file(path);
          return Boolean(file && !file.dir && typeof content === 'string');
        });
        if (validZip) for (const [path, content] of expectedFiles) {
          if (!Buffer.from(await archive.file(path)!.async('nodebuffer')).equals(Buffer.from(content))) { validZip = false; break; }
        }
      } catch { validZip = false; }
      if (!validZip) { await recordDiagnostic({ operationId, event: 'ZIP_VALIDATION_FAILED', stage: 'zip', status: 'FAIL', errorCode: 'ZIP_INVALID' }); return res.status(422).json({ success: false, error: 'Generated ZIP failed integrity checks', code: 'ZIP_INVALID', operationId }); }
      await recordDiagnostic({ operationId, event: 'ZIP_INTEGRITY_CHECKED', stage: 'zip', status: 'PASS', bytes: result.zipBuffer.length, fileCount: expectedFiles.length });
      const artifactId = `app_zip_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
      await recordDiagnostic({ operationId, event: 'ARTIFACT_SAVE_STARTED', stage: 'storage', status: 'STARTED' });
      await saveArtifact({
        projectId: project.id,
        artifactId,
        filename: `${result.ir.name || 'app'}-source.zip`,
        mime: 'application/zip',
        data: new Uint8Array(result.zipBuffer),
        createdBy: 'app_builder_pipeline',
        derivedFrom: [`project:${project.id}`, `stack:${result.stack}`],
      });

      const readback = await readArtifactBytes(artifactId);
      if (!readback || readback.project_id !== project.id || !Buffer.from(readback.data).equals(Buffer.from(result.zipBuffer))) { await recordDiagnostic({ operationId, event: 'ARTIFACT_READBACK_FAILED', stage: 'storage', status: 'FAIL', errorCode: 'READBACK_MISMATCH' }); throw new Error('ARTIFACT_READBACK_MISMATCH'); }
      await recordDiagnostic({ operationId, event: 'ARTIFACT_SAVE_VERIFIED', stage: 'storage', status: 'PASS', bytes: readback.data.length });
      const linked = await linkDiagnosticArtifact(operationId, artifactId);
      await recordDiagnostic({ operationId, event: 'ARTIFACT_LINKED', stage: 'storage', status: linked ? 'PASS' : 'WARN', ...(linked ? {} : { errorCode: 'LINK_FAILED' }) });
      const downloadUrl = `/api/projects/${encodeURIComponent(project.id)}/artifacts/${encodeURIComponent(artifactId)}/download`;
      res.status(201).json({
        success: true,
        data: {
          operationId,
          engine: 'pipeline',
          stack: result.stack,
          ir: result.ir,
          steps: result.steps,
          log: result.log,
          fileCount: Object.keys(result.files).length,
          downloadUrl,
          goalImplemented,
          sliceStatus: result.slice.status,
          note: goalImplemented
            ? 'IR → scaffold → model-written files → ZIP. Upload to GitHub and connect Render/Railway manually. Generated code was not executed on BiForge.'
            : `WARNING: this ZIP is only a generic starter. Your goal was NOT implemented: ${sliceReason}. Upload to GitHub and connect Render/Railway manually only if a starter is what you need.`,
          // shape compatibility with older UI expecting codeTask
          taskId: artifactId,
          codeTask: { id: artifactId, status: 'DELIVERED', statusReason: 'app_builder_pipeline' },
        },
      });
    } catch (error) { projectError(res, error); }
  });

  /** Download an artifact by id (App Builder ZIP and other binary artifacts). */
  app.get('/api/projects/:projectId/artifacts/:artifactId/download', async (req, res) => {
    const operationId = newOperationId(); const startedAt = Date.now();
    res.setHeader('X-BiForge-Operation-Id', operationId);
    await recordDiagnostic({ operationId, event: 'DOWNLOAD_REQUESTED', stage: 'download', status: 'STARTED' });
    res.once('finish', () => { void recordDiagnostic({ operationId, event: 'DOWNLOAD_RESPONSE_FINISHED', stage: 'download', status: res.statusCode < 400 ? 'PASS' : 'FAIL', durationMs: Date.now() - startedAt, errorCode: res.statusCode < 400 ? undefined : `HTTP_${res.statusCode}` }); });
    res.once('close', () => { if (!res.writableFinished) void recordDiagnostic({ operationId, event: 'DOWNLOAD_INTERRUPTED', stage: 'download', status: 'FAIL', errorCode: 'CONNECTION_CLOSED' }); });
    try {
      const project = await getProject(req.params.projectId);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found', code: 'NOT_FOUND' });
      const bytes = await readArtifactBytes(req.params.artifactId);
      if (!bytes || (bytes as any).project_id !== project.id) return res.status(404).json({ success: false, error: 'Artifact not found', code: 'NOT_FOUND' });
      if ((bytes as any).mime === 'application/zip') {
        const data = Buffer.from((bytes as any).data);
        let valid = data.length > 0;
        try { if (valid) await JSZip.loadAsync(data, { checkCRC32: true }); } catch { valid = false; }
        if (!valid) { await recordDiagnostic({ operationId, event: 'DOWNLOAD_FAILED', stage: 'download', status: 'FAIL', errorCode: 'ZIP_INVALID' }); return res.status(422).json({ success: false, error: 'Stored ZIP is invalid', code: 'ZIP_INVALID', operationId }); }
      }
      const filename = String((bytes as any).filename || 'download.bin');
      const mime = String((bytes as any).mime || 'application/octet-stream');
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', contentDisposition(filename));
      res.setHeader('Content-Length', String((bytes as any).data.length));
      res.send(Buffer.from((bytes as any).data));
    } catch (error) { projectError(res, error); }
  });

  /** P54: every code attempt of the project (the Delivery tab). */
  app.get('/api/projects/:projectId/code', async (req, res) => {
    try {
      const project = await getProject(req.params.projectId);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found', code: 'NOT_FOUND' });
      res.json({ success: true, data: await listProjectCodeTasks(project.id) });
    } catch (error) { projectError(res, error); }
  });
  /**
   * P54: a hand-off task without a plan. Creates the task, builds the Task Package from a brief and starts a `manual` code task
   * (WAITING_HUMAN). BiForge writes nothing to GitHub: the person works in any tool and returns a PR or a branch.
   */
  app.post('/api/projects/:projectId/code/manual', async (req, res) => {
    try {
      const input = z.object({
        goal: z.string().trim().min(1).max(4000),
        constraints: z.string().trim().max(4000).optional(),
        acceptance_criteria: z.string().trim().max(4000).optional(),
        allowed_paths: z.array(z.string().trim().min(1).max(300)).max(100).optional(),
        idempotency_key: z.string().trim().min(1).max(200).optional(),
      }).strict().parse(req.body);
      const project = await getProject(req.params.projectId);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found', code: 'NOT_FOUND' });
      const passport = (project.state as any)?.passport;
      if (passport?.status !== 'confirmed') return res.status(409).json({ success: false, error: 'Confirm the project passport before creating a hand-off task.', code: 'PASSPORT_NOT_CONFIRMED' });
      if (passport?.executor !== 'manual') return res.status(409).json({ success: false, error: 'Hand-off tasks need «How code is written» set to Manual in the project settings.', code: 'EXECUTOR_MISMATCH' });
      const created = await createTask({
        projectId: project.id, idempotencyKey: input.idempotency_key ?? `code-manual-${crypto.randomUUID()}`, title: input.goal.slice(0, 200),
        input: { task: input.goal, artifactRefs: [], stateVersion: Number(project.state_version), profile: 'code_author', profileVersion: '1', criteria: ['The result comes as a pull request or branch from the task branch', 'Required checks pass at the delivered commit', 'A human reviews the result and decides'] },
        actor: 'human',
      });
      const pkg = buildTaskPackageFromBrief({
        taskId: created.task.id, projectId: project.id, goal: input.goal, constraints: input.constraints,
        acceptanceCriteria: input.acceptance_criteria, allowedPaths: input.allowed_paths, sensitivity: 'normal',
      });
      const started = await startCodeTask({ projectId: project.id, taskId: created.task.id, package: pkg, baseBranch: 'main', actorKind: 'human' });
      res.status(started.created ? 201 : 200).json({ success: true, data: { taskId: created.task.id, codeTask: started.codeTask, created: started.created } });
    } catch (error) { projectError(res, error); }
  });

  app.post('/api/projects/:projectId/tasks/:taskId/code/start', async (req, res) => {
    try {
      const input = z.object({ package: z.unknown(), base_branch: z.string().max(100).optional() }).strict().parse(req.body);
      const task = await taskOfProject(req, res); if (!task) return;
      const out = await startCodeTask({ projectId: task.projectId, taskId: task.id, package: input.package, baseBranch: input.base_branch, actorKind: 'human' }, { modelCaller: callCodeAuthor });
      res.status(out.created ? 201 : 200).json({ success: true, data: out.codeTask, created: out.created });
    } catch (error) { projectError(res, error); }
  });
  /** P20: build a Task Package draft from a structured brief (brief_writer profile, pure). */
  app.post('/api/projects/:projectId/tasks/:taskId/code/brief', async (req, res) => {
    try {
      const task = await taskOfProject(req, res); if (!task) return;
      const body = z.object({
        goal: z.string().min(1).max(20_000),
        constraints: z.string().max(20_000).optional(),
        acceptance_criteria: z.string().max(50_000).optional(),
        allowed_paths: z.array(z.string()).max(100).optional(),
        sensitivity: z.enum(['normal', 'high']).optional(),
        acceptance_tests: z.array(z.object({ path: z.string(), content: z.string() })).max(50).optional(),
        context_files: z.array(z.object({ path: z.string(), content: z.string() })).max(50).optional(),
        limits: z.object({ maxFiles: z.number().int().positive().max(50).optional(), maxChangedLines: z.number().int().positive().max(5000).optional() }).optional(),
      }).strict().parse(req.body);
      type FilePair = { path: string; content: string };
      const fileList = (xs: Array<{ path?: string; content?: string }> | undefined): FilePair[] | undefined => {
        if (!xs) return undefined;
        return xs.map((f) => ({ path: String(f.path ?? ''), content: String(f.content ?? '') }));
      };
      const pkg = buildTaskPackageFromBrief({
        taskId: task.id, projectId: task.projectId, goal: body.goal, constraints: body.constraints,
        acceptanceCriteria: body.acceptance_criteria, allowedPaths: body.allowed_paths, sensitivity: body.sensitivity,
        acceptanceTests: fileList(body.acceptance_tests), contextFiles: fileList(body.context_files), limits: body.limits,
      });
      res.json({ success: true, data: pkg });
    } catch (error) { projectError(res, error); }
  });
  app.post('/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/approve', async (req, res) => {
    try {
      const task = await taskOfProject(req, res); if (!task) return;
      const out = await approveCodePackage({ projectId: task.projectId, taskId: task.id, codeTaskId: req.params.codeTaskId, actorKind: 'human', actor: 'human' });
      res.json({ success: true, data: out });
    } catch (error) { projectError(res, error); }
  });
  app.post('/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/commit-package', async (req, res) => {
    try {
      const task = await taskOfProject(req, res); if (!task) return;
      const out = await commitApprovedPackage({ projectId: task.projectId, taskId: task.id, codeTaskId: req.params.codeTaskId, actorKind: 'human' });
      res.json({ success: true, data: out });
    } catch (error) { projectError(res, error); }
  });
  app.get('/api/projects/:projectId/tasks/:taskId/code/:codeTaskId', async (req, res) => {
    try {
      const task = await taskOfProject(req, res); if (!task) return;
      res.json({ success: true, data: await getCodeTask(task.projectId, task.id, req.params.codeTaskId) });
    } catch (error) { projectError(res, error); }
  });
  app.get('/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/download', async (req, res) => {
    try {
      const task = await taskOfProject(req, res); if (!task) return;
      const codeTask = await getCodeTask(task.projectId, task.id, req.params.codeTaskId);
      const bundle = await readArtifactBytes(generatedSourceArtifactId(codeTask.id));
      if (!bundle || bundle.project_id !== task.projectId) return res.status(404).json({ success: false, error: 'Generated source bundle is not available yet.', code: 'BUNDLE_NOT_FOUND' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="generated-program-${task.id}.zip"`);
      res.setHeader('Content-Length', String(bundle.data.length));
      res.send(bundle.data);
    } catch (error) { projectError(res, error); }
  });
  app.get('/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/package', async (req, res) => {
    try {
      const task = await taskOfProject(req, res); if (!task) return;
      res.json({ success: true, data: await exportPackage(task.projectId, task.id, req.params.codeTaskId, 'human') });
    } catch (error) { projectError(res, error); }
  });
  app.post('/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/result', async (req, res) => {
    try {
      const input = codeResultSchema.parse(req.body);
      const task = await taskOfProject(req, res); if (!task) return;
      const result = input.kind === 'pr' ? { kind: 'pr' as const, prNumber: input.pr_number, note: input.note }
        : input.kind === 'branch' ? { kind: 'branch' as const, branch: input.branch, note: input.note }
        : { kind: 'diff' as const, diff: input.diff, title: input.title, note: input.note };
      res.json({ success: true, data: await submitCodeResult({ projectId: task.projectId, taskId: task.id, codeTaskId: req.params.codeTaskId, result, actorKind: 'human' }) });
    } catch (error) { projectError(res, error); }
  });
  app.post('/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/refresh', async (req, res) => {
    try {
      z.object({}).strict().parse(req.body ?? {});
      const task = await taskOfProject(req, res); if (!task) return;
      const out = await refreshCodeTask({ projectId: task.projectId, taskId: task.id, codeTaskId: req.params.codeTaskId, actorKind: 'human' });
      res.json({ success: true, data: out.codeTask, changed: out.changed });
    } catch (error) { projectError(res, error); }
  });
  app.post('/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/cancel', async (req, res) => {
    try {
      const input = z.object({ reason: z.string().trim().min(1).max(500) }).strict().parse(req.body);
      const task = await taskOfProject(req, res); if (!task) return;
      res.json({ success: true, data: await cancelCodeTask({ projectId: task.projectId, taskId: task.id, codeTaskId: req.params.codeTaskId, reason: input.reason, actorKind: 'human' }) });
    } catch (error) { projectError(res, error); }
  });
  /** P21: structured reviewer on a DELIVERED code task (gates + delivery → findings). */
  app.post('/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/review', async (req, res) => {
    try {
      const input = z.object({ notes: z.string().max(2000).optional() }).strict().parse(req.body ?? {});
      const task = await taskOfProject(req, res); if (!task) return;
      const out = await runCodeTaskReview({
        projectId: task.projectId, taskId: task.id, codeTaskId: req.params.codeTaskId, actorKind: 'human', notes: input.notes,
      });
      res.json({ success: true, data: out.codeTask, findings: out.findings });
    } catch (error) { projectError(res, error); }
  });
  /** P21: human decision accept | repair | reject (TZ 11.5 step 8). Merge stays in GitHub. */
  app.post('/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/decide', async (req, res) => {
    try {
      const input = z.object({
        decision: z.enum(['accept', 'repair', 'reject']),
        reason: z.string().trim().max(1000).optional(),
      }).strict().parse(req.body);
      const task = await taskOfProject(req, res); if (!task) return;
      const data = await decideCodeTask({
        projectId: task.projectId, taskId: task.id, codeTaskId: req.params.codeTaskId,
        decision: input.decision, reason: input.reason, actorKind: 'human',
      });
      res.json({ success: true, data });
    } catch (error) { projectError(res, error); }
  });
  /** P22 / BX-23: Repair Loop — flaky CI restart, next manual package, or diagnostic stop. */
  app.post('/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/repair', async (req, res) => {
    try {
      const input = z.object({
        trigger: z.enum(['ci', 'reviewer', 'human']).optional(),
        flaky: z.boolean().optional(),
        diff_hash: z.string().regex(/^[0-9a-f]{64}$/i).optional(),
        failing_tests: z.number().int().min(0).max(100_000).optional(),
        log_excerpt: z.string().max(2000).optional(),
        links: z.array(z.string().max(300)).max(10).optional(),
      }).strict().parse(req.body ?? {});
      const task = await taskOfProject(req, res); if (!task) return;
      const out = await requestRepair({
        projectId: task.projectId, taskId: task.id, codeTaskId: req.params.codeTaskId, actorKind: 'human',
        trigger: input.trigger, flaky: input.flaky, diffHash: input.diff_hash, failingTests: input.failing_tests,
        logExcerpt: input.log_excerpt, links: input.links,
      });
      res.json({ success: true, data: out });
    } catch (error) { projectError(res, error); }
  });

  app.get('/api/projects/:projectId/artifacts', async (req, res) => {
    try { res.json({ success: true, data: await listProjectArtifacts(req.params.projectId) }); } catch (error) { projectError(res, error); }
  });

  app.get('/api/projects/:projectId/artifacts/:artifactId', async (req, res) => {
    try {
      const a = await readArtifact(req.params.artifactId);
      if (!a || a.project_id !== req.params.projectId) return res.status(404).json({ success: false, error: 'Artifact not found', code: 'NOT_FOUND' });
      res.json({ success: true, data: { artifact_id: a.artifact_id, version: a.version, filename: a.filename, hash: a.hash, text: a.text } });
    } catch (error) { projectError(res, error); }
  });

  app.get('/api/projects/:projectId/ledger', async (req, res) => {
    try { res.json({ success: true, data: await listProjectLedger(req.params.projectId) }); } catch (error) { projectError(res, error); }
  });

  function projectError(res: Response, error: unknown) {
    const e = error as { code?: string; message?: string; expectedVersion?: number; actualVersion?: number; name?: string };
    if (error instanceof StateVersionConflict || e?.code === 'CONFLICT') {
      return res.status(409).json({ success: false, error: 'State version conflict', code: 'CONFLICT', expected_version: e.expectedVersion, actual_version: e.actualVersion });
    }
    if (error instanceof AnalysisError) return res.status(error.status).json({ success: false, error: error.message, code: error.code });
    if (e?.name === 'PlanError' || e?.name === 'TaskError' || e?.name === 'CodeTaskError') return res.status((error as any).status || 409).json({ success: false, error: e.message || 'Task operation failed', code: e.code || 'TASK_ERROR', details: (error as any).details });
    if (e?.code === 'VALIDATION') return res.status(422).json({ success: false, error: 'The proposed change was refused by the State policy', code: 'VALIDATION', details: ((error as any).errors ?? []).map((x: any) => x.code) });
    if (e?.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: 'Project not found', code: 'NOT_FOUND' });
    if (e?.name === 'ZodError' || e?.name === 'ValidationError') return res.status(400).json({ success: false, error: 'Invalid project data', code: 'VALIDATION' });
    console.error(JSON.stringify({ type: 'project_api_error', message: String(e?.message || error).slice(0, 180) }));
    return res.status(500).json({ success: false, error: 'Project operation failed', code: 'INTERNAL' });
  }
}
