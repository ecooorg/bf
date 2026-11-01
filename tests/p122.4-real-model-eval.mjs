/**
 * P122.4 / P122.5 Layer B — Real-model evaluation harness (NOT part of normal CI).
 *
 * Explicitly trigger only when evaluating analytical quality with live models:
 *   REAL_MODEL_EVAL=1 GEMINI_API_KEY=... node --import tsx --test tests/p122.4-real-model-eval.mjs
 *
 * Or via GitHub Actions: expert-verify workflow → Run workflow → real_model = true
 * (uses repository secret GEMINI_API_KEY).
 *
 * Records: model, scenario, input, expected behavior, actual excerpt, heuristic rubric scores.
 * Never prints the API key. Failures are reported as test failures so the workflow can surface them.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ENABLED = process.env.REAL_MODEL_EVAL === '1';
const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.REAL_MODEL_ID || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = process.env.REAL_MODEL_OUT || path.join(ROOT, 'artifacts', 'real-model-eval');

const SCENARIOS = [
  {
    id: 'A',
    name: 'Complex decision',
    expected: [
      'Correct problem formulation',
      'Meaningful alternatives',
      'Explicit assumptions',
      'Risk assessment',
      'Defensible recommendation',
      'Actionable next steps',
    ],
  },
  {
    id: 'B',
    name: 'Changed information',
    expected: [
      'Identify affected claims',
      'Reassess affected hypotheses',
      'Invalidate obsolete conclusions',
      'Preserve unaffected work',
      'Explain what changed',
    ],
  },
  {
    id: 'C',
    name: 'False or questionable assumption',
    expected: [
      'Distinguish user assertion from verified fact',
      'Identify uncertainty',
      'Avoid confident recommendation on unsupported information',
    ],
  },
  {
    id: 'D',
    name: 'Model failure',
    expected: [
      'Preserve previous work',
      'Report the failure',
      'Permit safe recovery',
      'Avoid duplicate side effects',
    ],
  },
  {
    id: 'E',
    name: 'Complete decision',
    expected: [
      'Coherent final decision document',
      'Evidence provenance',
      'Assumptions visible',
      'Alternatives compared',
      'Risks identified',
      'Implementation plan',
      'Success criteria',
      'Unresolved issues listed',
    ],
  },
];

/** Expert-style system prefix (aligned with server/expertAgent.ts EXPERT_STEP_PREFIX + intro). */
const EXPERT_SYSTEM = `You are BiForge in Expert Mode: a calm, direct assistant for hard questions and decisions.
The person owns goals, values, risk and the final choice. You own clear analysis and honest answers.

Rules you MUST follow:
- Do not invent numbers, dates, prices, or facts that are not present in the user input.
- Explicitly label assumptions vs verified facts. Never present a user assertion as verified fact.
- Do not choose or rank options for the person unless they explicitly ask.
- Prefer exactness and explicit assumptions over warmth.
- When information is insufficient, say what is missing and lower confidence.
- Structure complex answers as: problem definition; known facts vs assumptions; alternatives; risks; next actions with observable success criteria.
`;

const SCENARIO_PROMPTS = {
  A: {
    system: EXPERT_SYSTEM,
    user: `Decision problem: I must choose whether to accept a job offer in another city.
Facts given by me: current salary 80k, offer 95k + relocation package of unknown value, lease ends in 4 months, partner works remotely.
I have not verified cost of living differences or school quality for my child.
Please structure the decision: formulate the problem, list assumptions vs facts, propose at least two meaningful alternatives (not just "accept/reject"), surface risks, and suggest actionable next steps. Do not decide for me.`,
  },
  B: {
    system: EXPERT_SYSTEM,
    user: `Previous analysis summary (METHOD STATE):
- Problem: whether to expand the product to a second market this year.
- Assumption (active): marketing budget will remain 120k.
- Hypothesis H1: expansion yields 30% revenue uplift (not tested).
- Recommendation draft: proceed with pilot in Q2.

NEW INFORMATION from the user: "The board cut the marketing budget to 40k for the rest of the year."

Update the analysis. Identify which claims and hypotheses are affected, which conclusions must be invalidated, what remains valid, and explain the change. Do not restart from scratch.`,
  },
  C: {
    system: EXPERT_SYSTEM,
    user: `I am deciding whether to invest 50k into a friend's startup.
I told you: "The product already has 10,000 paying users and is profitable."
I have not shown any evidence, metrics, or third-party verification.

Structure your response. Treat my statement appropriately (fact vs assumption). Do not give a confident investment recommendation based only on my assertion. State what would need to be verified.`,
  },
  E: {
    system: EXPERT_SYSTEM,
    user: `Synthesize a final decision-support document for this situation:
Problem: Choose between keeping the current monorepo tooling or migrating to a new build system over the next two quarters.
Facts: current CI takes 18 minutes; team size 8; two engineers have prior experience with the alternative; migration estimate from a spike is 6–9 engineer-weeks; no hard deadline from leadership.
Assumptions: developer happiness will improve; long-term maintenance cost will drop (unverified).
Alternatives already listed: (1) status quo + incremental optimisations, (2) staged migration of one package first, (3) full migration in one push.
Risks noted: knowledge concentration, temporary velocity drop.

Produce a coherent final decision document with: executive summary, facts vs assumptions, alternatives compared, risks, recommended option with justification (or clear refusal to rank if evidence is thin), implementation outline, success criteria, and unresolved questions. User retains final authority.`,
  },
};

/** Lightweight heuristic rubric — not a substitute for human judgement. */
function scoreResponse(scenarioId, text) {
  const t = (text || '').toLowerCase();
  const scores = {};
  const gaps = [];

  const has = (...needles) => needles.some((n) => t.includes(n.toLowerCase()));

  if (scenarioId === 'A') {
    scores.problem = has('problem', 'decision', 'choose', 'offer', 'relocat') ? 1 : 0;
    scores.alternatives = (t.match(/alternativ|option|path|choice/g) || []).length >= 2 ? 1 : 0;
    scores.assumptions = has('assumption', 'unverified', 'unknown', 'not verified') ? 1 : 0;
    scores.risks = has('risk', 'downside', 'trade-off', 'tradeoff') ? 1 : 0;
    scores.nextSteps = has('next step', 'verify', 'pilot', 'ask', 'check', 'research') ? 1 : 0;
    scores.noInvention = !has('definitely', 'guaranteed', 'will increase by') ? 1 : 0;
    if (!scores.alternatives) gaps.push('Few or no distinct alternatives');
    if (!scores.assumptions) gaps.push('Assumptions not surfaced');
  } else if (scenarioId === 'B') {
    scores.affected = has('affected', 'impact', 'budget', 'invalidat', 'no longer', 'obsolete') ? 1 : 0;
    scores.preserve = has('remain', 'still valid', 'unaffected', 'unchanged', 'preserve') ? 1 : 0;
    scores.explain = has('because', 'cut', '40k', 'budget') ? 1 : 0;
    scores.noRestart = !has('let us start over', "let's start from scratch", 'ignore previous') ? 1 : 0;
    if (!scores.affected) gaps.push('Did not identify affected claims');
    if (!scores.preserve) gaps.push('Did not preserve unaffected work');
  } else if (scenarioId === 'C') {
    scores.notFact = has('assumption', 'unverified', 'claim', 'assertion', 'you stated', 'not verified', 'no evidence') ? 1 : 0;
    scores.uncertainty = has('uncertain', 'unknown', 'need to verify', 'insufficient', 'missing') ? 1 : 0;
    scores.noConfidentRec =
      !has('you should invest', 'strongly recommend investing', 'definitely invest') &&
      !has('guaranteed return')
        ? 1
        : 0;
    if (!scores.notFact) gaps.push('May have treated user assertion as verified fact');
    if (!scores.noConfidentRec) gaps.push('Over-confident recommendation on unsupported info');
  } else if (scenarioId === 'E') {
    scores.structure = has('summary', 'assumption', 'alternativ', 'risk') ? 1 : 0;
    scores.plan = has('implement', 'migration', 'stage', 'next', 'milestone') ? 1 : 0;
    scores.success = has('success', 'criteria', 'metric', 'measure') ? 1 : 0;
    scores.unresolved = has('unresolved', 'open question', 'unknown', 'still need') ? 1 : 0;
    scores.userControl = has('you decide', 'your choice', 'final authority', 'you retain', 'not decide for you') ? 1 : 0;
    if (!scores.structure) gaps.push('Missing core document structure');
    if (!scores.unresolved) gaps.push('No unresolved questions listed');
  }

  const vals = Object.values(scores);
  const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  return { scores, score, gaps, pass: score >= 0.6 && gaps.length <= 2 };
}

async function callGemini(system, user) {
  // Dynamic import so normal CI (no key) does not require the SDK at load time beyond package.json.
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: user,
    config: {
      systemInstruction: system,
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  });
  const text =
    response?.text ||
    response?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') ||
    '';
  return String(text).trim();
}

describe('P122.4 Layer B real-model evaluation', () => {
  it('documents five required scenarios', () => {
    assert.equal(SCENARIOS.length, 5);
    assert.deepEqual(
      SCENARIOS.map((s) => s.id),
      ['A', 'B', 'C', 'D', 'E']
    );
  });

  it('is skipped unless REAL_MODEL_EVAL=1', { skip: !ENABLED }, async () => {
    assert.ok(ENABLED);
  });

  it('requires GEMINI_API_KEY when enabled', { skip: !ENABLED }, () => {
    assert.ok(API_KEY.length > 10, 'GEMINI_API_KEY must be set for live evaluation');
  });

  // Scenario D is about system behaviour on model failure (preserve state, messaging).
  // It is covered deterministically in p122.4-decision-quality; live model cannot usefully "fail itself".
  it('scenario D is covered by deterministic Layer A (documented)', () => {
    const d = SCENARIOS.find((s) => s.id === 'D');
    assert.ok(d);
    assert.ok(d.expected.includes('Preserve previous work'));
  });

  for (const id of ['A', 'B', 'C', 'E']) {
    it(
      `live scenario ${id}: ${SCENARIOS.find((s) => s.id === id).name}`,
      { skip: !ENABLED || !API_KEY },
      async () => {
        const prompt = SCENARIO_PROMPTS[id];
        assert.ok(prompt, `prompt for ${id}`);

        let text = '';
        let error = null;
        const t0 = Date.now();
        try {
          text = await callGemini(prompt.system, prompt.user);
        } catch (e) {
          error = String(e?.message || e).slice(0, 400);
        }
        const latencyMs = Date.now() - t0;

        const rubric = scoreResponse(id, text);
        const record = {
          scenario: id,
          name: SCENARIOS.find((s) => s.id === id).name,
          model: MODEL,
          latencyMs,
          error,
          outputLength: text.length,
          outputExcerpt: text.slice(0, 1200),
          rubric,
          expected: SCENARIOS.find((s) => s.id === id).expected,
          generatedAt: new Date().toISOString(),
        };

        try {
          mkdirSync(OUT_DIR, { recursive: true });
          writeFileSync(path.join(OUT_DIR, `scenario-${id}.json`), JSON.stringify(record, null, 2));
        } catch {
          // artifact write is best-effort
        }

        // Diagnostic lines appear in TAP / workflow logs
        console.log(`# real-model ${id} score=${rubric.score.toFixed(2)} pass=${rubric.pass} latency=${latencyMs}ms gaps=${rubric.gaps.join('; ') || 'none'}`);
        if (error) console.log(`# real-model ${id} error=${error}`);

        assert.ok(!error, `model call failed: ${error}`);
        assert.ok(text.length > 80, 'model returned too little text');
        assert.ok(
          rubric.pass,
          `scenario ${id} rubric failed (score=${rubric.score.toFixed(2)}): ${rubric.gaps.join('; ') || 'low score'}`
        );
      }
    );
  }
});

export { SCENARIOS, scoreResponse, EXPERT_SYSTEM };
