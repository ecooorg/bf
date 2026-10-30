import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import { chromium } from 'playwright';

const PASS = 'p120-e2e-local-pass';
const SECRET = 'p120-e2e-session-secret-'.padEnd(40, 'x');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close((error) => error ? reject(error) : resolve(address.port));
  });
});

 test('P120.0.2 Expert browser scenario: analysis error, retry, and context continuity', async (t) => {
  if (!existsSync('dist/index.html')) {
    const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', timeout: 180_000 });
    assert.equal(build.status, 0, 'npm run build must succeed before the browser scenario');
  }

  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn('tsx', ['server.ts'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      APP_PASSWORD: PASS,
      SESSION_SECRET: SECRET,
      GEMINI_API_KEY: 'not-used-browser-mock-key',
      DATABASE_URL: '',
      ENABLE_PROJECT_MODE: 'false',
    },
  });
  let serverOutput = '';
  server.stdout.on('data', (chunk) => { serverOutput += chunk; });
  server.stderr.on('data', (chunk) => { serverOutput += chunk; });
  let browser;

  try {
    let healthy = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (server.exitCode !== null) throw new Error(`server exited before ready:\n${serverOutput}`);
      try {
        const response = await fetch(`${base}/api/health`);
        if (response.ok) { healthy = true; break; }
      } catch {}
      await sleep(250);
    }
    assert.equal(healthy, true, `server did not become healthy:\n${serverOutput}`);

    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);

    const expertRequests = [];
    const analysisRequests = [];
    let analysisFailureInjected = false;
    const reply = 'Let us examine the decision carefully.';
    await page.route('**/api/agent/expert', async (route) => {
      expertRequests.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        success: true, data: { reply, state: {}, triage: 'NORMAL', nextStep: 'Analyze the decision.',
          options: [], newOptions: [], newOptionTypes: [], factsToCheck: [], attachmentNotes: [] }, meta: {},
      }) });
    });
    await page.route('**/api/understand', async (route) => {
      analysisRequests.push(route.request().postDataJSON());
      if (!analysisFailureInjected) {
        analysisFailureInjected = true;
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({
          success: false, error: { code: 'PROVIDER_UNAVAILABLE', message: 'Temporary provider outage' },
        }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          success: true, data: { neutralization: { items: [] }, radar: {
            facts: [], assumptions: [], interpretations: [], values: [], needsExternalCheck: [], unknowns: [],
          } }, meta: {},
        }) });
      }
    });

    await page.goto(base);
    const signIn = page.getByRole('textbox', { name: 'Sign in' });
    await signIn.fill(PASS);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByTestId('start-mode-expert').click();
    await page.getByRole('button', { name: /Start conversation/i }).click();

    const firstPrompt = 'Help me plan a careful first step for a new project.';
    await page.locator('.conversation-input').fill(firstPrompt);
    await page.locator('.conversation-entry-actions button.primary').click();
    await page.getByRole('button', { name: 'Retry analysis' }).waitFor();
    assert.equal(expertRequests.length, 1, 'Expert entry request must succeed once');
    assert.equal(analysisRequests.length, 1, 'first analysis must fail exactly once');
    assert.equal(analysisRequests[0].brief?.decision, firstPrompt);
    await page.getByRole('button', { name: 'Retry analysis' }).click();
    await page.waitForFunction(() => document.body.textContent?.includes('Analysis could not be completed.') === false);
    await page.waitForTimeout(300);
    assert.equal(analysisRequests.length, 2, 'retry must reissue analysis');
    assert.deepEqual(analysisRequests[1].brief, analysisRequests[0].brief, 'retry must preserve original brief');
    assert.deepEqual(analysisRequests[1].history, analysisRequests[0].history, 'retry must preserve conversation context');
    assert.equal(expertRequests.length, 1, 'analysis retry must not resend the Expert entry message');

    await context.close();
    t.diagnostic('Coverage: real app server, authenticated browser UI, Expert analysis error/retry, preserved brief and history, route and payload contract. Model output is deterministic and mocked; live provider behavior is not covered.');
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server.exitCode === null) {
      server.kill('SIGTERM');
      await Promise.race([
        new Promise((resolve) => server.once('exit', resolve)),
        sleep(3000),
      ]);
      if (server.exitCode === null) server.kill('SIGKILL');
    }
  }
});
