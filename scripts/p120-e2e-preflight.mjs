#!/usr/bin/env node
/** Fail-fast inventory/syntax preflight for the P120 browser E2E suite. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const required = [
  {
    file: 'tests/p120-conversational-e2e.test.mjs',
    script: 'test:p120-conversational',
    command: 'node --test tests/p120-conversational-e2e.test.mjs',
  },
  {
    file: 'tests/p120-expert-e2e.test.mjs',
    script: 'test:p120-expert',
    command: 'node --test tests/p120-expert-e2e.test.mjs',
  },
  {
    file: 'tests/p120-architect-e2e.test.mjs',
    script: 'test:p120-architect',
    command: 'node --import tsx --test tests/p120-architect-e2e.test.mjs',
  },
  {
    file: 'tests/p120-agent-transitions-e2e.test.mjs',
    script: 'test:p120-transitions',
    command: 'node --test tests/p120-agent-transitions-e2e.test.mjs',
  },
];

const errors = [];
if (packageJson.version !== '120') errors.push(`expected package version 120, found ${packageJson.version}`);
if (packageJson.patch !== '120.0.5') errors.push(`expected package patch 120.0.5, found ${packageJson.patch}`);
const uiCommand = packageJson.scripts?.['test:ui'] ?? '';
if (!uiCommand.includes('node scripts/p120-e2e-preflight.mjs')) {
  errors.push('test:ui must run the P120 preflight before browser checks');
}

for (const item of required) {
  if (!existsSync(item.file)) {
    errors.push(`required E2E file is missing: ${item.file}`);
    continue;
  }
  if (!uiCommand.includes(item.file)) errors.push(`test:ui does not include ${item.file}`);
  if (packageJson.scripts?.[item.script] !== item.command) {
    errors.push(`${item.script} must equal: ${item.command}`);
  }
  const syntax = spawnSync(process.execPath, ['--check', item.file], { encoding: 'utf8' });
  if (syntax.status !== 0) {
    errors.push(`syntax check failed for ${item.file}: ${(syntax.stderr || syntax.stdout || '').trim()}`);
  }
}

if (errors.length) {
  console.error('P120 E2E preflight: FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`P120 E2E preflight: PASS (${required.length} browser scenarios; patch ${packageJson.patch})`);
}
