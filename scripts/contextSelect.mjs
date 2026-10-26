#!/usr/bin/env node
/**
 * P112 — select context and emit Change/Impact Plan from seed paths.
 *
 * Usage:
 *   node scripts/contextSelect.mjs server/taskService.ts src/App.tsx
 *   git diff --name-only | node scripts/contextSelect.mjs
 *   node scripts/contextSelect.mjs --json --max-depth 2 -- path1 path2
 *   node scripts/contextSelect.mjs --plan-out artifacts/impact-plan.json -- files...
 */
import fs from 'node:fs';
import path from 'node:path';
import { planFromPaths, root } from './contextSelectLib.mjs';

const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const maxDepthIdx = args.indexOf('--max-depth');
const maxDepth = maxDepthIdx >= 0 ? Number(args[maxDepthIdx + 1]) || 2 : 2;
const planOutIdx = args.indexOf('--plan-out');
const planOut = planOutIdx >= 0 ? args[planOutIdx + 1] : null;

const fileArgs = args.filter((a, i) => {
  if (a.startsWith('-')) return false;
  if (maxDepthIdx >= 0 && i === maxDepthIdx + 1) return false;
  if (planOutIdx >= 0 && i === planOutIdx + 1) return false;
  return true;
});

function readStdinPaths() {
  if (process.stdin.isTTY) return [];
  try {
    return fs
      .readFileSync(0, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const paths = fileArgs.length ? fileArgs : readStdinPaths();
if (!paths.length) {
  console.error('contextSelect: provide seed file paths as args or on stdin');
  process.exit(2);
}

const result = planFromPaths(paths, { maxDepth });
if (planOut) {
  const full = path.isAbsolute(planOut) ? planOut : path.join(root, planOut);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(result.plan, null, 2) + '\n');
}

if (jsonOnly) {
  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        error: result.error || null,
        seeds: result.seeds || [],
        unknownPaths: result.unknownPaths || [],
        context: result.context
          ? {
              nodeCount: result.context.nodeCount,
              pathCount: result.context.pathCount,
              unknownCount: result.context.unknownCount,
              checks: result.context.checks,
              sideEffects: result.context.sideEffects,
              paths: result.context.paths,
              unresolvedSeedPaths: result.context.unresolvedSeedPaths || [],
            }
          : null,
        plan: result.plan,
      },
      null,
      2,
    ),
  );
} else {
  if (!result.ok) {
    console.error(`contextSelect: ${result.error}`);
  }
  console.log(`seeds_resolved=${(result.seeds || []).length} unresolved=${(result.unknownPaths || []).length}`);
  if (result.context) {
    console.log(
      `context_nodes=${result.context.nodeCount} paths=${result.context.pathCount} unknown=${result.context.unknownCount} depth<=${result.context.maxDepth}`,
    );
    console.log(`checks=${result.context.checks.join(',') || '(none)'}`);
    if (result.context.paths.length) {
      console.log('paths:');
      for (const p of result.context.paths) console.log(`  ${p}`);
    }
  }
  console.log(`plan_status=${result.plan.status} impacts=${result.plan.impacts.length}`);
  if (planOut) console.log(`plan_written=${planOut}`);
}

process.exit(result.ok ? 0 : 1);
