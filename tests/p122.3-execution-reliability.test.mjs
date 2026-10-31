/**
 * P122.3 — Execution reliability & workflow continuity
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const contracts = await import(pathToFileURL(path.join(root, 'server/expertContracts.ts')).href);
const workflow = await import(pathToFileURL(path.join(root, 'src/expertWorkflow.ts')).href);
const decisionMod = await import(pathToFileURL(path.join(root, 'src/decision.ts')).href);

const {
  validateExpertRequest,
  validateModelObject,
  validateModelShape,
  classifyExpertError,
  idempotencyKeyFromRequest,
  getIdempotentResponse,
  storeIdempotentResponse,
  _resetIdempotencyStoreForTests,
  ENDPOINT_CONTRACTS,
  EXPERT_ENDPOINTS,
} = contracts;

const {
  canTransitionWorkflow,
  transitionWorkflow,
  inferWorkflowState,
  reconstructContext,
  formatExpertFailure,
  makeIdempotencyKey,
  createOperationTracker,
  progressSnapshot,
} = workflow;

const { emptyDecision } = decisionMod;

beforeEach(() => {
  _resetIdempotencyStoreForTests();
});

describe('P122.3 endpoint contracts', () => {
  it('registers all Expert endpoints from the mandate', () => {
    const required = [
      'neutralize', 'radar', 'understand', 'knowledge-map', 'expand',
      'redteam-pair', 'redteam', 'premortem', 'experiment-draft',
      'forecast-wording', 'synthesis', 'review',
    ];
    for (const ep of required) {
      assert.ok(EXPERT_ENDPOINTS.includes(ep), ep);
      assert.ok(ENDPOINT_CONTRACTS[ep], ep);
    }
  });
});

describe('P122.3 request validation', () => {
  it('rejects non-object body', () => {
    const r = validateExpertRequest('expand', null);
    assert.equal(r.ok, false);
    assert.equal(r.code, 'VALIDATION');
  });

  it('rejects missing brief.decision for expand', () => {
    const r = validateExpertRequest('expand', { radar: {} });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'PRECONDITION');
  });

  it('accepts valid expand body', () => {
    const r = validateExpertRequest('expand', {
      brief: { decision: 'Hire or build?' },
      radar: { facts: [] },
    });
    assert.equal(r.ok, true);
  });

  it('rejects oversized body', () => {
    const r = validateExpertRequest('forecast-wording', {
      card: { x: 'y'.repeat(120_000) },
    });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'VALIDATION');
  });
});

describe('P122.3 model response validation', () => {
  it('rejects empty / non-object', () => {
    assert.equal(validateModelObject(null).ok, false);
    assert.equal(validateModelObject([]).ok, false);
    assert.equal(validateModelObject('x').ok, false);
  });

  it('accepts object', () => {
    assert.equal(validateModelObject({ a: 1 }).ok, true);
  });

  it('expand requires options', () => {
    const r = validateModelShape('expand', { knowledgeMap: {} });
    assert.equal(r.ok, false);
    assert.ok(r.missing.includes('options'));
  });

  it('expand with options passes', () => {
    assert.equal(validateModelShape('expand', { options: [] }).ok, true);
  });
});

describe('P122.3 error classification', () => {
  it('classifies rate limit', () => {
    const c = classifyExpertError({ code: 'GEMINI_RATE_LIMIT', message: 'rate limit' });
    assert.equal(c.category, 'RATE_LIMIT');
    assert.equal(c.retryable, true);
    assert.equal(c.status, 429);
  });

  it('classifies invalid JSON', () => {
    const c = classifyExpertError(new Error('AI returned invalid JSON'));
    assert.equal(c.category, 'INVALID_MODEL_JSON');
    assert.equal(c.retryable, true);
  });

  it('classifies timeout', () => {
    const c = classifyExpertError(new Error('The operation was aborted due to timeout'));
    assert.equal(c.category, 'MODEL_TIMEOUT');
    assert.equal(c.retryable, true);
  });
});

describe('P122.3 idempotency', () => {
  it('replays stored response', () => {
    storeIdempotentResponse('k1', 200, { success: true, data: { ok: 1 } });
    const hit = getIdempotentResponse('k1');
    assert.ok(hit);
    assert.equal(hit.status, 200);
    assert.equal(hit.body.data.ok, 1);
  });

  it('reads key from headers', () => {
    assert.equal(idempotencyKeyFromRequest({ 'x-idempotency-key': 'abc' }, {}), 'abc');
  });

  it('duplicate key does not create side effects beyond replay', () => {
    storeIdempotentResponse('dup', 200, { success: true, n: 1 });
    storeIdempotentResponse('dup', 200, { success: true, n: 2 });
    assert.equal(getIdempotentResponse('dup').body.n, 2);
  });
});

describe('P122.3 workflow state machine', () => {
  it('allows RUNNING -> FAILED', () => {
    assert.equal(canTransitionWorkflow('RUNNING', 'FAILED'), true);
    assert.equal(transitionWorkflow('RUNNING', 'FAILED').ok, true);
  });

  it('rejects FAILED -> COMPLETED', () => {
    const r = transitionWorkflow('FAILED', 'COMPLETED');
    assert.equal(r.ok, false);
  });

  it('allows RECOVERABLE -> RUNNING', () => {
    assert.equal(transitionWorkflow('RECOVERABLE', 'RUNNING').ok, true);
  });

  it('inferWorkflowState marks busy as WAITING_FOR_MODEL', () => {
    const d = emptyDecision();
    assert.equal(inferWorkflowState(d, { busy: true }), 'WAITING_FOR_MODEL');
  });

  it('inferWorkflowState marks lastError as RECOVERABLE', () => {
    const d = emptyDecision();
    assert.equal(inferWorkflowState(d, { lastError: true }), 'RECOVERABLE');
  });
});

describe('P122.3 context reconstruction & progress', () => {
  it('reconstructs context without inventing facts', () => {
    const d = emptyDecision();
    d.brief.decision = 'Should we expand to EU?';
    d.brief.constraints = ['Budget < 200k'];
    d.brief.facts = ['HQ in Berlin'];
    d.step = 'EXPAND';
    d.options = [
      { id: 'o1', title: 'Open office', description: '', byUser: true, keyAssumption: '', exitCost: '', cheapestTest: '', door: 'ONE_WAY', realistic: 'UNKNOWN', linkedUnknownIds: [] },
    ];
    const ctx = reconstructContext(d);
    assert.equal(ctx.objective, 'Should we expand to EU?');
    assert.ok(ctx.constraints.includes('Budget < 200k'));
    assert.ok(ctx.confirmedFacts.includes('HQ in Berlin'));
    assert.equal(ctx.currentStage, 'EXPAND');
    assert.ok(ctx.text.includes('Objective:'));
    assert.ok(!ctx.text.includes('undefined'));
  });

  it('operation tracker records start/finish', () => {
    const t = createOperationTracker();
    const op = t.start({ id: '1', endpoint: 'expand', decisionId: 'd1' });
    assert.equal(op.status, 'running');
    t.finish('1', 'failed', { category: 'MODEL_TIMEOUT', message: 'timeout' });
    assert.equal(t.last().status, 'failed');
    assert.equal(t.last().errorCategory, 'MODEL_TIMEOUT');
  });

  it('progress snapshot lists completed stages without fake percentages', () => {
    const d = emptyDecision();
    d.step = 'ATTACK';
    const snap = progressSnapshot(d, []);
    assert.equal(snap.stage, 'ATTACK');
    assert.ok(snap.completedStages.includes('BRIEF'));
    assert.ok(snap.completedStages.includes('EXPAND'));
    assert.ok(!('percent' in snap));
  });

  it('formatExpertFailure states previous work preserved', () => {
    const msg = formatExpertFailure({
      operation: 'expand',
      category: 'PROVIDER_ERROR',
      message: 'upstream down',
    });
    assert.ok(msg.includes('previous work is still saved'));
    assert.ok(msg.includes('expand'));
  });

  it('makeIdempotencyKey is stable-shaped', () => {
    const k = makeIdempotencyKey('dec1', 'expand');
    assert.ok(k.startsWith('dec1:expand:'));
    assert.ok(k.length <= 128);
  });
});
