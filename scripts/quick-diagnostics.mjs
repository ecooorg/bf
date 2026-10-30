#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const output = resolve(process.env.QUICK_DIAGNOSTICS_OUTPUT || 'artifacts/quick-diagnostics/ERROR_SUMMARY.txt');
mkdirSync(dirname(output), { recursive: true });
const sections = [];
const maxLinesPerSection = 24;
const maxCharsPerLine = 320;
const errorPattern = /(^|\b)(error|failed|failure|exception|uncaught|timeout|timed out|not ok|assertionerror|ts\d{4}|enoent|pageerror|console error|requestfailed)(\b|:)/i;

function cleanLine(line) {
  return line.replace(/\u001b\[[0-9;]*m/g, '').replace(/\s+/g, ' ').trim().slice(0, maxCharsPerLine);
}
function extractEvidence(text) {
  const lines = String(text || '').split(/\r?\n/).map(cleanLine).filter(Boolean);
  const selected = [];
  const seen = new Set();
  for (let i = 0; i < lines.length; i++) {
    if (!errorPattern.test(lines[i])) continue;
    for (const candidate of [lines[i - 1], lines[i], lines[i + 1]]) {
      if (!candidate || seen.has(candidate)) continue;
      seen.add(candidate);
      selected.push(candidate);
    }
  }
  return (selected.length ? selected : lines.slice(-6)).slice(0, maxLinesPerSection);
}
function addSection(name, status, detail, evidence = []) {
  sections.push({ name, status, detail, evidence });
}
async function runCheck(name, command, args, options = {}) {
  console.log(`\n[RUN] ${name}: ${command} ${args.join(' ')} (live output enabled)`);
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...options.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let captured = '';
  let timedOut = false;
  const append = (chunk, target) => {
    const text = chunk.toString();
    captured += text;
    if (captured.length > 8 * 1024 * 1024) captured = captured.slice(-8 * 1024 * 1024);
    // Preserve the child's stream channel while mirroring output immediately to Actions.
    target.write(text);
  };
  child.stdout.on('data', chunk => append(chunk, process.stdout));
  child.stderr.on('data', chunk => append(chunk, process.stderr));
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
    setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 5000).unref();
  }, options.timeout ?? 180_000);
  const result = await new Promise(resolve => {
    child.once('error', error => resolve({ error }));
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timer);
  if (result.error) {
    addSection(name, 'FAIL', `process_error=${result.error.code || result.error.name}: ${result.error.message}`, extractEvidence(captured));
    console.log(`[FAIL] ${name}: ${result.error.message}`);
    return false;
  }
  if (timedOut || result.code !== 0) {
    const detail = timedOut ? `timeout=${options.timeout ?? 180_000}ms` : result.signal ? `signal=${result.signal}` : `exit=${result.code}`;
    addSection(name, timedOut ? 'TIMEOUT' : 'FAIL', detail, extractEvidence(captured));
    console.log(`[${timedOut ? 'TIMEOUT' : 'FAIL'}] ${name}: ${detail}`);
    return false;
  }
  addSection(name, 'PASS', 'errors=none');
  console.log(`[PASS] ${name}`);
  return true;
}

const dependencyOutcome = process.env.DEPENDENCY_OUTCOME || 'success';
const browserInstallOutcome = process.env.BROWSER_INSTALL_OUTCOME || 'success';
const includeBrowser = process.env.INCLUDE_BROWSER !== 'false';
const failures = [];

if (!await runCheck('QUICK DIAGNOSTICS WORKFLOW CONTRACT', process.execPath, ['--test', 'tests/quick-diagnostics-workflow.test.mjs'])) failures.push('QUICK DIAGNOSTICS WORKFLOW CONTRACT');

if (dependencyOutcome !== 'success') {
  let evidence = [];
  try { evidence = extractEvidence(readFileSync(process.env.DEPENDENCY_LOG || '', 'utf8')); } catch {}
  addSection('DEPENDENCY INSTALL', 'FAIL', `npm ci outcome=${dependencyOutcome}`, evidence);
  addSection('TYPECHECK', 'BLOCKED', 'dependencies were not installed');
  addSection('ARCHITECTURAL TEST LAB CONTRACT', 'BLOCKED', 'dependencies were not installed');
  addSection('BROWSER INSTALL', includeBrowser ? 'BLOCKED' : 'SKIPPED', includeBrowser ? 'dependencies were not installed' : 'browser check disabled');
  addSection('ARCHITECTURAL TEST LAB BROWSER / UI', includeBrowser ? 'BLOCKED' : 'SKIPPED', includeBrowser ? 'dependencies were not installed' : 'browser check disabled');
  failures.push('DEPENDENCY INSTALL');
} else {
  if (!await runCheck('TYPECHECK', 'npm', ['run', 'typecheck'])) failures.push('TYPECHECK');
  if (!await runCheck('ARCHITECTURAL TEST LAB CONTRACT', 'npm', ['run', 'test:architect-lab'])) failures.push('ARCHITECTURAL TEST LAB CONTRACT');
  if (!includeBrowser) {
    addSection('ARCHITECTURAL TEST LAB BROWSER / UI', 'SKIPPED', 'disabled when workflow was started');
  } else if (browserInstallOutcome !== 'success') {
    let evidence = [];
    try { evidence = extractEvidence(readFileSync(process.env.BROWSER_INSTALL_LOG || '', 'utf8')); } catch {}
    addSection('BROWSER INSTALL', 'FAIL', `Playwright Chromium install outcome=${browserInstallOutcome}`, evidence);
    addSection('ARCHITECTURAL TEST LAB BROWSER / UI', 'BLOCKED', 'Chromium installation failed');
    failures.push('BROWSER INSTALL');
  } else {
    addSection('BROWSER INSTALL', 'PASS', 'Chromium is available.');
    if (!await runCheck('ARCHITECTURAL TEST LAB BROWSER / UI', process.execPath, ['--test', 'tests/p122-architect-lab-e2e.test.mjs'], { timeout: 240_000 })) failures.push('ARCHITECTURAL TEST LAB BROWSER / UI');
  }
}

const lines = [
  'BIFORGE — SINGLE ERROR SUMMARY',
  `commit=${process.env.GITHUB_SHA || 'local'}`,
  `workflow=${process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : 'local'}`,
  `generatedAt=${new Date().toISOString()}`,
  `browserCheck=${includeBrowser ? 'enabled' : 'disabled'}`,
  '',
  ...sections.flatMap(section => [
    `===== ${section.name} : ${section.status} =====`, section.detail,
    ...(section.evidence.length ? section.evidence : section.status === 'PASS' ? ['No errors detected.'] : ['No matching error lines were captured.']), '',
  ]),
  '===== OVERALL =====',
  `status=${failures.length ? 'FAIL' : 'PASS'}`,
  `failedSections=${failures.length ? failures.join('; ') : 'none'}`,
  `sectionCount=${sections.length}`,
  '',
];
writeFileSync(output, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${output}`);
if (failures.length) process.exitCode = 1;
