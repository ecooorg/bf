// Plain words for plan, approval and task values. People never see the raw status names (docs/18, L5).

const humanize = (v: string) => v.toLowerCase().replace(/_/g, ' ');

const TASK_STATE: Record<string, string> = {
  DRAFT: 'Draft',
  READY: 'Ready to start',
  QUEUED: 'Waiting to run',
  RUNNING: 'Running',
  VALIDATING: 'Needs your check',
  PASS: 'Passed',
  FAIL: 'Failed',
  BLOCKED: 'Paused',
  CANCELLED: 'Cancelled',
};
const BLOCKED_REASON: Record<string, string> = {
  budget: 'limit reached',
  recovery: 'interrupted',
};
const PLAN_STATUS: Record<string, string> = {
  PENDING: 'Waiting for approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SUPERSEDED: 'Replaced by a newer plan',
};
const APPROVAL_KIND: Record<string, string> = {
  plan: 'Approve the plan',
  budget: 'Approve a limit change',
  merge_ready: 'Review a finished result',
  state_decision: 'Approve a project decision',
  destructive: 'Approve a deletion',
  task_start: 'Approve starting a task',
};

export const taskStateLabel = (s: string) => TASK_STATE[s] ?? humanize(s);
export const blockedReasonLabel = (r: string | null | undefined) => (r ? BLOCKED_REASON[r] ?? humanize(r) : '');
export const planStatusLabel = (s: string) => PLAN_STATUS[s] ?? humanize(s);
export const approvalKindLabel = (k: string) => APPROVAL_KIND[k] ?? humanize(k);
