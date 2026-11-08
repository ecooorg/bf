/**
 * P127.17 — Intent elaboration + goal adequacy (user meaning, not ZIP formalities).
 * Pure helpers: no model I/O here.
 */

import { SCHEMA_VERSION, type Spec } from './core-types.ts';
import { repairPackagePath } from './core-plan.ts';

export type IntentComplexity = 'trivial' | 'simple' | 'standard' | 'ambitious';

/** P127.40 — Genre template when the user request is short; fills view/controls/consequences. */
export type GenreTemplateId =
  | 'lane-dodge'
  | 'side-flight'
  | 'board-turn'
  | 'tap-survive'
  | 'simple-tool'
  | 'generic-interactive';

export interface GenreTemplate {
  id: GenreTemplateId;
  /** Short label for humans. */
  label: string;
  /** What is on screen. */
  view: string[];
  /** How the user acts — mobile/touch first. */
  controls: string[];
  /** What happens on key events. */
  consequences: string[];
  /** Hard defaults the coder must not violate. */
  forbidden: string[];
}

/**
 * Default device: phone or tablet — small screen, touch only.
 * No keyboard, mouse, terminal, or desktop-only UX unless the user explicitly asks.
 */
export const MOBILE_DEFAULTS = {
  device: 'phone or tablet (small touch screen)',
  noKeyboard: true,
  noMouse: true,
  controls:
    'Touch and large on-screen controls only; never require a keyboard or mouse. Keyboard may be an optional extra, never the only input.',
} as const;

const GENRE_TEMPLATES: GenreTemplate[] = [
  {
    id: 'lane-dodge',
    label: 'lane dodge / road',
    view: [
      'Road or path with clear lanes or a corridor',
      'Player vehicle or character near the bottom or center',
      'Obstacles approaching; score or distance on screen',
    ],
    controls: [
      'Swipe or tap left/right (or large on-screen buttons) to change lane or steer',
      'Forward motion is automatic',
    ],
    consequences: [
      'Hitting an obstacle ends the run and shows restart',
      'Score increases with time or distance',
      'About 1s collision grace after start',
    ],
    forbidden: ['keyboard-only control', 'CDN or 3D engine', 'empty field with no obstacles'],
  },
  {
    id: 'side-flight',
    label: 'side / forward flight',
    view: [
      'Sky and simple city or ground silhouettes',
      'Plane or flyer clearly visible',
      'Score or distance readable',
    ],
    controls: [
      'Drag finger or use large on-screen controls to move left/right (and up/down if needed)',
      'Forward flight is automatic',
    ],
    consequences: [
      'Collision with obstacle ends the flight and shows restart',
      'Score from distance or time',
      'About 1s collision grace after start',
    ],
    forbidden: ['three.js/WebGL/CDN', 'keyboard-only control', 'instant game-over on start frame'],
  },
  {
    id: 'board-turn',
    label: 'board / turn-based',
    view: [
      'Grid or board with distinct cells',
      'Pieces or marks readable on cells',
      'Turn or status text',
    ],
    controls: ['Tap a cell or piece to select; tap a target to move or place'],
    consequences: [
      'Illegal moves rejected or ignored with clear feedback',
      'Turn switches when a legal action completes',
      'Game-end state when rules say so (if applicable)',
    ],
    forbidden: ['keyboard required', 'blank board with no pieces when the game needs them'],
  },
  {
    id: 'tap-survive',
    label: 'tap to survive',
    view: ['Moving hazards or gaps', 'Player figure clearly visible', 'Score on screen'],
    controls: ['Tap/hold anywhere (or one large button) performs the main action'],
    consequences: [
      'Miss or hit hazard ends the run with restart',
      'Score from survival time or passes',
      'Short grace after start',
    ],
    forbidden: ['keyboard-only control', 'no visible player'],
  },
  {
    id: 'simple-tool',
    label: 'simple tool / form',
    view: ['Clear title and main controls', 'Result or list area always visible'],
    controls: ['Tap buttons and fields; on-screen keyboard only if text entry is required'],
    consequences: ['Each primary action updates the visible result immediately'],
    forbidden: ['blank page', 'controls that do nothing'],
  },
  {
    id: 'generic-interactive',
    label: 'generic interactive',
    view: ['Primary content matches the user theme', 'Status or feedback text'],
    controls: ['All actions work by touch on a small screen'],
    consequences: ['User action produces a visible result'],
    forbidden: ['keyboard-only control', 'blank page'],
  },
];

/** Pick one genre template from short user text (deterministic). */
export function selectGenreTemplate(userText: string): GenreTemplate {
  const t = (userText || '').toLowerCase();
  if (/chess|checker|draught|tic.?tac|board|шахмат|шашк|клеток/.test(t)) {
    return GENRE_TEMPLATES.find((x) => x.id === 'board-turn')!;
  }
  if (/flappy|jump|tap.?game|прыж/.test(t)) {
    return GENRE_TEMPLATES.find((x) => x.id === 'tap-survive')!;
  }
  if (/plane|flight|fly|aviator|самол|city|город|skyline|pilot/.test(t)) {
    return GENRE_TEMPLATES.find((x) => x.id === 'side-flight')!;
  }
  if (/race|racing|car|road|lane|drive|tractor|гонк|машин|трактор|дорога/.test(t)) {
    return GENRE_TEMPLATES.find((x) => x.id === 'lane-dodge')!;
  }
  if (/todo|timer|calc|counter|list|form|note|tool|convert/.test(t)) {
    return GENRE_TEMPLATES.find((x) => x.id === 'simple-tool')!;
  }
  if (/game|play|arcade|игр/.test(t)) {
    return GENRE_TEMPLATES.find((x) => x.id === 'tap-survive')!;
  }
  return GENRE_TEMPLATES.find((x) => x.id === 'generic-interactive')!;
}

/** True only when the user explicitly asked for heavy desktop/3D tech. */
export function userAskedHeavyTech(text: string): boolean {
  return /three\.?js|webgl|\b3d\b|multiplayer|open.?world|minecraft|unity|desktop only|keyboard only/i.test(
    text || '',
  );
}

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
  /** P127.40 — selected genre template id. */
  templateId?: GenreTemplateId;
  /** P127.40 — view / controls / consequences filled from template + user text. */
  view?: string[];
  controls?: string[];
  consequences?: string[];
}

/** Explicit heavy tech only; everyday games stay compact standard. */
const AMBITIOUS_RE = /three\.?js|webgl|\b3d\b|multiplayer|open.?world|minecraft|unity/i;
const STANDARD_RE =
  /game|play|canvas|touch|score|level|enemy|player|race|flight|fly|plane|city|board|chess|arcade/i;

/** Heuristic complexity from user text (used if model brief is missing). */
export function estimateComplexity(text: string): IntentComplexity {
  const t = text || '';
  if (userAskedHeavyTech(t) || AMBITIOUS_RE.test(t)) return 'ambitious';
  if (STANDARD_RE.test(t)) return 'standard';
  // Genre templates imply a real interactive program even for short non-English text.
  const tmpl = selectGenreTemplate(t);
  if (tmpl.id !== 'generic-interactive' && tmpl.id !== 'simple-tool') return 'standard';
  if (tmpl.id === 'simple-tool' || /page|form|todo|list|counter|timer|calc/i.test(t)) return 'simple';
  return t.trim().length < 40 ? 'trivial' : 'simple';
}

/**
 * P127.34/40 — Prefer compact packages. Even "ambitious" stays small unless heavy tech was explicit.
 */
export function targetModulesFor(complexity: IntentComplexity): number {
  // P127.40: default package stays 3 files; heavy tech may use a few more.
  if (complexity === 'ambitious') return 5;
  return 3;
}

/** Build must/not lists from a genre template (mobile-first). */
function contractFromTemplate(tmpl: GenreTemplate): {
  mustHave: string[];
  notSuccessIf: string[];
  shouldHave: string[];
} {
  const mustHave = [
    'Opens offline via index.html on a phone or tablet',
    ...tmpl.view.map((v) => `Visible: ${v}`),
    ...tmpl.controls.map((c) => `Control: ${c}`),
    ...tmpl.consequences.map((c) => `Consequence: ${c}`),
    MOBILE_DEFAULTS.controls,
  ];
  const notSuccessIf = [
    ...tmpl.forbidden.map((f) => `Forbidden: ${f}`),
    'Keyboard or mouse required to play or use the program',
    'Blank or unreadable main screen after start',
    'Primary controls do nothing on touch',
  ];
  const shouldHave = ['Large touch targets; layout fits a small portrait screen'];
  return { mustHave, notSuccessIf, shouldHave };
}

/** Deterministic brief when the model intent call fails — template-filled, mobile-first. */
export function fallbackIntentBrief(userText: string): IntentBrief {
  const goal = userText.trim() || 'Small interactive program';
  const tmpl = selectGenreTemplate(goal);
  let complexity = estimateComplexity(goal);
  // Short requests never jump to ambitious multi-module worlds.
  if (complexity === 'ambitious' && !userAskedHeavyTech(goal)) complexity = 'standard';
  const { mustHave, notSuccessIf, shouldHave } = contractFromTemplate(tmpl);
  if (/animat|loop|race|fly|simulat|scroll/i.test(goal) || tmpl.id === 'lane-dodge' || tmpl.id === 'side-flight' || tmpl.id === 'tap-survive') {
    mustHave.push('Ongoing animation or update loop while playing');
  }
  const suggestedModules: IntentBrief['suggestedModules'] = [
    { id: 'style', path: 'style.css', purpose: 'Layout and theme for small touch screens' },
    { id: 'app', path: 'app.js', purpose: 'All logic: view, touch controls, consequences' },
    { id: 'index', path: 'index.html', purpose: 'Shell linking CSS/JS' },
  ];
  const expandedGoal = [
    `User asked: ${goal}.`,
    `Template: ${tmpl.label} (${tmpl.id}).`,
    `Device: ${MOBILE_DEFAULTS.device}; touch-only by default.`,
    `View: ${tmpl.view.join('; ')}.`,
    `Controls: ${tmpl.controls.join('; ')}.`,
    `Consequences: ${tmpl.consequences.join('; ')}.`,
  ].join(' ');

  return {
    expandedGoal,
    mustHave,
    shouldHave,
    notSuccessIf,
    complexity,
    targetModules: 3,
    suggestedModules,
    templateId: tmpl.id,
    view: [...tmpl.view],
    controls: [...tmpl.controls, MOBILE_DEFAULTS.controls],
    consequences: [...tmpl.consequences],
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
  let complexity = (['trivial', 'simple', 'standard', 'ambitious'] as const).includes(o.complexity as IntentComplexity)
    ? (o.complexity as IntentComplexity)
    : base.complexity;
  // P127.40: do not accept ambitious from the model unless the user asked for heavy tech.
  if (complexity === 'ambitious' && !userAskedHeavyTech(userText)) complexity = 'standard';
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
  const view = strArr(o.view).length ? strArr(o.view) : base.view;
  const controls = strArr(o.controls).length ? strArr(o.controls) : base.controls;
  const consequences = strArr(o.consequences).length ? strArr(o.consequences) : base.consequences;
  const templateId = str(o.templateId) || base.templateId;
  return {
    expandedGoal: str(o.expandedGoal) || base.expandedGoal,
    mustHave: strArr(o.mustHave).length ? strArr(o.mustHave) : base.mustHave,
    shouldHave: strArr(o.shouldHave).length ? strArr(o.shouldHave) : base.shouldHave,
    notSuccessIf: strArr(o.notSuccessIf).length ? strArr(o.notSuccessIf) : base.notSuccessIf,
    complexity,
    // P127.40: hard cap 5 modules; default 3.
    targetModules: Math.min(5, Math.max(3, Number(o.targetModules) || targetModulesFor(complexity))),
    suggestedModules: suggestedModules.length >= 3 ? suggestedModules.slice(0, 5) : base.suggestedModules,
    templateId: (templateId as GenreTemplateId) || base.templateId,
    view,
    controls,
    consequences,
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
  // P127.40: one solid app.js is enough; do not demand multi-module sprawl for everyday games.
  const minJs =
    brief.complexity === 'ambitious' ? 5000 : brief.complexity === 'standard' ? 2000 : brief.complexity === 'simple' ? 600 : 0;
  const minModules = 1;

  if (jsBytes < minJs) {
    issues.push(`stub_size: js ${jsBytes}B < minimum ${minJs}B for complexity=${brief.complexity}`);
  }
  if (moduleCount < minModules) {
    issues.push(`stub_modules: ${moduleCount} js files < minimum ${minModules} for complexity=${brief.complexity}`);
  }

  const blob = [...files.values()].join('\n').toLowerCase();
  // Mobile-first: realtime games must not be keyboard-only.
  if (brief.templateId === 'lane-dodge' || brief.templateId === 'side-flight' || brief.templateId === 'tap-survive') {
    if (!/(touch|pointer|btn-|ontouch|pointerdown|swipe)/i.test(blob)) {
      issues.push('stub_controls: no touch/pointer control markers for a mobile game template');
    }
    if (!/requestanimationframe/i.test(blob)) {
      issues.push('stub_loop: missing animation loop for a motion template');
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
  return 'app_builder.intent.v2';
}

export function buildIntentPrompt(userText: string): { system: string; prompt: string; version: string } {
  const tmpl = selectGenreTemplate(userText);
  return {
    version: intentPromptVersion(),
    system:
      'You turn a short product request into a complete but STANDARD mobile contract. Default device is a phone or tablet: small screen, touch only — no keyboard, mouse, or desktop assumptions unless the user explicitly asks. Do not invent cinematic 3D or CDN engines. Do not write code. Return only JSON.',
    prompt: `User request (plain language):
"""
${userText.slice(0, 4000)}
"""

Suggested genre template (use unless the user clearly needs another): ${tmpl.id} (${tmpl.label})
Default view: ${JSON.stringify(tmpl.view)}
Default controls: ${JSON.stringify(tmpl.controls)}
Default consequences: ${JSON.stringify(tmpl.consequences)}
Forbidden unless user asked: ${JSON.stringify(tmpl.forbidden)}

Return ONLY a JSON object with:
- templateId: string (one of lane-dodge|side-flight|board-turn|tap-survive|simple-tool|generic-interactive)
- expandedGoal: string (short: template + what they get on a phone)
- view: string[] (what is visible on screen; 2–5 items)
- controls: string[] (touch / on-screen only by default; 2–4 items)
- consequences: string[] (what happens on success/fail/score/restart; 2–4 items)
- mustHave: string[] (merge view+controls+consequences into observable MUST lines; 5–12 items)
- shouldHave: string[] (optional)
- notSuccessIf: string[] (include keyboard-only, blank screen, instant game-over, CDN/3D if not requested)
- complexity: "trivial"|"simple"|"standard"|"ambitious" (use ambitious ONLY if user explicitly asked for three.js/WebGL/3D/multiplayer)
- targetModules: number (always 3 unless ambitious heavy tech, then at most 5)
- suggestedModules: [{id, path, purpose}] flat paths only — prefer index.html, style.css, app.js

Rules:
- Fill gaps with the template defaults; do NOT inflate complexity when the user was brief.
- Mobile-first: every interactive program must be playable with a finger on a small screen.
- No keyboard/mouse requirement. No terminal. No desktop-only UI.
- Prefer a boring working game over an impressive broken one.`,
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
  const view = (brief.view && brief.view.length ? brief.view : brief.mustHave.filter((m) => /visible|view|screen/i.test(m))).slice(0, 4);
  const controls = (brief.controls && brief.controls.length ? brief.controls : brief.mustHave.filter((m) => /control|touch|tap|drag/i.test(m))).slice(0, 4);
  const consequences = (brief.consequences && brief.consequences.length ? brief.consequences : brief.mustHave.filter((m) => /consequence|score|restart|collision|game over/i.test(m))).slice(0, 4);
  const lines: string[] = [];
  lines.push(
    title
      ? `I will build: ${title}.`
      : `I will build: ${brief.expandedGoal.split(/[.!?]/)[0]?.trim() || 'a small browser program'}.`,
  );
  if (brief.templateId) lines.push(`Template: ${brief.templateId} (standard working defaults).`);
  lines.push('Device: phone/tablet, touch only (no keyboard or mouse required).');
  lines.push('');
  lines.push('What you will see:');
  for (const v of view.length ? view : ['Main content matching your request']) lines.push(`• ${v}`);
  lines.push('');
  lines.push('How you control it:');
  for (const c of controls.length ? controls : ['Touch controls on a small screen']) lines.push(`• ${c}`);
  lines.push('');
  lines.push('What happens:');
  for (const c of consequences.length ? consequences : ['Your actions change what you see']) lines.push(`• ${c}`);
  lines.push('');
  lines.push(
    `Package: about ${maxFiles} files, one offline page, no external libraries unless you asked for them.`,
  );
  lines.push('After the build, open index.html on your phone and check the points above.');
  return lines.join('\n').slice(0, 2000);
}
