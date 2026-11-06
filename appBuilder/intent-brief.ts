/**
 * P127.17 — Intent elaboration + goal adequacy (user meaning, not ZIP formalities).
 * Pure helpers: no model I/O here.
 */

import { SCHEMA_VERSION, type Spec } from './core-types.ts';

export type IntentComplexity = 'trivial' | 'simple' | 'standard' | 'ambitious';

export interface IntentBrief {
  /** Restated product in plain language (what a person usually expects). */
  expandedGoal: string;
  /** Observable capabilities that must exist for SUCCESS. */
  mustHave: string[];
  /** Nice-to-have; absence alone does not force FAILED. */
  shouldHave: string[];
  /** Explicit non-success examples (stub patterns). */
  notSuccessIf: string[];
  complexity: IntentComplexity;
  /** Target number of small source modules (excluding readme). */
  targetModules: number;
  /** Suggested module ids/paths the planner should prefer. */
  suggestedModules: Array<{ id: string; path: string; purpose: string }>;
}

const AMBITIOUS_RE =
  /3d|three\.?js|webgl|city|racing|race|open.?world|multiplayer|physics|rpg|minecraft|simulator|simulat|forest|animals|tetris|editor|sandbox/i;
const STANDARD_RE =
  /game|play|canvas|touch|keyboard|score|level|enemy|player/i;

/** Heuristic complexity from user text (used if model brief is missing). */
export function estimateComplexity(text: string): IntentComplexity {
  const t = text || '';
  if (AMBITIOUS_RE.test(t)) return 'ambitious';
  if (STANDARD_RE.test(t)) return 'standard';
  if (/page|form|todo|list|counter|timer|calc/i.test(t)) return 'simple';
  return t.trim().length < 40 ? 'trivial' : 'simple';
}

export function targetModulesFor(complexity: IntentComplexity): number {
  switch (complexity) {
    case 'ambitious':
      return 24;
    case 'standard':
      return 12;
    case 'simple':
      return 6;
    default:
      return 3;
  }
}

/** Deterministic brief when the model intent call fails — still richer than a one-line goal. */
export function fallbackIntentBrief(userText: string): IntentBrief {
  const complexity = estimateComplexity(userText);
  const goal = userText.trim() || 'Small interactive program';
  const mustHave: string[] = [
    'Runnable in a browser by opening index.html (or documented entry)',
    'Visible UI that matches the requested theme (not a blank page)',
  ];
  const notSuccessIf: string[] = [
    'Only empty shapes with no readable scene matching the request',
    'Placeholder text instead of the requested behaviour',
    'Broken controls (buttons/ids that do nothing)',
  ];
  const shouldHave: string[] = [];
  const suggestedModules: IntentBrief['suggestedModules'] = [
    { id: 'style', path: 'style.css', purpose: 'Layout and theme' },
    { id: 'main', path: 'js/main.js', purpose: 'Entry: wire UI and start loop' },
    { id: 'index', path: 'index.html', purpose: 'Shell linking CSS/JS modules' },
  ];

  if (complexity === 'standard' || complexity === 'ambitious') {
    mustHave.push('Primary interaction works (input changes visible state)');
    mustHave.push('Ongoing animation or update loop if the request implies motion');
    shouldHave.push('Clear separation of scene, entities, and input');
    suggestedModules.push(
      { id: 'input', path: 'js/input.js', purpose: 'Keyboard/touch input state' },
      { id: 'scene', path: 'js/scene.js', purpose: 'Scene setup and draw/update orchestration' },
      { id: 'entities', path: 'js/entities.js', purpose: 'Entities described by the user request' },
    );
  }
  if (complexity === 'ambitious') {
    mustHave.push('Multiple cooperating modules (not one tiny script)');
    mustHave.push('Scene complexity beyond a single rectangle and a single circle');
    notSuccessIf.push('Total app logic under ~4KB when the request is ambitious');
    notSuccessIf.push('Missing any must-have capability listed in this brief');
    suggestedModules.push(
      { id: 'render', path: 'js/render.js', purpose: 'Drawing / camera / perspective helpers' },
      { id: 'world', path: 'js/world.js', purpose: 'World or level layout data and helpers' },
      { id: 'ui', path: 'js/ui.js', purpose: 'HUD and on-screen controls' },
      { id: 'util', path: 'js/util.js', purpose: 'Shared math/helpers' },
    );
  }

  return {
    expandedGoal: `User asked: ${goal}. Deliver a coherent program that a non-expert would recognize as matching that request, not a geometric stub.`,
    mustHave,
    shouldHave,
    notSuccessIf,
    complexity,
    targetModules: targetModulesFor(complexity),
    suggestedModules,
  };
}

/** Parse model JSON for intent; never throws. */
export function parseIntentBrief(text: string, userText: string): IntentBrief {
  const base = fallbackIntentBrief(userText);
  if (!text || typeof text !== 'string') return base;
  let raw: unknown;
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return base;
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return base;
  }
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  const strArr = (v: unknown) =>
    Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean).slice(0, 16) : [];
  const complexity = (['trivial', 'simple', 'standard', 'ambitious'] as const).includes(o.complexity as IntentComplexity)
    ? (o.complexity as IntentComplexity)
    : base.complexity;
  const modulesIn = Array.isArray(o.suggestedModules) ? o.suggestedModules : [];
  const suggestedModules: IntentBrief['suggestedModules'] = [];
  for (const m of modulesIn.slice(0, 40)) {
    if (!m || typeof m !== 'object') continue;
    const row = m as Record<string, unknown>;
    const path = str(row.path);
    const id = str(row.id) || path.replace(/\W+/g, '_').slice(0, 32);
    const purpose = str(row.purpose) || id;
    if (path && /^[a-zA-Z0-9._/-]+$/.test(path) && path.length < 80) {
      suggestedModules.push({ id, path, purpose });
    }
  }
  return {
    expandedGoal: str(o.expandedGoal) || base.expandedGoal,
    mustHave: strArr(o.mustHave).length ? strArr(o.mustHave) : base.mustHave,
    shouldHave: strArr(o.shouldHave).length ? strArr(o.shouldHave) : base.shouldHave,
    notSuccessIf: strArr(o.notSuccessIf).length ? strArr(o.notSuccessIf) : base.notSuccessIf,
    complexity,
    targetModules: Math.max(
      targetModulesFor(complexity),
      Math.min(48, Number(o.targetModules) || base.targetModules),
    ),
    suggestedModules: suggestedModules.length >= 3 ? suggestedModules : base.suggestedModules,
  };
}

/** Fold brief into Spec fields (schema v1 — no new required keys). */
export function applyBriefToSpec(spec: Spec, brief: IntentBrief): Spec {
  const acceptance = [
    ...brief.mustHave.map((m) => `MUST: ${m}`),
    ...brief.shouldHave.map((s) => `SHOULD: ${s}`),
    ...brief.notSuccessIf.map((n) => `NOT_SUCCESS: ${n}`),
  ].slice(0, 24);
  const features = [
    `complexity:${brief.complexity}`,
    `targetModules:${brief.targetModules}`,
    ...brief.suggestedModules.map((m) => `module:${m.path}`),
    ...spec.features.filter((f) => !f.startsWith('complexity:') && !f.startsWith('targetModules:') && !f.startsWith('module:')),
  ].slice(0, 32);
  return {
    ...spec,
    goal: brief.expandedGoal.slice(0, 4000),
    features,
    acceptance: acceptance.length ? acceptance : spec.acceptance,
    nonGoals: [
      ...spec.nonGoals,
      ...brief.notSuccessIf.map((n) => `Avoid: ${n}`),
    ].slice(0, 16),
  };
}

export type AdequacyResult = {
  adequate: boolean;
  /** Soft issues — force PARTIAL when not adequate. */
  issues: string[];
  jsBytes: number;
  moduleCount: number;
};

/**
 * Heuristic goal adequacy: ambitious/standard requests cannot SUCCESS as tiny stubs.
 * Does not claim runtime proof — only blocks false SUCCESS.
 */
export function assessGoalAdequacy(
  files: Map<string, string>,
  brief: IntentBrief,
  opts?: { planFallback?: boolean },
): AdequacyResult {
  const issues: string[] = [];
  let jsBytes = 0;
  let moduleCount = 0;
  for (const [path, content] of files) {
    if (/\.js$/i.test(path)) {
      jsBytes += content.length;
      moduleCount++;
    }
  }
  const minJs =
    brief.complexity === 'ambitious' ? 12000 : brief.complexity === 'standard' ? 5000 : brief.complexity === 'simple' ? 800 : 0;
  const minModules =
    brief.complexity === 'ambitious' ? 4 : brief.complexity === 'standard' ? 2 : 1;

  if (jsBytes < minJs) {
    issues.push(`stub_size: js ${jsBytes}B < minimum ${minJs}B for complexity=${brief.complexity}`);
  }
  if (moduleCount < minModules) {
    issues.push(`stub_modules: ${moduleCount} js files < minimum ${minModules} for complexity=${brief.complexity}`);
  }
  if (opts?.planFallback && (brief.complexity === 'ambitious' || brief.complexity === 'standard')) {
    issues.push('plan_fallback: model plan was invalid; template/expanded plan used — treat as incomplete relative to user intent');
  }

  // Keyword presence from must-have themes (lightweight)
  const blob = [...files.values()].join('\n').toLowerCase();
  if (brief.complexity === 'ambitious' && /3d|city|race|racing|forest|webgl|perspective/.test(brief.expandedGoal.toLowerCase())) {
    if (!/(perspective|transform|camera|webgl|mesh|tile|sprite|requestanimationframe)/i.test(blob)) {
      issues.push('stub_theme: code lacks markers of the requested scene/motion complexity');
    }
  }

  return {
    adequate: issues.length === 0,
    issues,
    jsBytes,
    moduleCount,
  };
}

export function intentPromptVersion(): string {
  return 'app_builder.intent.v1';
}

export function buildIntentPrompt(userText: string): { system: string; prompt: string; version: string } {
  return {
    version: intentPromptVersion(),
    system:
      'You elaborate what a typical person means by a short product request. Do not write code. Do not shrink the request to a geometric stub. Return only JSON.',
    prompt: `User request (plain language):
"""
${userText.slice(0, 4000)}
"""

Return ONLY a JSON object with:
- expandedGoal: string (2–6 sentences: what they usually want to see and do)
- mustHave: string[] (observable capabilities required for success; 4–10 items)
- shouldHave: string[] (optional improvements)
- notSuccessIf: string[] (explicit stub patterns that must NOT count as success)
- complexity: "trivial"|"simple"|"standard"|"ambitious"
- targetModules: number (how many small source files are appropriate; ambitious often 16–32)
- suggestedModules: array of {id, path, purpose} with paths like js/scene.js, style.css, index.html — each file small (roughly 3–12KB of source), one responsibility

Rules:
- Prefer many small modules over one large file.
- Interactive games and simulations are at least "standard"; 3D, city, racing, rich worlds are "ambitious".
- notSuccessIf must include empty geometric placeholders when the user asked for a recognizable scene or game.`,
  };
}
