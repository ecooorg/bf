import crypto from 'node:crypto';
import { z } from 'zod';
import { getPool } from './database.ts';
import { getProject } from './projectRepository.ts';
import { getTask, inTx, lockTask, type Db } from './taskService.ts';
import { readArtifact, saveArtifact, sha256Hex } from './artifactRepository.ts';
import {
  CODE_EXECUTOR_IDS, CodeExecutorError, applyFileDiff, buildPackageMd, canExecutorTransition, countChanges, createManualExecutor, createModelPatchExecutor, packageHash, parseUnifiedDiff,
  taskPackageSchema, validateChangeSet, validateModelPatch, type ChangeFile, type CodeExecutor, type CodeExecutorId, type ExecutorState, type TaskPackage, type Violation,
} from './codeExecutor.ts';
import {
  commitChangesToBranch, compareToBase, diffUploadEnabled, findPullRequestByBranch, githubConfigFromEnv, openPullRequest, readBranchHead, readPullRequest, readTextFile,
  taskBranchName, type BranchChange, type ComparedFile, type GitHubAppConfig,
} from './githubIntegration.ts';

// Code Delivery, executor side (TZ 11.3-11.5; P18 / BX-21.a). A human starts a `manual` run for a task with a Task Package, takes PACKAGE.md
// into any tool and returns a PR, a branch or a unified diff. Nothing here runs code or calls a model. Merge is never done by this module.
const STATUS = {
  NOT_FOUND: 404, HUMAN_REQUIRED: 403, VALIDATION: 400, PACKAGE_INVALID: 400, PACKAGE_SECRET: 400, PACKAGE_TOO_LARGE: 400, APPROVAL_REQUIRED: 409,
  EXECUTOR_UNAVAILABLE: 409, CODE_TASK_ACTIVE: 409, CODE_TASK_CLOSED: 409, TASK_NOT_ACTIVE: 409, BUDGET_EXCEEDED: 409, GITHUB_NOT_CONFIGURED: 503,
  DIFF_UPLOAD_DISABLED: 409, PR_MISMATCH: 409, PR_NOT_OPEN: 409, BRANCH_MISMATCH: 409, BRANCH_NOT_FOUND: 404, GITHUB_ERROR: 502, ARTIFACT_ERROR: 409,
} as const;
export type CodeTaskErrorCode = keyof typeof STATUS;
export class CodeTaskError extends Error {
  readonly status: number;
  readonly code: CodeTaskErrorCode;
  readonly details: Record<string, unknown>;
  constructor(code: CodeTaskErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message); this.name = 'CodeTaskError'; this.code = code; this.details = details; this.status = STATUS[code] ?? 400;
  }
}

export interface CodeTaskDeps {
  githubConfig?: () => GitHubAppConfig | null;
  fetcher?: typeof fetch;
  /** Diff upload writes to GitHub (11.7): off unless GITHUB_DIFF_UPLOAD=true. */
  diffUpload?: () => boolean;
}

const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const noteSchema = z.string().trim().max(500);
const newId = () => `code_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
const OPEN_STATES = ['WAITING_HUMAN', 'RUNNING', 'BLOCKED'] as const;
const requireHuman = (kind: unknown) => { if (kind !== 'human') throw new CodeTaskError('HUMAN_REQUIRED', 'Code delivery is a human action'); };
const BASE_BRANCH_RE = /^[A-Za-z0-9._/-]{1,100}$/;
const baseBranchSchema = z.string().refine((b) => BASE_BRANCH_RE.test(b) && !b.startsWith('biforge/') && !b.includes('..') && !b.startsWith('/') && !b.endsWith('/'), 'invalid base branch');

const mapCodeTask = (r: any) => ({
  id: r.id as string, projectId: r.project_id as string, taskId: r.task_id as string, runId: (r.run_id ?? null) as string | null, attempt: r.attempt as number,
  executor: r.executor as CodeExecutorId, status: r.status as ExecutorState, delivery: (r.delivery ?? null) as 'pr' | 'branch' | 'diff' | null,
  baseBranch: r.base_branch as string, branch: (r.branch ?? null) as string | null, headSha: (r.head_sha ?? null) as string | null,
  prNumber: (r.pr_number ?? null) as number | null, prUrl: (r.pr_url ?? null) as string | null, executorNote: (r.executor_note ?? null) as string | null,
  filesChanged: (r.files_changed ?? null) as number | null, linesChanged: (r.lines_changed ?? null) as number | null,
  statusReason: (r.status_reason ?? null) as string | null, violations: (r.violations ?? []) as Violation[],
  packageHash: r.package_hash as string, packageArtifactId: (r.package_artifact_id ?? null) as string | null, packageArtifactVersion: (r.package_artifact_version ?? null) as number | null,
  createdAt: r.created_at as Date, updatedAt: r.updated_at as Date,
});
export type CodeTask = ReturnType<typeof mapCodeTask>;

async function audit(db: Db, projectId: string, type: string, details: Record<string, unknown>) {
  await db.query('INSERT INTO audit_events(id,project_id,event_type,actor,details) VALUES($1,$2,$3,$4,$5::jsonb)',
    [`audit_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`, projectId, type, 'human', JSON.stringify(details)]);
}

function parsePackage(input: unknown): TaskPackage {
  const r = taskPackageSchema.safeParse(input);
  if (!r.success) throw new CodeTaskError('PACKAGE_INVALID', 'The Task Package does not match the schema', { issues: r.error.issues.slice(0, 10).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`) });
  return r.data;
}
function renderPackage(taskId: string, pkg: TaskPackage): string {
  try { return buildPackageMd(taskId, pkg); }
  catch (e) { if (e instanceof CodeExecutorError) throw new CodeTaskError(e.code as CodeTaskErrorCode, e.message, e.details); throw e; }
}

/** P19: `model_patch` is available only when CODE_EXECUTOR=model_patch (ADR-10 interim; final enablement after E-01). Passport may request it; otherwise default manual. */
function selectExecutorId(passportExecutor: unknown): CodeExecutorId {
  const requested = (CODE_EXECUTOR_IDS as readonly string[]).includes(passportExecutor as string) ? (passportExecutor as CodeExecutorId) : 'manual';
  if (requested === 'model_patch') {
    if (process.env.CODE_EXECUTOR !== 'model_patch') {
      throw new CodeTaskError('EXECUTOR_UNAVAILABLE', 'model_patch is disabled; set CODE_EXECUTOR=model_patch after E-01 / ADR-10 approval, or use manual', { executor: 'model_patch' });
    }
    return 'model_patch';
  }
  return 'manual';
}

/** max_code_tasks (TZ 8.4): project scope counts tasks that have code runs, task scope counts executor runs of the task. */
async function checkCodeTaskBudget(db: Db, projectId: string, taskId: string) {
  const limit = async (scope: 'project' | 'task', scopeId: string): Promise<number | null> => {
    const r = (await db.query('SELECT limits FROM budgets WHERE project_id=$1 AND scope=$2 AND scope_id=$3', [projectId, scope, scopeId])).rows[0];
    const v = r?.limits?.max_code_tasks;
    return typeof v === 'number' ? v : null;
  };
  const pl = await limit('project', projectId);
  if (pl !== null) {
    const used = Number((await db.query('SELECT count(DISTINCT task_id)::int AS n FROM code_tasks WHERE project_id=$1', [projectId])).rows[0].n);
    const has = Number((await db.query('SELECT count(*)::int AS n FROM code_tasks WHERE task_id=$1', [taskId])).rows[0].n) > 0;
    if (!has && used + 1 > pl) throw new CodeTaskError('BUDGET_EXCEEDED', 'The code task budget of the project is used up; a human must raise it', { scope: 'project', limit: pl, used });
  }
  const tl = await limit('task', taskId);
  if (tl !== null) {
    const used = Number((await db.query('SELECT count(*)::int AS n FROM code_tasks WHERE task_id=$1', [taskId])).rows[0].n);
    if (used + 1 > tl) throw new CodeTaskError('BUDGET_EXCEEDED', 'The code task budget of the task is used up; a human must raise it', { scope: 'task', limit: tl, used });
  }
}

// ---- start ----
export async function startCodeTask(input: { projectId: string; taskId: string; package: unknown; baseBranch?: string; actorKind: string }): Promise<{ codeTask: CodeTask; created: boolean }> {
  requireHuman(input.actorKind);
  const projectId = idSchema.parse(input.projectId), taskId = idSchema.parse(input.taskId);
  const baseBranch = baseBranchSchema.parse(input.baseBranch ?? 'main');
  const pkg = parsePackage(input.package);
  if (pkg.sensitivity === 'high') throw new CodeTaskError('APPROVAL_REQUIRED', 'Handing a package with sensitivity high to an external tool needs a separate approval (TZ 13.6); not available yet');
  const md = renderPackage(taskId, pkg);
  const hash = packageHash(pkg);
  const project = await getProject(projectId);
  if (!project) throw new CodeTaskError('NOT_FOUND', 'Project not found');
  const executorId = selectExecutorId((project.state as any)?.passport?.executor);
  const task = await getTask(taskId);
  if (!task || task.projectId !== projectId) throw new CodeTaskError('NOT_FOUND', 'Task not found');
  if (task.state === 'CANCELLED') throw new CodeTaskError('TASK_NOT_ACTIVE', 'The task is cancelled');

  let artifact: { artifactId: string; version: number };
  try {
    artifact = await saveArtifact({ projectId, artifactId: `pkg_${sha256Hex(Buffer.from(taskId)).slice(0, 40)}`, filename: 'PACKAGE.md', mime: 'text/markdown', text: md, createdBy: 'biforge:code_executor', derivedFrom: [`task:${taskId}`] });
  } catch (e) {
    if ((e as Error)?.name === 'ArtifactFormatError') throw new CodeTaskError('ARTIFACT_ERROR', 'PACKAGE.md could not be stored as an artifact', { reason: (e as any).code ?? null });
    throw e;
  }

  try {
    return await inTx(async (db) => {
      const locked = await lockTask(db, taskId);
      if (locked.projectId !== projectId) throw new CodeTaskError('NOT_FOUND', 'Task not found');
      const open = (await db.query(`SELECT * FROM code_tasks WHERE task_id=$1 AND status = ANY($2::text[]) ORDER BY attempt DESC LIMIT 1`, [taskId, [...OPEN_STATES]])).rows[0];
      if (open) {
        if (open.package_hash === hash && open.executor === executorId && open.base_branch === baseBranch && open.status !== 'RUNNING') return { codeTask: mapCodeTask(open), created: false };
        throw new CodeTaskError('CODE_TASK_ACTIVE', 'This task already has an open code run; finish or cancel it first', { codeTaskId: open.id, status: open.status });
      }
      await checkCodeTaskBudget(db, projectId, taskId);
      const attempt = Number((await db.query('SELECT COALESCE(max(attempt),0)::int + 1 AS n FROM code_tasks WHERE task_id=$1', [taskId])).rows[0].n);
      const executor = executorFor(executorId, {
        async createWaiting(ref, run, ex) {
          const id = newId();
          await db.query(
            `INSERT INTO code_tasks(id,project_id,task_id,run_id,attempt,executor,status,base_branch,package_hash,package,package_artifact_id,package_artifact_version)
             VALUES($1,$2,$3,$4,$5,$6,'WAITING_HUMAN',$7,$8,$9::jsonb,$10,$11)`,
            [id, ref.projectId, ref.taskId, run.runId, run.attempt, ex, ref.baseBranch, ref.packageHash, JSON.stringify(pkg), artifact.artifactId, artifact.version]);
          return { codeTaskId: id };
        },
        async read() { return null; },
      });
      const handle = await executor.start({ taskId, projectId, packageHash: hash, baseBranch }, { runId: null, attempt });
      await audit(db, projectId, 'code_task.started', { code_task_id: handle.codeTaskId, task_id: taskId, executor: executorId, attempt, package_hash: hash });
      return { codeTask: mapCodeTask((await db.query('SELECT * FROM code_tasks WHERE id=$1', [handle.codeTaskId])).rows[0]), created: true };
    });
  } catch (e: any) {
    if (e?.code === '23505') throw new CodeTaskError('CODE_TASK_ACTIVE', 'This task already has an open code run');
    throw e;
  }
}

function executorFor(id: CodeExecutorId, store: Parameters<typeof createManualExecutor>[0]): CodeExecutor {
  if (id === 'model_patch') return createModelPatchExecutor(store);
  return createManualExecutor(store);
}

// ---- reads ----
async function loadRow(db: Db, projectId: string, taskId: string, codeTaskId: string, lock = false) {
  const r = (await db.query(`SELECT * FROM code_tasks WHERE id=$1 AND project_id=$2 AND task_id=$3${lock ? ' FOR UPDATE' : ''}`, [idSchema.parse(codeTaskId), idSchema.parse(projectId), idSchema.parse(taskId)])).rows[0];
  if (!r) throw new CodeTaskError('NOT_FOUND', 'Code task not found');
  return r;
}
export async function listCodeTasks(projectId: string, taskId: string): Promise<CodeTask[]> {
  const pool = await getPool();
  const r = await pool.query('SELECT * FROM code_tasks WHERE project_id=$1 AND task_id=$2 ORDER BY attempt DESC LIMIT 100', [idSchema.parse(projectId), idSchema.parse(taskId)]);
  return r.rows.map(mapCodeTask);
}
export async function getCodeTask(projectId: string, taskId: string, codeTaskId: string): Promise<CodeTask> {
  return mapCodeTask(await loadRow(await getPool(), projectId, taskId, codeTaskId));
}
/** PACKAGE.md for hand-over (11.3), read from the artifact registry with its integrity check. Never committed to the repository. */
export async function exportPackage(projectId: string, taskId: string, codeTaskId: string, actorKind: string): Promise<{ filename: string; text: string; hash: string; packageHash: string }> {
  requireHuman(actorKind);
  const row = await loadRow(await getPool(), projectId, taskId, codeTaskId);
  let text: string;
  try {
    const a = row.package_artifact_id ? await readArtifact(row.package_artifact_id, row.package_artifact_version ?? undefined) : null;
    text = a ? a.text : renderPackage(taskId, row.package as TaskPackage);
  } catch (e) {
    if ((e as any)?.code === 'INTEGRITY') throw new CodeTaskError('ARTIFACT_ERROR', 'PACKAGE.md failed its integrity check', { problems: (e as any).problems ?? [] });
    throw e;
  }
  return { filename: 'PACKAGE.md', text, hash: sha256Hex(Buffer.from(text, 'utf8')), packageHash: row.package_hash };
}

// ---- state writes (always with the row locked, the transition checked) ----
async function settle(
  codeTaskId: string,
  to: 'DELIVERED' | 'BLOCKED' | 'FAILED',
  fields: { delivery?: 'pr' | 'branch' | 'diff'; branch?: string; headSha?: string; prNumber?: number | null; prUrl?: string | null; files?: number; lines?: number; note?: string | null; reason?: string; violations?: Violation[] },
  opts: { from?: ExecutorState[]; event: string; extra?: Record<string, unknown> },
): Promise<CodeTask> {
  return inTx(async (db) => {
    const row = (await db.query('SELECT * FROM code_tasks WHERE id=$1 FOR UPDATE', [codeTaskId])).rows[0];
    if (!row) throw new CodeTaskError('NOT_FOUND', 'Code task not found');
    const allowedFrom = opts.from ?? ['WAITING_HUMAN', 'BLOCKED'];
    if (!allowedFrom.includes(row.status) || !canExecutorTransition(row.status, to)) throw new CodeTaskError('CODE_TASK_CLOSED', 'The code run is not open for this change', { status: row.status });
    const upd = await db.query(
      `UPDATE code_tasks SET status=$2, delivery=COALESCE($3,delivery), branch=COALESCE($4,branch), head_sha=COALESCE($5,head_sha),
              pr_number=COALESCE($6,pr_number), pr_url=COALESCE($7,pr_url), files_changed=COALESCE($8,files_changed), lines_changed=COALESCE($9,lines_changed),
              executor_note=COALESCE($10,executor_note), status_reason=$11, violations=$12::jsonb, updated_at=now() WHERE id=$1 RETURNING *`,
      [codeTaskId, to, fields.delivery ?? null, fields.branch ?? null, fields.headSha ?? null, fields.prNumber ?? null, fields.prUrl ?? null, fields.files ?? null, fields.lines ?? null,
        fields.note ?? null, to === 'DELIVERED' ? null : (fields.reason ?? null), JSON.stringify(to === 'DELIVERED' ? [] : (fields.violations ?? []))]);
    await audit(db, row.project_id, opts.event, { code_task_id: codeTaskId, task_id: row.task_id, to, delivery: fields.delivery ?? null, files: fields.files ?? null, lines: fields.lines ?? null,
      violations: (fields.violations ?? []).map((v) => v.code).slice(0, 20), ...(opts.extra ?? {}) });
    return mapCodeTask(upd.rows[0]);
  });
}
const blockRow = (id: string, reason: string, violations: Violation[], delivery?: 'pr' | 'branch' | 'diff', from?: ExecutorState[]) =>
  settle(id, 'BLOCKED', { reason, violations, ...(delivery ? { delivery } : {}) }, { event: 'code_task.blocked', ...(from ? { from } : {}) });

function changeSetFromCompare(c: { files: ComparedFile[]; truncated: boolean }): { files: ChangeFile[]; extra: Violation[] } {
  const files: ChangeFile[] = [], extra: Violation[] = [];
  if (c.truncated) extra.push({ code: 'diff_truncated' });
  for (const f of c.files) {
    if (f.status === 'renamed' && f.previous_filename) {
      files.push({ path: f.filename, action: 'create', added: f.additions, removed: f.deletions }, { path: f.previous_filename, action: 'delete', added: 0, removed: 0 });
    } else files.push({ path: f.filename, action: f.status === 'added' || f.status === 'copied' ? 'create' : f.status === 'removed' ? 'delete' : 'modify', added: f.additions, removed: f.deletions });
    if ((f.status === 'added' || f.status === 'modified' || f.status === 'changed') && !f.hasPatch) extra.push({ code: 'binary_or_unreadable', path: f.filename.slice(0, 200) });
  }
  return { files, extra };
}

function githubFor(deps: CodeTaskDeps): { cfg: GitHubAppConfig; fetcher: typeof fetch } {
  const cfg = (deps.githubConfig ?? githubConfigFromEnv)();
  if (!cfg) throw new CodeTaskError('GITHUB_NOT_CONFIGURED', 'GitHub is not configured (GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_REPOSITORY_OWNER, GITHUB_REPOSITORY_NAME)');
  return { cfg, fetcher: deps.fetcher ?? fetch };
}
const githubFailure = (e: unknown): CodeTaskError => {
  if (e instanceof CodeTaskError) return e;
  const msg = String((e as Error)?.message || e).slice(0, 100);
  return new CodeTaskError('GITHUB_ERROR', 'GitHub refused or could not answer', { reason: /^[a-z0-9_:-]+$/i.test(msg) ? msg : 'github_error' });
};

/** Validates a branch or PR against the package (11.4 items 1 to 4 as far as the GitHub file list shows them) and settles the code task. */
async function deliverBranch(row: any, input: { delivery: 'pr' | 'branch'; branch: string; baseBranch: string; head: string; prNumber?: number; prUrl?: string | null; note?: string | null; extra?: Violation[] }, deps: CodeTaskDeps): Promise<CodeTask> {
  const { cfg, fetcher } = githubFor(deps);
  let compared;
  try { compared = await compareToBase(cfg, row.base_branch, input.head, fetcher); } catch (e) { throw githubFailure(e); }
  const { files, extra } = changeSetFromCompare(compared);
  const pkg = row.package as TaskPackage;
  const violations = [...(input.extra ?? []), ...validateChangeSet(files, { allowedPaths: pkg.allowedPaths, limits: pkg.limits }), ...extra];
  if (violations.length) return blockRow(row.id, 'validation_failed', violations.slice(0, 100), input.delivery);
  const { filesChanged, linesChanged } = countChanges(files);
  return settle(row.id, 'DELIVERED', { delivery: input.delivery, branch: input.branch, headSha: compared.headSha, prNumber: input.prNumber ?? null, prUrl: input.prUrl ?? null, files: filesChanged, lines: linesChanged, note: input.note ?? null },
    { event: 'code_task.delivered' });
}

export type CodeResultInput =
  | { kind: 'pr'; prNumber: number; note?: string }
  | { kind: 'branch'; branch: string; note?: string }
  | { kind: 'diff'; diff: string; title?: string; note?: string };

/** The human returns the result of the external tool: a PR, a branch or a unified diff (11.4, `manual`). */
export async function submitCodeResult(input: { projectId: string; taskId: string; codeTaskId: string; result: CodeResultInput; actorKind: string }, deps: CodeTaskDeps = {}): Promise<CodeTask> {
  requireHuman(input.actorKind);
  const row = await loadRow(await getPool(), input.projectId, input.taskId, input.codeTaskId);
  if (row.status !== 'WAITING_HUMAN' && row.status !== 'BLOCKED') throw new CodeTaskError('CODE_TASK_CLOSED', 'The code run is not waiting for a result', { status: row.status });
  const note = input.result.note === undefined ? null : noteSchema.parse(input.result.note);
  const expectedBranch = taskBranchName(row.task_id);

  if (input.result.kind === 'pr') {
    const { cfg, fetcher } = githubFor(deps);
    let pr;
    try { pr = await readPullRequest(cfg, input.result.prNumber, fetcher); } catch (e) { throw githubFailure(e); }
    if (pr.headRef !== expectedBranch) throw new CodeTaskError('PR_MISMATCH', 'The pull request must come from the task branch', { expected_branch: expectedBranch });
    if (pr.state !== 'open' || pr.merged) throw new CodeTaskError('PR_NOT_OPEN', 'The pull request is not open');
    const extra: Violation[] = pr.baseRef !== row.base_branch ? [{ code: 'base_branch_mismatch' }] : [];
    return deliverBranch(row, { delivery: 'pr', branch: expectedBranch, baseBranch: row.base_branch, head: pr.headSha, prNumber: pr.number, prUrl: pr.htmlUrl ?? null, note, extra }, deps);
  }

  if (input.result.kind === 'branch') {
    if (input.result.branch !== expectedBranch) throw new CodeTaskError('BRANCH_MISMATCH', 'The branch must be the task branch', { expected_branch: expectedBranch });
    const { cfg, fetcher } = githubFor(deps);
    let head: string | null;
    try { head = await readBranchHead(cfg, expectedBranch, fetcher); } catch (e) { throw githubFailure(e); }
    if (!head) throw new CodeTaskError('BRANCH_NOT_FOUND', 'The task branch does not exist in the repository');
    return deliverBranch(row, { delivery: 'branch', branch: expectedBranch, baseBranch: row.base_branch, head, note }, deps);
  }

  return deliverDiff(row, input.result, note, deps);
}

async function deliverDiff(row: any, result: { diff: string; title?: string }, note: string | null, deps: CodeTaskDeps): Promise<CodeTask> {
  if (!(deps.diffUpload ?? diffUploadEnabled)()) throw new CodeTaskError('DIFF_UPLOAD_DISABLED', 'Diff upload is switched off (GITHUB_DIFF_UPLOAD); return a PR or a branch instead');
  const pkg = row.package as TaskPackage;
  const parsed = parseUnifiedDiff(result.diff);
  const violations = [...parsed.problems, ...(parsed.problems.length ? [] : validateChangeSet(parsed.files, { allowedPaths: pkg.allowedPaths, limits: pkg.limits }))];
  if (violations.length) return blockRow(row.id, 'validation_failed', violations.slice(0, 100), 'diff');
  const { cfg, fetcher } = githubFor(deps);
  const branch = taskBranchName(row.task_id);

  // Claim the run: of two parallel uploads only one reaches GitHub.
  const claimed = await (await getPool()).query(`UPDATE code_tasks SET status='RUNNING', updated_at=now() WHERE id=$1 AND status IN ('WAITING_HUMAN','BLOCKED') RETURNING id`, [row.id]).catch((e: any) => {
    if (e?.code === '23505') throw new CodeTaskError('CODE_TASK_ACTIVE', 'This task already has an open code run');
    throw e;
  });
  if (!claimed.rows[0]) throw new CodeTaskError('CODE_TASK_CLOSED', 'The code run is not waiting for a result');
  const fromRunning = ['RUNNING'] as ExecutorState[];

  let changes: BranchChange[];
  let headSha: string, prNumber: number | null = null, prUrl: string | null = null;
  try {
    const existingHead = await readBranchHead(cfg, branch, fetcher);
    const ref = existingHead ?? row.base_branch;
    changes = [];
    for (const f of parsed.files) {
      const original = await readTextFile(cfg, f.path, ref, fetcher);
      try { const text = applyFileDiff(original, f); changes.push({ path: f.path, content: text }); }
      catch (e) {
        if (e instanceof CodeExecutorError) return await blockRow(row.id, 'apply_failed', [{ code: e.code, path: f.path }], 'diff', fromRunning);
        throw e;
      }
    }
  } catch (e) {
    const err = githubFailure(e);
    await blockRow(row.id, `github_error:${String(err.details.reason ?? 'github_error')}`.slice(0, 200), [], 'diff', fromRunning);
    throw err;
  }
  const title = (result.title?.trim() || `Task ${row.task_id}`).slice(0, 200);
  try {
    ({ headSha } = await commitChangesToBranch(cfg, { taskId: row.task_id, baseBranch: row.base_branch, changes, message: title, writeEnabled: true }, fetcher));
  } catch (e) {
    const err = githubFailure(e);
    await blockRow(row.id, `github_error:${String(err.details.reason ?? 'github_error')}`.slice(0, 200), [], 'diff', fromRunning);
    throw err;
  }
  let prFailed = false;
  try {
    const pr = await openPullRequest(cfg, { taskId: row.task_id, baseBranch: row.base_branch, title, body: `BiForge task ${row.task_id}. Changes uploaded as a diff and applied by BiForge. Review and merge are human actions.`, writeEnabled: true }, fetcher);
    prNumber = pr.number; prUrl = pr.htmlUrl;
  } catch { prFailed = true; }   // the commit exists: record it; the PR is found later by webhook or refresh
  const { filesChanged, linesChanged } = countChanges(parsed.files);
  return settle(row.id, 'DELIVERED', { delivery: 'diff', branch, headSha, prNumber, prUrl, files: filesChanged, lines: linesChanged, note },
    { from: fromRunning, event: 'code_task.delivered', extra: prFailed ? { pr_open_failed: true } : {} });
}

/** Poll fallback (11.4 `manual`, a): finds the PR of the task branch and delivers it, or fills in the PR of a delivered branch. */
export async function refreshCodeTask(input: { projectId: string; taskId: string; codeTaskId: string; actorKind: string }, deps: CodeTaskDeps = {}): Promise<{ codeTask: CodeTask; changed: boolean }> {
  requireHuman(input.actorKind);
  const row = await loadRow(await getPool(), input.projectId, input.taskId, input.codeTaskId);
  if (row.status === 'FAILED' || row.status === 'RUNNING') return { codeTask: mapCodeTask(row), changed: false };
  const { cfg, fetcher } = githubFor(deps);
  const branch = taskBranchName(row.task_id);
  let pr;
  try { pr = await findPullRequestByBranch(cfg, branch, fetcher); } catch (e) { throw githubFailure(e); }
  if (!pr || pr.state !== 'open' || pr.merged) return { codeTask: mapCodeTask(row), changed: false };
  return { codeTask: await applyPullRequest(row, pr, deps), changed: true };
}

async function applyPullRequest(row: any, pr: { number: number; headSha: string; baseRef: string; htmlUrl: string | null }, deps: CodeTaskDeps): Promise<CodeTask> {
  if (row.status === 'DELIVERED') {
    const upd = await (await getPool()).query(`UPDATE code_tasks SET pr_number=COALESCE(pr_number,$2), pr_url=COALESCE(pr_url,$3), updated_at=now() WHERE id=$1 AND status='DELIVERED' RETURNING *`, [row.id, pr.number, pr.htmlUrl]);
    return mapCodeTask(upd.rows[0] ?? row);
  }
  const extra: Violation[] = pr.baseRef && pr.baseRef !== row.base_branch ? [{ code: 'base_branch_mismatch' }] : [];
  return deliverBranch(row, { delivery: 'pr', branch: taskBranchName(row.task_id), baseBranch: row.base_branch, head: pr.headSha, prNumber: pr.number, prUrl: pr.htmlUrl, extra }, deps);
}

/**
 * Called by the webhook path (P17 `pull_request`): the PR of an open task branch is found without polling.
 * Never throws; GitHub trouble leaves the run as it was, and the human can submit or refresh by hand.
 */
export async function syncCodeTaskFromPullRequest(taskId: string, pr: { number: number; headSha: string; htmlUrl?: string | null }, deps: CodeTaskDeps = {}): Promise<'none' | 'delivered' | 'blocked' | 'updated' | 'error'> {
  try {
    const pool = await getPool();
    const row = (await pool.query(`SELECT * FROM code_tasks WHERE task_id=$1 AND status IN ('WAITING_HUMAN','BLOCKED','DELIVERED') ORDER BY attempt DESC LIMIT 1`, [idSchema.parse(taskId)])).rows[0];
    if (!row || row.executor !== 'manual') return 'none';
    const out = await applyPullRequest(row, { number: pr.number, headSha: pr.headSha, baseRef: '', htmlUrl: pr.htmlUrl ?? null }, deps);
    return row.status === 'DELIVERED' ? 'updated' : out.status === 'DELIVERED' ? 'delivered' : 'blocked';
  } catch (e) {
    console.error(JSON.stringify({ type: 'code_task_sync_error', message: String((e as Error)?.message || e).slice(0, 120) }));
    return 'error';
  }
}

/** The human gives up on a run (any open state, also a stuck RUNNING). A reason is required; it is stored as text and never interpreted. */
export async function cancelCodeTask(input: { projectId: string; taskId: string; codeTaskId: string; reason: string; actorKind: string }): Promise<CodeTask> {
  requireHuman(input.actorKind);
  const reason = z.string().trim().min(1).max(500).parse(input.reason);
  const row = await loadRow(await getPool(), input.projectId, input.taskId, input.codeTaskId);
  return settle(row.id, 'FAILED', { reason }, { from: [...OPEN_STATES], event: 'code_task.failed' });
}
