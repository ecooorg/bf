import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForProjectBuild } from '../src/projectBuildJob.ts';

test('staged build polls until done and returns ZIP URL', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ success: true, data: ++calls === 1 ? { jobId: 'job-1', status: 'running', stage: 'code' } : { jobId: 'job-1', status: 'done', goalImplemented: true, downloadUrl: '/download.zip' } }) });
  const originalTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => { fn(); return 0; };
  try {
    const result = await waitForProjectBuild('project-1', { jobId: 'job-1' });
    assert.equal(result.status, 'done');
    assert.equal(result.downloadUrl, '/download.zip');
    assert.match(result.note, /validated/i);
  } finally { globalThis.fetch = originalFetch; globalThis.setTimeout = originalTimeout; }
});

test('failed staged build returns an actionable message instead of a blank result', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ success: true, data: { jobId: 'job-2', status: 'failed', error: { message: 'rate_limited' } } }) });
  try {
    const result = await waitForProjectBuild('project-1', { jobId: 'job-2' });
    assert.equal(result.status, 'failed');
    assert.match(result.note, /rate_limited/);
    assert.match(result.note, /diagnostics/i);
  } finally { globalThis.fetch = originalFetch; }
});


test('staged build result without legacy codeTask remains a valid Architect result', async () => {
  const originalFetch = globalThis.fetch;
  const originalTimeout = globalThis.setTimeout;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ success: true, data: {
    jobId: 'job-without-code-task', status: 'done', outcome: 'SUCCESS',
    goalImplemented: true, downloadUrl: '/artifact.zip', note: 'Build completed.'
  } }) });
  globalThis.setTimeout = (fn) => { fn(); return 0; };
  try {
    const result = await waitForProjectBuild('project-1', { jobId: 'job-without-code-task' });
    assert.equal(result.status, 'done');
    assert.equal(result.downloadUrl, '/artifact.zip');
    assert.equal(result.codeTask, undefined);
    assert.equal(result.note, 'Build completed.');
  } finally { globalThis.fetch = originalFetch; globalThis.setTimeout = originalTimeout; }
});
