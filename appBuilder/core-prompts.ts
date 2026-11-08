import ts from 'typescript';
/** Versioned prompts; changing wording that affects output must bump the version. */
import type { ModelRole } from './core-types.ts';
import { PROMPT_VERSION } from './core-cache.ts';

export { PROMPT_VERSION };
export const PROMPT_VERSIONS = { spec: 'app_builder.spec.v3', plan: 'app_builder.plan.v6', code: PROMPT_VERSION, review: 'app_builder.review.v3' } as const;

export function promptFor(role: ModelRole, context: string, expectedPath?: string): { system: string; prompt: string; version: string } {
  const system = 'Follow the user goal, supplied specification, validated plan, and output contract. Do not claim that code was executed or tested unless execution evidence is supplied.';
  if (role === 'planner') return { system, prompt: `Return only valid JSON matching the plan schema expected by the caller.

Create an implementation plan that fits the user's actual goal and requested functionality.
- Default to a small static site that opens by double-click: no build step, no CDN, no TypeScript, no React, no Three.js unless the user explicitly asked for them.
- Prefer a COMPACT package: index.html + app.js + style.css (about 3 files). Put all interactive logic in app.js so data shapes stay consistent.
- Never put the whole game or app logic in a single index.html unit.
- A single HTML file is allowed only for a trivial static page with almost no script.
- Keep each unit small enough to finish in one model reply (prefer under ~200 lines / ~8KB of source per file; app.js may be larger, up to ~12KB).
- Do NOT plan 12–32 modules for board games, turn-based games, calculators, or todo apps. Expand beyond 4–5 files only when the user clearly needs a large 3D/world simulation.
- No subfolders. Flat paths only.
- Avoid features the user did not request unless they are necessary for the stated goal.

When the plan uses multiple files, define the file map and contracts: paths, exports, imports, function/property names, shared data shapes (e.g. Piece is always {type,color}, Coord is always {row,col}), who owns the DOM, and how HTML loads CSS/JS. Every planned import must resolve to a planned file. The entry HTML must reference every CSS/JS file that is part of the deliverable.

Define acceptance checks for observable user behavior. Do not treat keyword presence alone as proof of functionality.

Stage: ${context}`, version: PROMPT_VERSIONS.plan };
  if (role === 'reviewer') return { system, prompt: `Review the supplied result against the user's goal, specification, plan, and actual files. Do not execute the artifact.
- Check referenced files, imports/exports, function names, arguments, return shapes, and shared data contracts against the supplied files.
- Trace the main user actions from UI event through computation to rendered result where the source makes that trace possible.
- Identify fabricated data, misleading defaults, swallowed errors, stale placeholders, broken links, and false success states when evidenced.
- Separate defects from optional improvements. Do not demand features absent from the user's request or report style preferences as blockers.
- Distinguish static inspection from runtime behavior; do not claim runtime validation without execution evidence.
- Report concrete file/line-level findings and prioritize functional blockers.
Stage: ${context}`, version: PROMPT_VERSIONS.review };
  const header = expectedPath ? `<<<FILE ${expectedPath}>>>` : '<<<FILE index.html>>> (use the real file path in place of index.html)';
  return { system, prompt: `${context}\nImplement the assigned unit to satisfy the user's goal and specification. Treat the validated plan's paths and contracts as the integration baseline. Do not invent external APIs, credentials, measurements, or source results. If an internal interface needed by the specification is missing from the plan, define the smallest coherent interface and keep its imports/exports consistent with the other supplied contracts. If an external dependency is genuinely unspecified or unavailable, do not pretend it works: provide a clear unavailable state and a concise code comment identifying the unresolved dependency.

Keep THIS unit compact so it always finishes in one reply (prefer under ~200 lines; app.js may be up to ~250 lines when it is the sole logic file). When the plan assigns a single app.js for all logic, implement the full behaviour there with one consistent data model — do not invent parallel representations (e.g. piece as both a letter and an object).

If this unit is the entry HTML, link every CSS/JS file from the plan with relative paths. Prefer short markup and external scripts — do not embed a large game engine inline. If this unit is a module, export exactly the names listed in the plan contract and use the same property/method names other units will call. Finish every function completely — never stop mid-statement. Startup contract: a class constructor sets itself up completely and draws its initial state at once, so the first screen is never empty (for a board, grid or list: render it immediately, not only after a button click); code that creates an object must not call setup methods (init*, setup*, bind*, create*) that the constructor already calls.

Return exactly one complete file block and nothing else. First line: ${header} exactly. Then the complete file content. Last line MUST be <<<END>>> (required). Do not add code fences or text outside the block.`, version: PROMPT_VERSION };
}

/** P127.20: names a JS module actually exports (syntax-level scan; no execution). */
export function exportedNames(source: string): string[] {
  const names = new Set<string>();
  for (const m of source.matchAll(/^\s*export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of source.matchAll(/^\s*export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/i).pop()?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  if (/^\s*export\s+default\b/m.test(source)) names.add('default');
  return [...names];
}

/** P127.23: exported surface with parameter lists / class members, so callers match real signatures. */
export function exportSurface(source: string): string[] {
  const sf = ts.createSourceFile('m.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const out: string[] = [];
  const params = (ps: ts.NodeArray<ts.ParameterDeclaration>) => ps.map((p) => p.getText(sf).replace(/\s+/g, ' ').slice(0, 40)).join(', ');
  const exported = (n: ts.Node) => ts.canHaveModifiers(n) && Boolean(ts.getModifiers(n)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
  const local = new Map<string, string>();
  const describeClass = (c: ts.ClassDeclaration) => {
    const members: string[] = [];
    for (const m of c.members) {
      if (ts.isMethodDeclaration(m) || ts.isGetAccessor(m)) { const n = m.name.getText(sf); if (!n.startsWith('#')) members.push(ts.isMethodDeclaration(m) ? `${n}(${params(m.parameters)})` : n); }
      else if (ts.isConstructorDeclaration(m)) members.unshift(`constructor(${params(m.parameters)})`);
    }
    return `class ${c.name?.getText(sf) ?? 'default'} { ${members.slice(0, 20).join('; ')} }`;
  };
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) local.set(st.name.text, `${st.name.text}(${params(st.parameters)})`);
    else if (ts.isClassDeclaration(st) && st.name) local.set(st.name.text, describeClass(st));
    else if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) {
      local.set(d.name.text, d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) ? `${d.name.text}(${params(d.initializer.parameters)})` : d.name.text);
    }
  }
  for (const st of sf.statements) {
    if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && exported(st)) {
      out.push(st.name ? local.get(st.name.text)! : 'default');
    } else if (ts.isVariableStatement(st) && exported(st)) {
      for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) out.push(local.get(d.name.text)!);
    } else if (ts.isExportDeclaration(st)) {
      if (st.exportClause && ts.isNamedExports(st.exportClause) && !st.moduleSpecifier) {
        for (const e of st.exportClause.elements) { const orig = (e.propertyName ?? e.name).text; const d = local.get(orig); out.push(d && orig !== e.name.text ? d.replace(orig, e.name.text) : (d ?? e.name.text)); }
      }
    } else if (ts.isExportAssignment(st)) {
      out.push('default');
    }
  }
  return out;
}

/** P127.20/23: exact interface of modules generated so far, so later units import and call only what exists. */
export function interfaceBlock(files: Map<string, { content: string }>): string {
  const lines: string[] = [];
  for (const [path, f] of files) {
    if (!/\.m?js$/i.test(path)) continue;
    let surface: string[] = [];
    try { surface = exportSurface(f.content).slice(0, 30); } catch { surface = exportedNames(f.content); }
    lines.push(`- ${path}: ${surface.length ? `exports ${surface.join('; ')}` : 'exports nothing (plain script; do not import from it)'}`);
    if (lines.length >= 24) break;
  }
  return lines.length
    ? `\nACTUAL interfaces of files already generated (authoritative; import ONLY these names, call them with EXACTLY these parameters, use only the listed class members, and never reference files or media assets that are not in the plan):\n${lines.join('\n')}\n`
    : '';
}

const attrValues = (html: string, attr: 'id' | 'class'): string[] => {
  const out = new Set<string>();
  for (const m of html.matchAll(new RegExp(`\\b${attr}\\s*=\\s*["']([^"']+)["']`, 'gi'))) for (const v of m[1].split(/\s+/)) if (/^[\w-]{1,60}$/.test(v)) out.add(v);
  return [...out];
};

/** P127.25b: the real ids/classes of the generated HTML, for scripts and styles written after it. Empty when there is no HTML yet. */
export function domBlock(files: Map<string, { content: string }>): string {
  const parts: string[] = [];
  for (const [path, f] of files) {
    if (!/\.html?$/i.test(path)) continue;
    const ids = attrValues(f.content, 'id'); const classes = attrValues(f.content, 'class').slice(0, 80);
    parts.push(`${path}: ids [${ids.join(', ')}]; classes [${classes.join(', ')}]`);
  }
  if (!parts.length) return '';
  return `\n\nDOM CONTRACT (taken from the generated HTML; authoritative):\n${parts.join('\n')}\nUse ONLY these ids with getElementById / querySelector and only these classes in selectors; do not invent others. If an element you need is missing, create it with document.createElement and append it instead of assuming it exists. Scripts are loaded as <script type="module">.`;
}

/** P127.25b: instructions for the entry HTML, which is written before the scripts and styles. */
export function htmlPlanBlock(units: Array<{ id: string; path?: string | null; purpose?: string }>, selfId: string): string {
  const others = units.filter((u) => u.id !== selfId && u.path && !/\.html?$/i.test(u.path)).map((u) => `- ${u.path}: ${String(u.purpose || '').slice(0, 120)}`);
  return `\n\nThis HTML is generated BEFORE the scripts and styles; they will be written against its ids and classes. Planned files:\n${others.join('\n') || '- (none)'}\nLoad every planned .css with <link rel="stylesheet" href="..."> and every planned .js with <script type="module" src="...">, relative paths only. Give every element a script will control or read (buttons, canvas, inputs, score or status text, panels) a unique descriptive id. No inline on* handlers and no inline scripts.`;
}
