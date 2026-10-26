/**
 * P112 — Context selection and impact planning on the capability graph.
 * Selects a bounded context set from seeds (changed files / node ids) and
 * builds a schema-shaped Change/Impact Plan. Unknown graph nodes stay explicit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULT_GRAPH = 'docs/generated-capability-graph.json';

export function loadCapabilityGraph(rel = DEFAULT_GRAPH) {
  const full = path.isAbsolute(rel) ? rel : path.join(root, rel);
  if (!fs.existsSync(full)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function normalizePath(p) {
  return String(p || '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^bf-main\//, '');
}

/**
 * Build adjacency (outgoing and reverse) from graph edges.
 */
export function indexGraph(graph) {
  const byId = new Map();
  const out = new Map();
  const inn = new Map();
  for (const n of graph.nodes || []) {
    byId.set(n.id, n);
    out.set(n.id, []);
    inn.set(n.id, []);
  }
  for (const e of graph.edges || []) {
    if (!byId.has(e.from) || !byId.has(e.to)) continue;
    out.get(e.from).push(e);
    inn.get(e.to).push(e);
  }
  return { byId, out, inn };
}

/**
 * Resolve seed file paths to graph node ids (module:path, route, etc.).
 */
export function seedsFromPaths(graph, paths) {
  const { byId } = indexGraph(graph);
  const seeds = new Set();
  const unknownPaths = [];
  for (const raw of paths) {
    const p = normalizePath(raw);
    const moduleId = `module:${p}`;
    if (byId.has(moduleId)) {
      seeds.add(moduleId);
      continue;
    }
    // match any node whose refs.path equals p
    let hit = false;
    for (const n of byId.values()) {
      if (n.refs?.path === p || n.refs?.file === p) {
        seeds.add(n.id);
        hit = true;
      }
    }
    if (!hit) unknownPaths.push(p);
  }
  return { seeds: [...seeds], unknownPaths };
}

/**
 * Expand seeds along graph edges up to maxDepth (forward depends_on/exposes/produces
 * and reverse covers/impacts/depends_on) to collect related context.
 */
export function selectContext(graph, seedIds, opts = {}) {
  const maxDepth = opts.maxDepth ?? 2;
  const { byId, out, inn } = indexGraph(graph);
  const selected = new Map(); // id -> { node, depth, via }
  const queue = [];

  for (const id of seedIds) {
    if (!byId.has(id)) continue;
    selected.set(id, { node: byId.get(id), depth: 0, via: 'seed' });
    queue.push(id);
  }

  while (queue.length) {
    const id = queue.shift();
    const cur = selected.get(id);
    if (cur.depth >= maxDepth) continue;

    const consider = (edge, nextId, dir) => {
      if (!byId.has(nextId) || selected.has(nextId)) return;
      // Prefer structural relations for context; skip pure evidence links at depth>0 if desired
      selected.set(nextId, {
        node: byId.get(nextId),
        depth: cur.depth + 1,
        via: `${dir}:${edge.relation}`,
      });
      queue.push(nextId);
    };

    for (const e of out.get(id) || []) {
      consider(e, e.to, 'out');
    }
    for (const e of inn.get(id) || []) {
      // reverse: importers / checks that cover this module
      if (['depends_on', 'covers', 'impacts', 'exposes', 'needs'].includes(e.relation)) {
        consider(e, e.from, 'in');
      }
    }
  }

  const nodes = [...selected.values()].map((s) => ({
    id: s.node.id,
    type: s.node.type,
    label: s.node.label,
    status: s.node.status,
    depth: s.depth,
    via: s.via,
    path: s.node.refs?.path || s.node.refs?.file || null,
  }));
  nodes.sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));

  const paths = [
    ...new Set(
      nodes
        .map((n) => n.path)
        .filter(Boolean)
        .map(normalizePath),
    ),
  ].sort();

  const unknown = nodes.filter((n) => n.status === 'unknown' || n.status === 'stale');
  const checks = nodes.filter((n) => n.type === 'check').map((n) => n.label);
  const sideEffects = nodes.filter((n) => n.type === 'side_effect').map((n) => n.label);

  return {
    seedIds: [...seedIds],
    maxDepth,
    nodes,
    paths,
    checks: [...new Set(checks)].sort(),
    sideEffects: [...new Set(sideEffects)].sort(),
    unknownCount: unknown.length,
    unknownNodes: unknown.map((n) => n.id),
    nodeCount: nodes.length,
    pathCount: paths.length,
  };
}

/**
 * Build a Change/Impact Plan instance (schema-change-impact-plan).
 */
export function buildImpactPlan(opts = {}) {
  const {
    summary = 'Impact plan from capability-graph context selection',
    status = 'PASS',
    seedPaths = [],
    context = null,
    outOfScope = [],
    risks = [],
    generatedAt = new Date().toISOString(),
  } = opts;

  const impacts = [];
  if (context) {
    const byType = new Map();
    for (const n of context.nodes) {
      if (n.depth === 0) continue;
      const list = byType.get(n.type) || [];
      list.push(n);
      byType.set(n.type, list);
    }
    let i = 0;
    for (const [type, list] of [...byType.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const paths = [...new Set(list.map((n) => n.path).filter(Boolean))];
      impacts.push({
        id: `impact-${++i}`,
        area: type,
        description: `${list.length} related ${type} node(s) within depth ${context.maxDepth}`,
        status: list.some((n) => n.status === 'unknown' || n.status === 'stale') ? 'PARTIAL' : 'PASS',
        relatedPaths: paths.slice(0, 50),
      });
    }
    if (context.unknownCount > 0) {
      impacts.push({
        id: `impact-unknown`,
        area: 'unknown_context',
        description: `${context.unknownCount} graph node(s) have status unknown or stale; do not treat as verified context`,
        status: 'UNKNOWN',
        relatedPaths: [],
      });
    }
  }
  if (seedPaths.length && !impacts.some((x) => x.area === 'seed')) {
    impacts.unshift({
      id: 'impact-seed',
      area: 'seed',
      description: `Direct seed paths (${seedPaths.length})`,
      status: 'PASS',
      relatedPaths: seedPaths.map(normalizePath),
    });
  }
  if (!impacts.length) {
    impacts.push({
      id: 'impact-empty',
      area: 'none',
      description: 'No graph-linked impact surface resolved from seeds',
      status: 'UNKNOWN',
      relatedPaths: [],
    });
  }

  const planRisks = [...risks];
  if (context?.unknownCount > 0) {
    planRisks.push('Context selection includes unknown/stale graph nodes; expand seeds or regenerate inventories');
  }
  if (context && context.pathCount === 0 && seedPaths.length) {
    planRisks.push('Seed paths did not resolve to capability-graph modules; impact surface may be incomplete');
  }

  return {
    meta: {
      schemaId: 'https://biforge.local/schemas/schema-change-impact-plan.json',
      schemaVersion: '1.0.0',
      artifactType: 'change-impact-plan',
      generatedAt,
    },
    summary,
    status: context?.unknownCount > 0 && status === 'PASS' ? 'PARTIAL' : status,
    impacts,
    ...(outOfScope.length ? { outOfScope } : {}),
    ...(planRisks.length ? { risks: planRisks } : {}),
  };
}

/**
 * End-to-end: paths → context + impact plan.
 */
export function planFromPaths(paths, opts = {}) {
  const graph = opts.graph || loadCapabilityGraph(opts.graphPath);
  if (!graph) {
    return {
      ok: false,
      error: 'capability graph missing; run npm run docs:generate',
      context: null,
      plan: buildImpactPlan({
        summary: 'Impact plan blocked: capability graph unavailable',
        status: 'BLOCKED',
        seedPaths: paths,
        risks: ['docs/generated-capability-graph.json missing or unreadable'],
      }),
    };
  }
  const { seeds, unknownPaths } = seedsFromPaths(graph, paths);
  const context = selectContext(graph, seeds, { maxDepth: opts.maxDepth ?? 2 });
  if (unknownPaths.length) {
    context.unresolvedSeedPaths = unknownPaths;
  }
  const plan = buildImpactPlan({
    summary:
      opts.summary ||
      `Impact plan for ${paths.length} seed path(s); ${context.nodeCount} graph nodes, ${context.pathCount} paths`,
    status: unknownPaths.length || context.unknownCount ? 'PARTIAL' : 'PASS',
    seedPaths: paths,
    context,
    outOfScope: opts.outOfScope || [],
    risks: opts.risks || [],
  });
  return { ok: true, context, plan, seeds, unknownPaths };
}
