import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const prompts = read('appBuilder/core-prompts.ts');
const engine = read('appBuilder/core-engine.ts');
const cache = read('appBuilder/core-cache.ts');
const analyst = read('server/contextBuilder.ts');

test('C124.4 planner selects architecture from the requested goal, not a fixed single-file bias', () => {
  assert.match(prompts, /Choose the simplest architecture that can satisfy the requirements/);
  assert.doesNotMatch(prompts, /Prefer one self-contained index\.html/);
  assert.match(prompts, /Every planned import must resolve/);
  assert.match(prompts, /Define acceptance checks for observable user behavior and data flow/);
});

test('C124.4 reviewer separates evidenced defects from optional style improvements', () => {
  assert.match(prompts, /Separate defects from optional improvements/);
  assert.match(prompts, /Do not demand features absent from the user's request/);
  assert.match(prompts, /Do not execute the artifact/);
  assert.match(prompts, /do not claim runtime validation without execution evidence/i);
});

test('C124.4 coder preserves requested functionality and does not invent external facts or APIs', () => {
  assert.match(prompts, /Preserve every requested feature relevant to this unit/);
  assert.match(prompts, /Do not invent external APIs, credentials, measurements, or source results/);
  assert.match(prompts, /define the smallest coherent interface/);
  assert.match(prompts, /Return exactly one complete file block/);
});

test('C124.4 provider recovery retains the complete prompt and does not drop optional features', () => {
  assert.match(engine, /\$\{p\.prompt\}\\n\\nRECOVERY:/);
  assert.doesNotMatch(engine, /p\.prompt\.slice\(0,\s*6500\)/);
  assert.doesNotMatch(engine, /omit explanations and optional features/);
  assert.match(engine, /Preserve the full task, context, interfaces, and every requested feature/);
});

test('C124.4 specification prompt captures all explicitly requested capabilities', () => {
  assert.match(engine, /Capture all capabilities explicitly requested by the user in features\[\]/);
  assert.match(engine, /Acceptance criteria must describe observable behavior/);
});

test('C124.4 Architect analysis separates general knowledge from project-specific facts', () => {
  assert.match(analyst, /general domain knowledge to explain implications and identify gaps/);
  assert.match(analyst, /never present general knowledge as a fact about this project/);
  assert.match(analyst, /A fact needs "ref"/);
  assert.match(analyst, /Never touch "decisions": only a human makes decisions/);
});

test('C124.4 prompt/cache versions are advanced after prompt behavior changes', () => {
  assert.match(cache, /static_site\.v4/);
  assert.match(prompts, /app_builder\.spec\.v3/);
  assert.match(prompts, /app_builder\.plan\.v3/);
  assert.match(prompts, /app_builder\.review\.v3/);
});
