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
  const server = spawn('tsx', ['server.ts'], { stdio: ['ignore', 'pipe', 'pipe'], env: {
    ...process.env, NODE_ENV: 'production', PORT: String(port), APP_PASSWORD: 'p122-lab-password',
    SESSION_SECRET: 'p122-lab-session-secret-'.padEnd(40, 'x'), GEMINI_API_KEY: 'not-used-fixture-key',
    DATABASE_URL: '', ENABLE_PROJECT_MODE: 'true',
  }});
  let output = ''; server.stdout.on('data', c => output += c); server.stderr.on('data', c => output += c);
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { if (server.exitCode !== null) throw new Error(output); try { if ((await fetch(`${base}/api/health`)).ok) { ready = true; break; } } catch {} await sleep(250); }
    assert.equal(ready, true, `server did not start: ${output}`);
    browser = await chromium.launch(); const context = await browser.newContext({ acceptDownloads: true }); const page = await context.newPage();
    await page.route('**/api/session', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, projectModeEnabled: true }) }));
    await page.route('**/api/projects', route => route.request().method() === 'POST'
      ? route.fulfill(envelope({ id: 'p122-lab-project', name: 'Lab fixture' }))
      : route.fulfill(envelope([])));
    await page.route('**/api/projects/p122-lab-project/code/build', route => route.fulfill(envelope({ status: 'done', outcome: 'SUCCESS', goalImplemented: true, downloadUrl: '/test-lab.zip', note: 'Fixture build completed.' })));
    await page.route('**/test-lab.zip', route => route.fulfill({ status: 200, contentType: 'application/zip', headers: { 'content-disposition': 'attachment; filename="architectural-lab.zip"' }, body: Buffer.from('fixture-zip') }));
    await page.goto(`${base}/architect-lab`);
    await page.getByTestId('architect-lab-build-form').waitFor();
    await page.getByLabel('What should be built?').fill('Create a small task tracker with a working add-task button.');
    await page.getByTestId('architect-lab-build').click();
    await page.getByTestId('architect-lab-completion').getByText('SUCCESS').waitFor();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('architect-lab-download').click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'architectural-lab.zip');
  } finally { await browser?.close(); server.kill('SIGTERM'); }
});
