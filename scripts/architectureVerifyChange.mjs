#!/usr/bin/env node
/**
 * verify:change — structured verification report for an AI or human patch.
 *
 * Runs (by default):
 *   1. architecture map generation
 *   2. boundary / cycle check (ratchet)
 *   3. optional change-impact if CHANGED_FILES or args provided
 *   4. typecheck (tsc --noEmit) when not --skip-typecheck
 *
 * Does NOT run the full test suite (use npm run check). Records BLOCKED/NOT_RUN
 * when a step is skipped or cannot run.
 *
 * Usage:
 *   npm run verify:change
 *   npm run verify:change -- server/taskService.ts src/App.tsx
 *   CHANGED_FILES='a.ts b.ts' npm run verify:change
 *   npm run verify:change -- --json
 *   npm run verify:change -- --skip-typecheck
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { root } from './architectureLib.mjs';

const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const skipTypecheck = args.includes('--skip-typecheck');
const fileArgs = args.filter((a) => !a.startsWith('-'));

function runNode(scriptRel, extraArgs = []) {
  const script = path.join(root, scriptRel);
  const r = spawnSync(process.execPath, [script, ...extraArgs], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  });
  return {
    command: `node ${scriptRel}${extraArgs.length ? ' ' + extraArgs.join(' ') : ''}`,
    exitCode: r.status === null ? 1 : r.status,
    stdout: (r.stdout || '').trim(),
    stderr: (r.stderr || '').trim(),
  };
}

function runNpm(scriptName) {
  const r = spawnSync('npm', ['run', scriptName, '--silent'], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
    shell: true,
  });
  return {
    command: `npm run ${scriptName}`,
    exitCode: r.status === null ? 1 : r.status,
    stdout: (r.stdout || '').trim(),
    stderr: (r.stderr || '').trim(),
  };
}

/** @type {{ id: string, status: 'PASSED'|'FAILED'|'BLOCKED'|'NOT_RUN', command?: string, detail?: string }[]} */
const checks = [];

function record(id, result, { blockedDetail } = {}) {
  if (!result) {
    checks.push({ id, status: 'NOT_RUN', detail: blockedDetail || 'not executed' });
    return;
  }
  const status = result.exitCode === 0 ? 'PASSED' : 'FAILED';
  checks.push({
    id,
    status,
    command: result.command,
    detail: status === 'FAILED' ? result.stderr || result.stdout || `exit ${result.exitCode}` : result.stdout.split('\n').slice(-3).join(' | '),
  });
}

// 1. module map
record('architecture.map', runNode('scripts/architectureGenerateModuleMap.mjs'));
record('docs.inventories', runNode('scripts/docsGenerateInventories.mjs'));
record('docs.inventories.check', runNode('scripts/docsCheckInventories.mjs'));

// 2. boundaries
record('architecture.boundaries', runNode('scripts/architectureCheckBoundaries.mjs'));

// 3. change impact (optional)
let changed = fileArgs.slice();
if (!changed.length && process.env.CHANGED_FILES) {
  changed = process.env.CHANGED_FILES.split(/[\s,]+/).filter(Boolean);
}
if (changed.length) {
  record('architecture.change_impact', runNode('scripts/architectureChangeImpact.mjs', changed));
} else {
  checks.push({
    id: 'architecture.change_impact',
    status: 'NOT_RUN',
    detail: 'no changed files provided (args or CHANGED_FILES)',
  });
}

// 5. typecheck
if (skipTypecheck) {
  checks.push({ id: 'typecheck', status: 'NOT_RUN', detail: '--skip-typecheck' });
} else {
  record('typecheck', runNpm('typecheck'));
}

// Aggregate
const failed = checks.filter((c) => c.status === 'FAILED');
const blocked = checks.filter((c) => c.status === 'BLOCKED');
const notRun = checks.filter((c) => c.status === 'NOT_RUN');
const passed = checks.filter((c) => c.status === 'PASSED');

const overall =
  failed.length > 0 ? 'FAILED' : blocked.length > 0 ? 'BLOCKED' : 'PASSED';

const report = {
  status: overall,
  generatedAt: new Date().toISOString(),
  checks,
  summary: {
    passed: passed.length,
    failed: failed.length,
    blocked: blocked.length,
    not_run: notRun.length,
  },
  notes: [
    'Full behavioral regression is NOT part of verify:change — run `npm run check` separately.',
    'Statuses: PASSED (executed ok), FAILED (executed and failed), BLOCKED (could not run), NOT_RUN (skipped).',
  ],
};

const outPath = path.join(root, 'docs/generated-verify-change-last.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');

if (jsonOnly) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`verify:change ${overall}`);
  for (const c of checks) {
    const mark =
      c.status === 'PASSED' ? '✓' : c.status === 'FAILED' ? '✗' : c.status === 'BLOCKED' ? '!' : '·';
    console.log(`  ${mark} ${c.id}: ${c.status}${c.detail ? ' — ' + c.detail.slice(0, 120) : ''}`);
  }
  console.log(`  report → docs/generated-verify-change-last.json`);
  if (failed.length) {
    console.error('verify:change FAILED');
  } else if (overall === 'PASSED') {
    console.log('verify:change PASSED (focused checks only; full suite not run)');
  }
}

process.exit(failed.length ? 1 : 0);
