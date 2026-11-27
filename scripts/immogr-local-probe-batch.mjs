#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { evaluateResearchProbe } from '../server/immogr/probe-policy.ts';

function sourceAuthorization(source) {
  const policy = source.probePolicy;
  if (!policy || policy.status !== 'authorized_for_limited_probe') return null;
  return {
    reference: policy.authorizationReference || '',
    reviewedAt: policy.reviewedAt || '',
    researchPurposeAllowed: true,
    robotsAllowed: true,
    allowedHosts: Array.isArray(policy.allowedHosts) ? policy.allowedHosts : [],
    allowedMethods: ['GET'],
    maxRequests: policy.maxRequests,
  };
}

/** Evaluate one source without sending a request. */
export function assessBatchProbe(source, entry) {
  if (!entry) return { allowed: false, status: 'not_planned', reason: 'No probe entry was supplied.' };
  const policy = source.probePolicy;
  if (policy?.status === 'prohibited') {
    return { allowed: false, status: 'blocked_by_source_policy', reason: policy.reason || 'The source policy prohibits scripted probes.' };
  }
  if (policy?.status !== 'authorized_for_limited_probe') {
    return { allowed: false, status: 'authorization_required', reason: policy?.reason || 'No explicit limited-probe authorization is recorded.' };
  }
  const authorization = sourceAuthorization(source);
  if (!authorization || !authorization.reference || !authorization.reviewedAt || !authorization.allowedHosts.length || ![2, 3].includes(authorization.maxRequests)) {
    return { allowed: false, status: 'authorization_incomplete', reason: 'The source probe authorization record is incomplete.' };
  }
  if (!Array.isArray(entry.urls) || entry.urls.length < 1 || entry.urls.length > 2) {
    return { allowed: false, status: 'invalid_plan', reason: 'A probe must contain one or two explicitly selected HTTPS page URLs.' };
  }
  let requests;
  try {
    const first = new URL(entry.urls[0]);
    if (first.protocol !== 'https:') throw new Error('HTTPS required.');
    requests = [{ url: new URL('/robots.txt', first.origin).toString(), method: 'GET' }, ...entry.urls.map((url) => ({ url, method: 'GET' }))];
  } catch (error) {
    return { allowed: false, status: 'invalid_plan', reason: error instanceof Error ? error.message : 'Invalid probe URL.' };
  }
  const decision = evaluateResearchProbe(
    { id: source.id, probeAuthorization: authorization },
    { sourceId: source.id, requests },
  );
  if (!decision.allowed) return { allowed: false, status: 'blocked_by_probe_gate', reason: decision.reasons.join(', ') };
  return { allowed: true, status: 'ready', authorizationReference: decision.reference, maxRequests: decision.maxRequests };
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath || process.argv.includes('--help')) {
    process.stdout.write('Usage: node --import tsx scripts/immogr-local-probe-batch.mjs <probe-batch.json>\n');
    process.stdout.write('The script reads source authorization only from config/immogr/sources.json.\n');
    process.exitCode = inputPath ? 0 : 2;
    return;
  }
  const absoluteInput = path.resolve(inputPath);
  const input = JSON.parse(await readFile(absoluteInput, 'utf8'));
  if (!Array.isArray(input.probes)) throw new Error('Batch input must contain a probes array.');
  const registryPath = path.resolve(process.cwd(), 'config/immogr/sources.json');
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  const entries = new Map();
  for (const entry of input.probes) {
    if (!entry || typeof entry.sourceId !== 'string' || entries.has(entry.sourceId)) throw new Error('Each probe entry must have a unique sourceId.');
    entries.set(entry.sourceId, entry);
  }
  const batchRoot = path.join(path.dirname(absoluteInput), '.immogr-local-probe-batch');
  await mkdir(batchRoot, { recursive: true });
  const results = [];
  for (const source of registry.sources) {
    const entry = entries.get(source.id);
    const assessment = assessBatchProbe(source, entry);
    if (!assessment.allowed) {
      results.push({ sourceId: source.id, sourceName: source.name, ...assessment, requestCount: 0 });
      continue;
    }
    const sourceDir = path.join(batchRoot, source.id);
    await mkdir(sourceDir, { recursive: true });
    const planPath = path.join(sourceDir, 'plan.json');
    await writeFile(planPath, JSON.stringify({ sourceId: source.id, urls: entry.urls }, null, 2) + '\n', { mode: 0o600 });
    const fetcherPath = path.resolve(process.cwd(), 'scripts/immogr-local-page-fetch.mjs');
    const child = spawnSync(process.execPath, ['--import', 'tsx', fetcherPath, planPath], {
      cwd: process.cwd(), encoding: 'utf8', timeout: 60_000, maxBuffer: 1024 * 1024,
      env: process.env,
    });
    if (child.error || child.status !== 0) {
      results.push({
        sourceId: source.id, sourceName: source.name, status: 'probe_failed',
        reason: String(child.error?.message || child.stderr || child.stdout || 'Local probe process failed.').slice(0, 1200),
        requestCount: null,
      });
      continue;
    }
    let output = {};
    try { output = JSON.parse(child.stdout); } catch { /* report below records a parse failure */ }
    results.push({
      sourceId: source.id, sourceName: source.name, status: output.report?.outcome || 'probe_output_unreadable',
      requestCount: output.report?.requestCount ?? null,
      reportPath: output.outputDir ? path.relative(path.dirname(absoluteInput), path.join(output.outputDir, 'probe-report.json')) : null,
    });
  }
  const summary = results.reduce((acc, item) => { acc[item.status] = (acc[item.status] || 0) + 1; return acc; }, {});
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'owner_triggered_local_limited_research_probe',
    sourceCount: registry.sources.length,
    requestsSentByThisBatch: results.some((item) => item.status === 'probe_failed') ? null : results.reduce((sum, item) => sum + (item.requestCount || 0), 0),
    summary,
    results,
  };
  const reportPath = path.join(path.dirname(absoluteInput), 'immogr-local-probe-batch-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  process.stdout.write(JSON.stringify({ reportPath, sourceCount: report.sourceCount, requestsSentByThisBatch: report.requestsSentByThisBatch, summary }, null, 2) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write('ImmoGR local probe batch stopped: ' + (error instanceof Error ? error.message : 'unknown error') + '\n');
    process.exitCode = 1;
  });
}
