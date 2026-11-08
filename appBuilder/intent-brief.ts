/**
 * P127.17 — Intent elaboration + goal adequacy (user meaning, not ZIP formalities).
 * Pure helpers: no model I/O here.
 */

import { SCHEMA_VERSION, type Spec } from './core-types.ts';
import { repairPackagePath } from './core-plan.ts';

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

/**
 * P127.34 — Prefer compact packages so shared data shapes stay consistent.
 * Ambitious (3D/world) may still use more modules; board/turn games stay small.
 */
export function targetModulesFor(complexity: IntentComplexity): number {
  switch (complexity) {
    case 'ambitious':
      return 8;
    case 'standard':
      return 3;
    case 'simple':
      return 3;
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
    { id: 'main', path: 'main.js', purpose: 'Entry: wire UI and start loop' },
    { id: 'index', path: 'index.html', purpose: 'Shell linking CSS/JS modules' },
  ];

  if (complexity === 'standard' || complexity === 'ambitious') {
    mustHave.push('Primary interaction works (input changes visible state)');
    // P127.34: do not force animation loops on turn-based board games.
    if (/animat|loop|race|fly|simulat|3d|particle/i.test(goal)) {
      mustHave.push('Ongoing animation or update loop if the request implies motion');
    }
    shouldHave.push('Consistent data shapes across the few source files');
  }
  if (complexity === 'ambitious') {
    mustHave.push('Scene complexity beyond a single rectangle and a single circle');
    notSuccessIf.push('Total app logic under ~4KB when the request is ambitious');
    notSuccessIf.push('Missing any must-have capability listed in this brief');
    suggestedModules.push(
      { id: 'scene', path: 'scene.js', purpose: 'Scene setup and draw/update orchestration' },
      { id: 'input', path: 'input.js', purpose: 'Keyboard/touch input state' },
      { id: 'entities', path: 'entities.js', purpose: 'Entities described by the user request' },
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
    const path = repairPackagePath(str(row.path));
    const id = str(row.id) || path.replace(/\W+/g, '_').slice(0, 32);
    const purpose = str(row.purpose) || id;
    // Project policy: flat package only — no nested directories.
    const flat = path.replace(/\\/g, '/').split('/').filter(Boolean).pop() || '';
    if (flat && /^[a-zA-Z0-9._-]+$/.test(flat) && flat.length < 80 && !flat.includes('..')) {
      suggestedModules.push({ id, path: flat, purpose });
    }
  }
  return {
    expandedGoal: str(o.expandedGoal) || base.expandedGoal,
    mustHave: strArr(o.mustHave).length ? strArr(o.mustHave) : base.mustHave,
    shouldHave: strArr(o.shouldHave).length ? strArr(o.shouldHave) : base.shouldHave,
    notSuccessIf: strArr(o.notSuccessIf).length ? strArr(o.notSuccessIf) : base.notSuccessIf,
    complexity,
    // P127.34: prefer the compact budget; do not inflate toward 12–32 modules.
    targetModules: Math.min(
      12,
      Math.max(3, Number(o.targetModules) || targetModulesFor(complexity)),
    ),
    suggestedModules: suggestedModules.length >= 3 ? suggestedModules.slice(0, 8) : base.suggestedModules,
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

/** Recover complexity / module budget stored on Spec.features by applyBriefToSpec (resume-safe). */
export function briefHintsFromSpec(spec: { goal?: string; title?: string; features?: string[] } | null | undefined): IntentBrief {
  const features = Array.isArray(spec?.features) ? spec!.features! : [];
  let complexity: IntentComplexity | null = null;
  let targetModules: number | null = null;
  const modulePaths: string[] = [];
  for (const f of features) {
    const c = /^complexity:(trivial|simple|standard|ambitious)$/.exec(f);
    if (c) complexity = c[1] as IntentComplexity;
    const t = /^targetModules:(\d+)$/.exec(f);
    if (t) targetModules = Math.min(48, Math.max(1, Number(t[1])));
    const m = /^module:(.+)$/.exec(f);
    if (m) modulePaths.push(m[1]);
  }
  const base = fallbackIntentBrief(spec?.goal || spec?.title || '');
  if (complexity) base.complexity = complexity;
  if (targetModules) base.targetModules = targetModules;
  if (modulePaths.length) {
    base.suggestedModules = modulePaths.map(repairPackagePath).map((path) => ({
      id: path.replace(/\W+/g, '_').slice(0, 40),
      path,
      purpose: path,
    }));
  }
  // Prefer machine complexity from features over re-estimating from expanded goal text (e.g. "Tetris").
  return base;
}

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
  // P127.34: one solid app.js is enough for standard board/turn games; do not demand multi-module sprawl.
  const minJs =
    brief.complexity === 'ambitious' ? 8000 : brief.complexity === 'standard' ? 2500 : brief.complexity === 'simple' ? 600 : 0;
  const minModules =
    brief.complexity === 'ambitious' ? 2 : 1;

  if (jsBytes < minJs) {
    issues.push(`stub_size: js ${jsBytes}B < minimum ${minJs}B for complexity=${brief.complexity}`);
  }
  if (moduleCount < minModules) {
    issues.push(`stub_modules: ${moduleCount} js files < minimum ${minModules} for complexity=${brief.complexity}`);
  }
  // Compact template / coerced plans are intentional in P127.34 — do not mark them inadequate solely for fallback.

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
- targetModules: number (prefer 3 for board/turn games and simple tools; at most 8 unless the user asked for a large 3D/world simulation)
- suggestedModules: array of {id, path, purpose} with flat paths only — prefer style.css, app.js, index.html for standard games (no subfolders)

Rules:
- Prefer a compact package (about 3 files) so data shapes stay consistent across the program.
- Only suggest many modules when the user explicitly needs a large 3D/world simulation.
- Interactive games and simulations are at least "standard"; 3D, city, racing, rich worlds are "ambitious".
- notSuccessIf must include empty geometric placeholders when the user asked for a recognizable scene or game.`,
  };
}

/**
 * P127.34 — Human-facing brief (8–12 lines). User checks understanding; pipeline uses the machine manifest.
 */
export function buildHumanBrief(
  brief: IntentBrief,
  opts?: { title?: string; maxFiles?: number },
): string {
  const title = (opts?.title || '').trim();
  const maxFiles = opts?.maxFiles ?? Math.min(3, brief.targetModules || 3);
  const must = brief.mustHave.slice(0, 5);
  const avoid = brief.notSuccessIf.slice(0, 3);
  const lines: string[] = [];
  lines.push(
    title
      ? `Сделаю: ${title}.`
      : `Сделаю: ${brief.expandedGoal.split(/[.!?]/)[0]?.trim() || 'небольшую программу в браузере'}.`,
  );
  lines.push('');
  lines.push('Что будет:');
  for (const m of must) lines.push(`• ${m}`);
  if (avoid.length) {
    lines.push('');
    lines.push('Не будет:');
    for (const n of avoid) lines.push(`• ${n}`);
  }
  lines.push('');
  lines.push(
    `Состав: около ${maxFiles} файлов, одна страница, без внешних библиотек (если вы их не просили).`,
  );
  lines.push('После сборки откройте index.html и проверьте пункты выше.');
  return lines.join('\n').slice(0, 2000);
}
