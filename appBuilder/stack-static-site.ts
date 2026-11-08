/** static_site stack: template plan and limits. Pure data; no execution of generated code. */
import { SCHEMA_VERSION, type Plan, type Spec, type Unit } from './core-types.ts';
import { sha256 } from './core-cache.ts';
import type { IntentBrief } from './intent-brief.ts';
import { topoSort, repairPackagePath } from './core-plan.ts';
import { estimateComplexity, targetModulesFor } from './intent-brief.ts';

export const STATIC_SITE_ID = 'static_site';
export const MAX_FILES = 48;
export const MAX_TOTAL_BYTES = 2 * 1024 * 1024;

function unit(id: string, path: string, purpose: string, dependsOn: string[], contract: string, maxOutputTokens: number): Unit {
  return { id, kind: 'file', path, purpose, dependsOn, exports: [], contract, maxOutputTokens, status: 'pending', attempts: 0 };
}

/** Default plan used when model planning fails. Files open by double-click: no build tools, no CDN. */
export function templatePlan(spec: Spec): Plan {
  const units = [
    unit(
      'style',
      'style.css',
      `Styles for: ${spec.goal}`,
      [],
      'CSS for layout and UI only. Classes/ids referenced from index.html and app.js (e.g. .square, .selected, #status, #reset-btn). No JS.',
      1500,
    ),
    unit(
      'app',
      'app.js',
      `Behaviour for: ${spec.goal}`,
      [],
      'Single module owns all state, DOM paint, and input. Use consistent object shapes (never mix string codes with objects for the same entity). Constructors render initial UI immediately. No other runtime JS files.',
      6000,
    ),
    unit(
      'index',
      'index.html',
      `Entry page for: ${spec.title}`,
      ['style', 'app'],
      'Shell only: #status, main board/list container, #reset-btn when relevant. Link style.css and app.js as <script type="module" src="app.js">. No inline game logic.',
      1500,
    ),
  ];
  return {
    schemaVersion: SCHEMA_VERSION,
    specHash: sha256(JSON.stringify(spec)),
    units,
    order: units.map((u) => u.id),
    shared: defaultSharedForCompact(spec),
  };
}

/** P127.34 — shared contracts for the compact 3-file template (one owner of state+DOM). */
export function defaultSharedForCompact(spec: Spec): NonNullable<Plan['shared']> {
  const goal = `${spec.goal || ''} ${spec.title || ''}`.toLowerCase();
  const boardLike = /chess|board|checkers|draughts|tic.?tac|grid|cell|piece|шахмат/.test(goal);
  if (boardLike) {
    return {
      types: {
        Color: { enum: ['white', 'black'] },
        Piece: {
          type: 'object',
          required: ['type', 'color'],
          properties: { type: { type: 'string' }, color: { type: 'string' } },
        },
        Coord: {
          type: 'object',
          required: ['row', 'col'],
          properties: { row: { type: 'integer' }, col: { type: 'integer' } },
        },
      },
      wiring: [
        'Only app.js writes to the board DOM and status text',
        'Piece is always {type, color}, never a single letter',
        'Coord is always {row, col} with integers 0..7 (or board size)',
        'index.html loads style.css and app.js as module; no other runtime JS',
      ],
      smoke: [
        { id: 'board-cells', assert: 'board container has the expected number of cells after load' },
        { id: 'no-throw', assert: 'no uncaught exception during load and first paint' },
        { id: 'status', assert: 'status element is non-empty' },
      ],
      budgets: { maxFiles: 3, maxTotalBytes: 16000 },
    };
  }
  return {
    types: {},
    wiring: [
      'Only app.js owns application state and DOM updates',
      'index.html loads style.css and app.js as module; no other runtime JS',
    ],
    smoke: [
      { id: 'no-throw', assert: 'no uncaught exception during load and first paint' },
      { id: 'visible-ui', assert: 'primary UI root is present and non-empty' },
    ],
    budgets: { maxFiles: 3, maxTotalBytes: 16000 },
  };
}

/**
 * P127.17 — Expand into many small modules from an intent brief (tree of ~5–12KB leaves).
 */
export function expandedPlanFromBrief(spec: Spec, brief: IntentBrief): Plan {
  const modules = brief.suggestedModules.length
    ? brief.suggestedModules.map((m) => ({ ...m, path: repairPackagePath(m.path) }))
    : [
        { id: 'style', path: 'style.css', purpose: 'Theme' },
        { id: 'main', path: 'main.js', purpose: 'Entry' },
        { id: 'index', path: 'index.html', purpose: 'Shell' },
      ];

  const paths = new Set(modules.map((m) => m.path.toLowerCase()));
  if (![...paths].some((p) => p.endsWith('.css'))) {
    modules.unshift({ id: 'style', path: 'style.css', purpose: 'Layout and theme' });
  }
  if (![...paths].some((p) => p.endsWith('.js'))) {
    modules.push({ id: 'main', path: 'main.js', purpose: 'Application entry and loop' });
  }
  if (![...paths].some((p) => p.endsWith('.html'))) {
    modules.push({ id: 'index', path: 'index.html', purpose: 'Entry HTML linking assets' });
  }

  // P127.34: hard cap — never expand to dozens of files for free-tier model reliability.
  const cap = Math.min(8, Math.max(3, brief.targetModules || targetModulesFor(brief.complexity)));
  const trimmed = modules.slice(0, cap);

  const units: Unit[] = [];
  const jsIds: string[] = [];
  const cssIds: string[] = [];

  for (const m of trimmed) {
    const isJs = /\.js$/i.test(m.path);
    const isCss = /\.css$/i.test(m.path);
    const isHtml = /\.html?$/i.test(m.path);
    const id = m.id.replace(/\W+/g, '_').slice(0, 40) || 'u';
    const dependsOn: string[] = [];
    // P127.25b: HTML has no dependency on scripts or styles (domFirstPlan makes them depend on it).
    if (isJs && jsIds.length) {
      if (id !== jsIds[0] && /main|index|app|game/.test(id)) dependsOn.push(jsIds[0]);
    }
    const maxTok = isHtml || isCss ? 1500 : 3500;
    units.push(
      unit(
        id,
        (m.path.replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'file.txt').slice(0, 80),
        m.purpose.slice(0, 200),
        dependsOn,
        isJs ? `ES module or plain script; helpers for: ${m.purpose.slice(0, 80)}` : isCss ? 'Selectors used by HTML' : 'Links all planned CSS/JS with relative paths',
        maxTok,
      ),
    );
    if (isJs) jsIds.push(id);
    if (isCss) cssIds.push(id);
  }

  const known = new Set(units.map((u) => u.id));
  for (const u of units) {
    u.dependsOn = (u.dependsOn || []).filter((d) => known.has(d) && d !== u.id);
  }

  // P127.20: the entry script is generated after every other script, so its imports can follow their real exports.
  for (const u of units) {
    if (!/\.js$/i.test(u.path || '') || !/^(main|app|index)$/.test(u.id)) continue;
    for (const other of units) {
      if (other.id === u.id || !/\.js$/i.test(other.path || '') || other.dependsOn.includes(u.id) || u.dependsOn.includes(other.id)) continue;
      u.dependsOn.push(other.id);
    }
  }

  const order = units.map((u) => u.id);
  return {
    schemaVersion: SCHEMA_VERSION,
    specHash: sha256(JSON.stringify(spec)),
    units,
    order,
    shared: defaultSharedForCompact(spec),
  };
}

/**
 * P127.16/17 + P127.34: interactive goals must not ship as a single HTML unit,
 * but standard board/turn games prefer a compact 3-file plan (not 8–32 modules).
 */
export function ensureMultiFileStaticPlan(plan: Plan, spec: Spec, brief?: IntentBrief): { plan: Plan; coerced: string[] } {
  const files = plan.units.filter((u) => u.kind === 'file' && typeof u.path === 'string');
  const paths = files.map((u) => String(u.path).toLowerCase());
  const onlyOneHtml = files.length === 1 && /\.html?$/.test(paths[0] || '');
  const hasJs = paths.some((p) => p.endsWith('.js'));
  const hasCss = paths.some((p) => p.endsWith('.css'));
  const complexity = brief?.complexity ?? estimateComplexity(`${spec.goal || ''} ${spec.title || ''}`);
  const interactive = complexity === 'standard' || complexity === 'ambitious' || onlyOneHtml;

  // Already a healthy compact package (html + js [+ css]) — keep it; attach shared if missing.
  if (!onlyOneHtml && hasJs && files.length >= 2 && files.length <= 4 && complexity !== 'ambitious') {
    if (!plan.shared) {
      return { plan: { ...plan, shared: defaultSharedForCompact(spec) }, coerced: ['plan:attach_shared_compact'] };
    }
    return { plan, coerced: [] };
  }

  // Ambitious / large worlds may still expand; standard no longer forces 8+ files.
  if (brief && brief.complexity === 'ambitious') {
    if (files.length < 4 || onlyOneHtml || !hasJs) {
      return { plan: expandedPlanFromBrief(spec, brief), coerced: ['plan:expand_from_intent_brief'] };
    }
  }

  if (onlyOneHtml || (interactive && !hasJs) || (interactive && files.length < 2)) {
    // P127.34: compact template first (3 files + shared contracts).
    return { plan: templatePlan(spec), coerced: ['plan:force_compact_static'] };
  }

  if (!hasCss && interactive && files.length <= 2) {
    return { plan: templatePlan(spec), coerced: ['plan:force_compact_static_css'] };
  }

  if (!plan.shared && files.length <= 4) {
    return { plan: { ...plan, shared: defaultSharedForCompact(spec) }, coerced: ['plan:attach_shared_compact'] };
  }
  return { plan, coerced: [] };
}

/**
 * P127.25b: the entry HTML is generated first and carries no dependency on scripts or styles; every script and style
 * depends on it, so they are written against the ids and classes that really exist. Applied to every plan, whoever made it.
 */
export function domFirstPlan(plan: Plan): Plan {
  const isHtml = (u: Unit) => /\.html?$/i.test(u.path || '');
  const isCode = (u: Unit) => /\.(js|css)$/i.test(u.path || '');
  const entry = plan.units.find((u) => /^index\.html?$/i.test(u.path || '')) ?? plan.units.find(isHtml);
  if (!entry) return plan;
  const codeIds = new Set(plan.units.filter(isCode).map((u) => u.id));
  const units = plan.units.map((u): Unit => {
    if (isHtml(u)) return { ...u, dependsOn: (u.dependsOn || []).filter((d) => !codeIds.has(d)) };
    if (isCode(u) && !(u.dependsOn || []).includes(entry.id)) return { ...u, dependsOn: [entry.id, ...(u.dependsOn || [])] };
    return u;
  });
  const order = topoSort(units);
  return order ? { ...plan, units, order } : plan;
}

const THREE_VERSION = '0.160.0';
const THREE_IMPORTMAP = `{\n  "imports": {\n    "three": "https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.js",\n    "three/addons/": "https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/examples/jsm/"\n  }\n}`;

/**
 * P127.28: generated 3D projects import three.js from several different URLs/versions (some without a module
 * build, e.g. cdnjs r128 `three.module.js` or `three.min.js`) or as bare `'three'` with no import map. Any failing
 * import stops the whole module graph, so the game never starts. Normalise every three.js import to the bare
 * specifier and make sure the entry HTML carries one pinned import map. Returns the paths that changed.
 */
export function normalizeThreeSetup(files: Map<string, string>): string[] {
  const changed: string[] = [];
  let usesThree = false;
  const spec = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])((?:https?:)?\/\/[^'"]*three[^'"]*|three(?:\/[^'"]*)?)\2/g;
  for (const [path, src] of files) {
    if (!/\.(?:m?js)$/i.test(path)) continue;
    const out = src.replace(spec, (_m, pre: string, q: string, url: string) => {
      let next = url;
      if (/^(?:https?:)?\/\//.test(url)) {
        if (!/(?:^|[/@.-])three(?:[/@.-]|$)/i.test(url)) return _m;
        const addon = /\/examples\/jsm\/(.+)$/.exec(url);
        next = addon ? `three/addons/${addon[1]}` : 'three';
      }
      if (next === 'three' || next.startsWith('three/')) usesThree = true;
      return `${pre}${q}${next}${q}`;
    });
    if (out !== src) { files.set(path, out); changed.push(path); }
    else if (/\bfrom\s*['"]three(?:\/[^'"]*)?['"]/.test(src)) usesThree = true;
  }
  if (!usesThree) return changed;
  for (const [path, html] of files) {
    if (!/\.html?$/i.test(path) || !/<script\b[^>]*type=["']module["']/i.test(html)) continue;
    if (/<script\b[^>]*type=["']importmap["'][^>]*>[\s\S]*?"three"/i.test(html)) continue;
    const tag = `<script type="importmap">\n${THREE_IMPORTMAP}\n</script>\n`;
    const at = html.search(/<script\b/i);
    const next = at >= 0 ? html.slice(0, at) + tag + html.slice(at) : html.replace(/<\/head>/i, `${tag}</head>`);
    if (next !== html) { files.set(path, next); changed.push(path); }
  }
  return changed;
}
