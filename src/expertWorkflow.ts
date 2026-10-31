/**
 * P122.3 — Expert workflow state machine, context reconstruction, operation tracking.
 * Client-side pure helpers; no network I/O.
 */
import type { Decision, Step } from './decision.ts';
import { openUnknowns, summarizeAnalyticalIntegrity, isActiveHypothesis } from './analyticalIntegrity.ts';

/** Explicit workflow execution states (P122.3). */
export type WorkflowState =
  | 'NOT_STARTED'
  | 'READY'
  | 'RUNNING'
  | 'WAITING_FOR_USER'
  | 'WAITING_FOR_MODEL'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED'
  | 'RECOVERABLE'
  | 'COMPLETED'
  | 'CANCELLED';

const ALLOWED_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  NOT_STARTED: ['READY', 'RUNNING'],
  READY: ['RUNNING', 'WAITING_FOR_USER', 'CANCELLED'],
  RUNNING: ['WAITING_FOR_MODEL', 'WAITING_FOR_USER', 'PARTIALLY_COMPLETED', 'FAILED', 'RECOVERABLE', 'COMPLETED', 'CANCELLED'],
  WAITING_FOR_MODEL: ['RUNNING', 'PARTIALLY_COMPLETED', 'FAILED', 'RECOVERABLE', 'COMPLETED', 'CANCELLED'],
  WAITING_FOR_USER: ['READY', 'RUNNING', 'COMPLETED', 'CANCELLED'],
  PARTIALLY_COMPLETED: ['READY', 'RUNNING', 'WAITING_FOR_USER', 'COMPLETED', 'CANCELLED'],
  FAILED: ['RECOVERABLE', 'READY', 'CANCELLED'],
  RECOVERABLE: ['READY', 'RUNNING', 'CANCELLED'],
  COMPLETED: ['READY'], // reopen
  CANCELLED: ['READY', 'NOT_STARTED'],
};

export function canTransitionWorkflow(from: WorkflowState, to: WorkflowState): boolean {
  if (from === to) return true;
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

export function transitionWorkflow(
  from: WorkflowState,
  to: WorkflowState
): { ok: true; state: WorkflowState } | { ok: false; error: string } {
  if (!canTransitionWorkflow(from, to)) {
    return { ok: false, error: `invalid_workflow_transition:${from}->${to}` };
  }
  return { ok: true, state: to };
}

/** Infer a reasonable workflow state from a Decision snapshot. */
export function inferWorkflowState(d: Decision, opts?: { busy?: boolean; lastError?: boolean }): WorkflowState {
  if (opts?.busy) return 'WAITING_FOR_MODEL';
  if (opts?.lastError) return 'RECOVERABLE';
  if (d.step === 'LEARN' && d.decision) return 'COMPLETED';
  if (d.synthesis) return 'PARTIALLY_COMPLETED';
  if (d.step === 'BRIEF' && !d.brief?.decision) return 'NOT_STARTED';
  if (d.radar || d.options?.length || d.hypotheses?.length) return 'READY';
  return 'READY';
}

export interface ExpertOperation {
  id: string;
  endpoint: string;
  decisionId: string;
  startedAt: number;
  finishedAt?: number;
  status: 'running' | 'succeeded' | 'failed' | 'cancelled';
  errorCategory?: string;
  errorMessage?: string;
  idempotencyKey?: string;
}

/** Bounded in-memory operation log for progress visibility (per session). */
export function createOperationTracker(max = 50) {
  const ops: ExpertOperation[] = [];
  return {
    start(op: Omit<ExpertOperation, 'status' | 'startedAt'> & { startedAt?: number }): ExpertOperation {
      const full: ExpertOperation = {
        ...op,
        startedAt: op.startedAt || Date.now(),
        status: 'running',
      };
      ops.unshift(full);
      if (ops.length > max) ops.length = max;
      return full;
    },
    finish(id: string, status: 'succeeded' | 'failed' | 'cancelled', err?: { category?: string; message?: string }) {
      const op = ops.find((o) => o.id === id);
      if (!op) return;
      op.status = status;
      op.finishedAt = Date.now();
      if (err?.category) op.errorCategory = err.category;
      if (err?.message) op.errorMessage = err.message;
    },
    list(): ExpertOperation[] {
      return [...ops];
    },
    last(): ExpertOperation | undefined {
      return ops[0];
    },
  };
}

/**
 * Reconstruct a concise working context from stored decision data for long sessions.
 * Does not invent missing historical information.
 */
export function reconstructContext(d: Decision): {
  objective: string;
  constraints: string[];
  confirmedFacts: string[];
  assumptions: string[];
  majorUncertainties: string[];
  activeHypotheses: string[];
  rejectedAlternatives: string[];
  currentStage: Step;
  outstandingQuestions: string[];
  previousDecision?: string;
  integrity: ReturnType<typeof summarizeAnalyticalIntegrity>;
  text: string;
} {
  const facts = (d.radar?.facts || []).map((c) => c.text).filter(Boolean);
  const assumptions = (d.radar?.assumptions || []).map((c) => c.text).filter(Boolean);
  const briefFacts = d.brief?.facts || [];
  const briefAssumptions = d.brief?.assumptions || [];
  const unknowns = openUnknowns(d).map((u) => u.question || u.text).filter(Boolean);
  const activeHyps = (d.hypotheses || [])
    .filter(isActiveHypothesis)
    .map((h) => h.rewrittenByUser || h.text)
    .filter(Boolean);
  const rejectedOpts = (d.options || [])
    .filter((o) => d.preferredOptionId && o.id !== d.preferredOptionId && d.decision?.chosenOptionId && o.id !== d.decision.chosenOptionId)
    .map((o) => o.title);

  const integrity = summarizeAnalyticalIntegrity(d);

  const lines: string[] = [];
  lines.push(`Stage: ${d.step}`);
  lines.push(`Objective: ${d.brief?.decision || d.title || '(not set)'}`);
  if (d.brief?.goal) lines.push(`Goal: ${d.brief.goal}`);
  if (d.brief?.constraints?.length) lines.push(`Constraints: ${d.brief.constraints.join('; ')}`);
  const allFacts = [...new Set([...briefFacts, ...facts])];
  if (allFacts.length) lines.push(`Facts: ${allFacts.slice(0, 12).join('; ')}`);
  const allAsm = [...new Set([...briefAssumptions, ...assumptions])];
  if (allAsm.length) lines.push(`Assumptions: ${allAsm.slice(0, 12).join('; ')}`);
  if (unknowns.length) lines.push(`Open unknowns: ${unknowns.slice(0, 8).join('; ')}`);
  if (activeHyps.length) lines.push(`Active hypotheses: ${activeHyps.slice(0, 8).join('; ')}`);
  if (d.options?.length) {
    lines.push(`Alternatives: ${d.options.map((o) => o.title).slice(0, 8).join('; ')}`);
  }
  if (d.decision?.whatIDecided) lines.push(`Prior decision: ${d.decision.whatIDecided}`);
  if (integrity.contradictions) lines.push(`Open contradictions: ${integrity.contradictions}`);

  return {
    objective: d.brief?.decision || d.title || '',
    constraints: [...(d.brief?.constraints || [])],
    confirmedFacts: allFacts,
    assumptions: allAsm,
    majorUncertainties: unknowns,
    activeHypotheses: activeHyps,
    rejectedAlternatives: rejectedOpts,
    currentStage: d.step,
    outstandingQuestions: unknowns,
    previousDecision: d.decision?.whatIDecided,
    integrity,
    text: lines.join('\n'),
  };
}

/** Safe user-facing error message from a failed Expert operation. */
export function formatExpertFailure(input: {
  operation: string;
  category?: string;
  message?: string;
  previousWorkPreserved?: boolean;
}): string {
  const preserved = input.previousWorkPreserved !== false;
  const base = input.message || 'The operation failed.';
  const op = input.operation || 'operation';
  const parts = [`${op} failed: ${base}`];
  if (preserved) parts.push('Your previous work is still saved.');
  if (input.category === 'RATE_LIMIT' || input.category === 'QUOTA') {
    parts.push('You can retry shortly.');
  } else if (input.category === 'MODEL_TIMEOUT' || input.category === 'PROVIDER_ERROR') {
    parts.push('Retry is safe; completed stages were not repeated.');
  } else if (input.category === 'VALIDATION' || input.category === 'PRECONDITION') {
    parts.push('Fix the input and try again.');
  }
  return parts.join(' ');
}

/** Generate a simple idempotency key for a client request. */
export function makeIdempotencyKey(decisionId: string, endpoint: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${decisionId}:${endpoint}:${rand}`.slice(0, 128);
}

/**
 * Progress snapshot for long-running Expert work.
 * Percentages are not fabricated — only concrete counters.
 */
export function progressSnapshot(d: Decision, ops: ExpertOperation[]): {
  stage: Step;
  completedStages: Step[];
  runningOperation?: string;
  lastError?: string;
  lastSuccessfulSaveHint: string;
  operationCount: number;
} {
  const order: Step[] = ['TRIAGE', 'BRIEF', 'UNDERSTAND', 'EXPAND', 'ATTACK', 'TEST', 'DECIDE', 'SYNTHESIS', 'LEARN'];
  const idx = order.indexOf(d.step);
  const completedStages = idx >= 0 ? order.slice(0, idx) : [];
  const running = ops.find((o) => o.status === 'running');
  const failed = ops.find((o) => o.status === 'failed');
  return {
    stage: d.step,
    completedStages,
    runningOperation: running?.endpoint,
    lastError: failed?.errorMessage,
    lastSuccessfulSaveHint: d.updatedAt ? new Date(d.updatedAt).toISOString() : 'unknown',
    operationCount: ops.length,
  };
}
