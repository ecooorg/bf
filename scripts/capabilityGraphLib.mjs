/**
 * P111 — Capability / impact graph (v1).
 * Combines existing machine inventories into a single directed graph:
 *   intent → modules/contracts → routes/env/migrations (state & side-effects)
 *         → checks → evidence
 * Does not invent product facts. Unknown and stale context stay explicit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson(rel, fallback = null) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch {
    return fallback;
  }
}

function nodeId(type, key) {
  return `${type}:${key}`;
}

/**
 * Build capability graph from on-disk generated inventories and manifests.
 * @param {{ intentContracts?: object[] }} [opts]
 */
export function buildCapabilityGraph(opts = {}) {
  const generatedAt = new Date().toISOString();
  const nodes = new Map();
  const edges = [];
  const addNode = (n) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
    else {
      const prev = nodes.get(n.id);
      nodes.set(n.id, { ...prev, ...n, refs: { ...prev.refs, ...n.refs } });
    }
  };
  const addEdge = (from, to, relation) => {
    if (!from || !to) return;
    edges.push({ from, to, relation });
  };

  // --- modules (from module map) ---
  const moduleMap = readJson('docs/generated-module-map.json', { modules: [] });
  const moduleGeneratedAt = moduleMap.generatedAt || null;
  for (const m of moduleMap.modules || []) {
    const id = nodeId('module', m.path);
    addNode({
      id,
      type: 'module',
      label: m.path,
      status: 'known',
      refs: { path: m.path, layer: m.layer, lines: m.lines },
      sourceInventory: 'generated-module-map.json',
      inventoryGeneratedAt: moduleGeneratedAt,
    });
    for (const imp of m.imports || []) {
      const to = nodeId('module', imp);
      addNode({
        id: to,
        type: 'module',
        label: imp,
        status: 'known',
        refs: { path: imp },
        sourceInventory: 'generated-module-map.json',
        inventoryGeneratedAt: moduleGeneratedAt,
      });
      addEdge(id, to, 'depends_on');
    }
  }

  // --- routes → side effects (heuristic: mutating methods) ---
  const routesInv = readJson('docs/generated-route-inventory.json', { routes: [] });
  for (const r of routesInv.routes || []) {
    const rid = nodeId('route', `${r.method} ${r.path}`);
    addNode({
      id: rid,
      type: 'route',
      label: `${r.method} ${r.path}`,
      status: 'known',
      refs: { method: r.method, path: r.path, file: r.file },
      sourceInventory: 'generated-route-inventory.json',
      inventoryGeneratedAt: routesInv.generatedAt || null,
    });
    if (r.file) {
      const mid = nodeId('module', r.file);
      addNode({
        id: mid,
        type: 'module',
        label: r.file,
        status: nodes.has(mid) ? nodes.get(mid).status : 'known',
        refs: { path: r.file },
        sourceInventory: 'generated-route-inventory.json',
      });
      addEdge(mid, rid, 'exposes');
    }
    const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(r.method).toUpperCase());
    if (mutating) {
      const seId = nodeId('side_effect', `${r.method} ${r.path}`);
      addNode({
        id: seId,
        type: 'side_effect',
        label: `mutates via ${r.method} ${r.path}`,
        status: 'known',
        refs: { method: r.method, path: r.path, heuristic: 'http_mutating_method' },
        sourceInventory: 'generated-route-inventory.json',
      });
      addEdge(rid, seId, 'produces');
    }
  }

  // --- env vars (configuration / capability surface) ---
  const envInv = readJson('docs/generated-env-inventory.json', { variables: [] });
  const envList = envInv.variables || envInv.env || envInv.items || [];
  for (const e of envList) {
    const name = typeof e === 'string' ? e : e.name || e.key;
    if (!name) continue;
    const eid = nodeId('env', name);
    addNode({
      id: eid,
      type: 'env',
      label: name,
      status: 'known',
      refs: typeof e === 'object' ? e : { name },
      sourceInventory: 'generated-env-inventory.json',
      inventoryGeneratedAt: envInv.generatedAt || null,
    });
  }

  // --- migrations (state schema) ---
  const migInv = readJson('docs/generated-migration-inventory.json', { migrations: [] });
  const migList = migInv.migrations || migInv.files || [];
  for (const m of migList) {
    const name = typeof m === 'string' ? m : m.file || m.name || m.path;
    if (!name) continue;
    const mid = nodeId('migration', name);
    addNode({
      id: mid,
      type: 'migration',
      label: name,
      status: 'known',
      refs: typeof m === 'object' ? m : { file: name },
      sourceInventory: 'generated-migration-inventory.json',
      inventoryGeneratedAt: migInv.generatedAt || null,
    });
    addNode({
      id: nodeId('state', 'database'),
      type: 'state',
      label: 'database',
      status: 'known',
      refs: { kind: 'postgresql' },
      sourceInventory: 'generated-migration-inventory.json',
    });
    addEdge(mid, nodeId('state', 'database'), 'modifies');
  }

  // --- checks (verification-manifest + check-graph) ---
  const manifest = readJson('docs/verification-manifest.json', { checks: [] });
  const checkGraph = readJson('docs/generated-check-graph.json', { checks: [] });
  const checkModules = new Map();
  for (const c of checkGraph.checks || []) {
    checkModules.set(c.id, c.modules || []);
  }
  for (const raw of manifest.checks || []) {
    const id = raw.id;
    if (!id) continue;
    const cid = nodeId('check', id);
    addNode({
      id: cid,
      type: 'check',
      label: id,
      status: 'known',
      refs: {
        profiles: raw.profiles || [],
        critical: Boolean(raw.critical),
        needs: raw.needs || raw.requires || [],
      },
      sourceInventory: 'verification-manifest.json',
    });
    for (const mod of checkModules.get(id) || []) {
      const mid = nodeId('module', mod);
      if (!nodes.has(mid)) {
        addNode({
          id: mid,
          type: 'module',
          label: mod,
          status: 'unknown',
          refs: { path: mod },
          sourceInventory: 'generated-check-graph.json',
        });
      }
      addEdge(cid, mid, 'covers');
    }
    for (const need of raw.needs || []) {
      addEdge(cid, nodeId('check', need), 'needs');
    }
  }

  // --- intent contracts (optional list of already-parsed objects) ---
  const contracts = opts.intentContracts || [];
  for (const [idx, contract] of contracts.entries()) {
    const iid = nodeId('intent', contract.meta?.artifactType ? `contract-${idx}` : `contract-${idx}`);
    const intentStatus =
      contract.status === 'PASS' ? 'known' : contract.status === 'UNKNOWN' || !contract.status ? 'unknown' : 'stale';
    addNode({
      id: iid,
      type: 'intent',
      label: contract.goal || iid,
      status: intentStatus,
      refs: { goal: contract.goal, status: contract.status },
      sourceInventory: 'intent-policy-contract',
    });
    for (const item of contract.items || []) {
      if (item.kind === 'invariant') {
        const invId = nodeId('invariant', item.id || item.text?.slice(0, 40));
        addNode({
          id: invId,
          type: 'invariant',
          label: item.text || item.id,
          status: item.source === 'explicit' ? 'known' : item.source === 'unknown' ? 'unknown' : 'stale',
          refs: { id: item.id, source: item.source, criticality: item.criticality },
          sourceInventory: 'intent-policy-contract',
        });
        addEdge(iid, invId, 'declares');
      }
      if (item.kind === 'requirement' || item.kind === 'constraint') {
        const rid = nodeId('intent_item', item.id || `${item.kind}-${idx}`);
        addNode({
          id: rid,
          type: 'intent_item',
          label: item.text || item.id,
          status: item.source === 'explicit' ? 'known' : 'unknown',
          refs: { kind: item.kind, source: item.source },
          sourceInventory: 'intent-policy-contract',
        });
        addEdge(iid, rid, 'declares');
      }
    }
    for (const f of contract.changedFiles || []) {
      const mid = nodeId('module', f);
      if (!nodes.has(mid)) {
        addNode({
          id: mid,
          type: 'module',
          label: f,
          status: 'unknown',
          refs: { path: f },
          sourceInventory: 'intent-policy-contract',
        });
      }
      addEdge(iid, mid, 'impacts');
    }
  }

  // --- evidence placeholder node (schema existence) ---
  if (fs.existsSync(path.join(root, 'docs/schema-evidence-record.json'))) {
    addNode({
      id: nodeId('evidence', 'schema'),
      type: 'evidence',
      label: 'evidence-record schema',
      status: 'known',
      refs: { schema: 'docs/schema-evidence-record.json' },
      sourceInventory: 'schema-evidence-record.json',
    });
    for (const c of manifest.checks || []) {
      if (c.critical) addEdge(nodeId('check', c.id), nodeId('evidence', 'schema'), 'produces_evidence_under');
    }
  }

  const nodeList = [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id));
  const edgeList = edges
    .filter((e) => nodes.has(e.from) && nodes.has(e.to))
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.relation.localeCompare(b.relation));

  // de-dup edges
  const seen = new Set();
  const uniqueEdges = [];
  for (const e of edgeList) {
    const k = `${e.from}|${e.to}|${e.relation}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniqueEdges.push(e);
  }

  const nodeCounts = {};
  let unknownNodes = 0;
  let staleNodes = 0;
  for (const n of nodeList) {
    nodeCounts[n.type] = (nodeCounts[n.type] || 0) + 1;
    if (n.status === 'unknown') unknownNodes += 1;
    if (n.status === 'stale') staleNodes += 1;
  }
  const edgeCounts = {};
  for (const e of uniqueEdges) {
    edgeCounts[e.relation] = (edgeCounts[e.relation] || 0) + 1;
  }

  return {
    schemaVersion: 1,
    kind: 'capability-graph',
    generatedAt,
    generator: 'scripts/capabilityGenerateGraph.mjs',
    summary: {
      nodeCount: nodeList.length,
      edgeCount: uniqueEdges.length,
      nodeCounts,
      edgeCounts,
      unknownNodes,
      staleNodes,
      inventoriesPresent: {
        moduleMap: Boolean(moduleMap.modules?.length),
        routes: Boolean(routesInv.routes?.length),
        env: Boolean(envList.length),
        migrations: Boolean(migList.length),
        checks: Boolean(manifest.checks?.length),
        checkGraph: Boolean(checkGraph.checks?.length),
        intentContracts: contracts.length,
      },
    },
    nodes: nodeList,
    edges: uniqueEdges,
  };
}

/**
 * Load optional intent contract JSON files from a directory or list of paths.
 */
export function loadIntentContracts(paths = []) {
  const out = [];
  for (const p of paths) {
    const full = path.isAbsolute(p) ? p : path.join(root, p);
    if (!fs.existsSync(full)) continue;
    try {
      out.push(JSON.parse(fs.readFileSync(full, 'utf8')));
    } catch {
      /* skip invalid */
    }
  }
  return out;
}
