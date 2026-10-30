import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import { chromium } from 'playwright';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer(); server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(error => error ? reject(error) : resolve(port)); });
});
const envelope = data => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });

test('P122 lab browser flow reaches its own completion surface and downloads result', async t => {
  if (!existsSync('dist/index.html')) {
    const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', timeout: 180_000 });
    assert.equal(build.status, 0, 'production build must succeed before lab browser test');
  }
  const port = await freePort(); const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], { stdio: ['ignore', 'pipe', 'pipe'], env: {
    ...process.env, NODE_ENV: 'production', PORT: String(port), APP_PASSWORD: 'p122-lab-password',
    SESSION_SECRET: 'p122-lab-session-secret-'.padEnd(40, 'x'), GEMINI_API_KEY: 'not-used-fixture-key',
    // The browser test mocks every Project API; do not boot the legacy Project Mode/DB worker.
    // Set this explicitly after spreading the parent environment so a runner-level setting cannot enable it.
    ENABLE_PROJECT_MODE: 'false',
    DATABASE_URL: '',
  }});
  let output = ''; server.stdout.on('data', c => output += c); server.stderr.on('data', c => output += c);
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { if (server.exitCode !== null) throw new Error(output); try { if ((await fetch(`${base}/api/health`)).ok) { ready = true; break; } } catch {} await sleep(250); }
    assert.equal(ready, true, `server did not start: ${output}`);
    browser = await chromium.launch(); const context = await browser.newContext({ acceptDownloads: true }); const page = await context.newPage();
    const browserErrors = [];
    page.on('pageerror', error => browserErrors.push(`pageerror: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') browserErrors.push(`console error: ${message.text()}`); });
    page.on('requestfailed', request => browserErrors.push(`requestfailed: ${request.url()} — ${request.failure()?.errorText || 'unknown'}`));
    await page.route('**/api/session', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, projectModeEnabled: true }) }));
    await page.route('**/api/projects/diagnostics/session-log**', route => route.fulfill({ status: 200, contentType: 'text/plain', body: 'LAB_DIAGNOSTIC_FIXTURE: ready' }));
    await page.route('**/api/projects/diagnostics/system', route => route.fulfill(envelope({ status: 'ok' })));
    await page.route('**/api/projects/diagnostics/operations', route => route.fulfill(envelope([])));
    await page.route('**/api/projects/diagnostics/export', route => route.fulfill({ status: 200, contentType: 'application/zip', body: Buffer.from('diagnostic-fixture') }));
    await page.route('**/api/projects', route => route.request().method() === 'POST'
      ? route.fulfill(envelope({ id: 'p122-lab-project', name: 'Lab fixture', state_version: 1, state: { passport: { status: 'proposed' } } }))
      : route.fulfill(envelope([])));
    let passportConfirmed = false;
    await page.route('**/api/projects/p122-lab-project/state', async route => {
      const payload = route.request().postDataJSON();
      passportConfirmed = payload.state?.passport?.status === 'confirmed';
      await route.fulfill(envelope({ project_id: 'p122-lab-project', state_version: 2, state: payload.state }));
    });
    await page.route('**/api/projects/p122-lab-project/code/build', route => {
      assert.equal(passportConfirmed, true, 'build must not start before passport confirmation');
      return route.fulfill(envelope({ status: 'done', outcome: 'SUCCESS', goalImplemented: true, downloadUrl: '/test-lab.zip', note: 'Fixture build completed.' }));
    });
    await page.route('**/test-lab.zip', route => route.fulfill({ status: 200, contentType: 'application/zip', headers: { 'content-disposition': 'attachment; filename="architectural-lab.zip"' }, body: Buffer.from('fixture-zip') }));
    await page.goto(`${base}/architect-lab`);
    await page.getByTestId('architect-lab-build-form').waitFor();
    await page.getByTestId('architect-lab-diagnostics-menu').click();
    const diagnosticResponse = page.waitForResponse(response => response.url().includes('/api/projects/diagnostics/session-log') && response.status() === 200, { timeout: 10_000 });
    await page.getByRole('menuitem', { name: 'Compact session log' }).click();
    await diagnosticResponse;
    const diagnosticReport = page.getByLabel('Diagnostic report');
    await diagnosticReport.waitFor();
    await page.waitForFunction(() => {
      const report = document.querySelector('textarea[aria-label=\"Diagnostic report\"]');
      return report instanceof HTMLTextAreaElement && report.value === 'LAB_DIAGNOSTIC_FIXTURE: ready';
    }, { timeout: 10_000 });
    assert.equal(await diagnosticReport.inputValue(), 'LAB_DIAGNOSTIC_FIXTURE: ready');
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByLabel('What should be built?').fill('Create a small task tracker with a working add-task button.');
    await page.getByTestId('architect-lab-build').click();
    await page.getByTestId('architect-lab-passport').waitFor();
    assert.match(await page.getByTestId('architect-lab-passport').innerText(), /personal expenses|expense/i);
    await page.getByTestId('architect-lab-confirm-passport').click();
    await page.getByTestId('architect-lab-completion').getByText('SUCCESS').waitFor();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('architect-lab-download').click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'architectural-lab-result.zip');
    assert.deepEqual(browserErrors, [], `browser runtime errors:\n${browserErrors.join('\n')}`);
  } finally { await browser?.close(); server.kill('SIGTERM'); }
});
