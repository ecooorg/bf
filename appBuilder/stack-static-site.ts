/** static_site stack: template plan and limits. Pure data; no execution of generated code. */
import { SCHEMA_VERSION, type Plan, type Spec, type Unit } from './core-types.ts';
import { sha256 } from './core-cache.ts';
import type { IntentBrief } from './intent-brief.ts';
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
    unit('style', 'style.css', `Styles for: ${spec.goal}`, [], 'CSS classes/ids used by index.html', 1500),
    unit('app', 'app.js', `Behaviour for: ${spec.goal}`, [], 'Plain browser JS; uses DOM ids from index.html; no imports', 4096),
    unit('index', 'index.html', `Entry page for: ${spec.title}`, ['style', 'app'], 'Links style.css and app.js (relative paths); minimal markup, no large inline script', 1500),
    unit('readme', 'README.md', 'How to open and use the project', ['index'], 'Short usage notes', 600),
  ];
  return { schemaVersion: SCHEMA_VERSION, specHash: sha256(JSON.stringify(spec)), units, order: units.map((u) => u.id) };
}

/**
 * P127.17 — Expand into many small modules from an intent brief (tree of ~5–12KB leaves).
 */
export function expandedPlanFromBrief(spec: Spec, brief: IntentBrief): Plan {
  const modules = brief.suggestedModules.length
    ? [...brief.suggestedModules]
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

  const cap = Math.min(40, Math.max(3, brief.targetModules || targetModulesFor(brief.complexity)));
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
    if (isHtml) {
      dependsOn.push(...cssIds, ...jsIds.slice(0, 8));
    }
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

  if (!units.some((u) => u.path === 'README.md')) {
    const indexId = units.find((u) => /\.html?$/i.test(u.path || ''))?.id;
    units.push(
      unit('readme', 'README.md', 'How to open and what the program should do', indexId ? [indexId] : [], 'Usage matching the expanded goal', 800),
    );
  }

  const known = new Set(units.map((u) => u.id));
  for (const u of units) {
    u.dependsOn = (u.dependsOn || []).filter((d) => known.has(d) && d !== u.id);
  }

  // P127.21: stylesheets are generated after the page they style, so selectors follow the real ids/classes.
  const htmlIds = units.filter((u) => /\.html?$/i.test(u.path || '')).map((u) => u.id);
  for (const u of units) {
    if (/\.html?$/i.test(u.path || '')) u.dependsOn = u.dependsOn.filter((d) => !cssIds.includes(d));
    else if (/\.css$/i.test(u.path || '')) u.dependsOn = [...new Set([...u.dependsOn, ...htmlIds])];
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
  return { schemaVersion: SCHEMA_VERSION, specHash: sha256(JSON.stringify(spec)), units, order };
}

/**
 * P127.16/17: interactive / non-trivial goals must not ship as a single HTML unit.
 */
export function ensureMultiFileStaticPlan(plan: Plan, spec: Spec, brief?: IntentBrief): { plan: Plan; coerced: string[] } {
  const files = plan.units.filter((u) => u.kind === 'file' && typeof u.path === 'string');
  const paths = files.map((u) => String(u.path).toLowerCase());
  const onlyOneHtml = files.length === 1 && /\.html?$/.test(paths[0] || '');
  const hasJs = paths.some((p) => p.endsWith('.js'));
  const complexity = brief?.complexity ?? estimateComplexity(`${spec.goal || ''} ${spec.title || ''}`);
  const interactive = complexity === 'standard' || complexity === 'ambitious' || onlyOneHtml;

  if (brief && (brief.complexity === 'ambitious' || brief.complexity === 'standard')) {
    if (files.length < 8 || onlyOneHtml || !hasJs) {
      return { plan: expandedPlanFromBrief(spec, brief), coerced: ['plan:expand_from_intent_brief'] };
    }
  }

  if (onlyOneHtml || (interactive && !hasJs) || (interactive && files.length < 2)) {
    if (brief && brief.complexity !== 'trivial') {
      return { plan: expandedPlanFromBrief(spec, brief), coerced: ['plan:force_multifile_from_brief'] };
    }
    return { plan: templatePlan(spec), coerced: ['plan:force_multifile_static'] };
  }
  return { plan, coerced: [] };
}
