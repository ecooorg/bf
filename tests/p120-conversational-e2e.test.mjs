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

 test('P120.0.1 Conversational full user scenario: sign in, start, send, receive, continue', async (t) => {
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

    const requests = [];
    const replies = [
      'Start by separating what you know from what you still need to learn.',
      'Next, identify the smallest safe step and what evidence would make it useful.',
    ];
    await page.route('**/api/agent/conversational', async (route) => {
      const request = route.request();
      assert.equal(request.method(), 'POST');
      assert.equal(new URL(request.url()).pathname, '/api/agent/conversational');
      const payload = request.postDataJSON();
      requests.push(payload);
      const reply = replies[requests.length - 1];
      assert.ok(reply, 'unexpected extra Conversational request');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            reply,
            state: {},
            triage: 'NORMAL',
            nextStep: 'Continue with one concrete step.',
            options: [],
            newOptions: [],
            newOptionTypes: [],
            factsToCheck: [],
            attachmentNotes: [],
          },
          meta: { testFixture: 'p120.0.1' },
        }),
      });
    });

    await page.goto(base);
    const signIn = page.getByRole('textbox', { name: 'Sign in' });
    await signIn.fill(PASS);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByTestId('start-mode-simple').click();
    await page.getByRole('button', { name: /Start conversation/i }).click();

    const firstPrompt = 'Help me plan a careful first step for a new project.';
    await page.locator('.conversation-input').fill(firstPrompt);
    await page.locator('.conversation-entry-actions button.primary').click();
    await page.getByText(replies[0], { exact: true }).waitFor();

    assert.equal(requests.length, 1, 'first user send must make exactly one request');
    assert.equal(requests[0].brief?.decision, firstPrompt);
    assert.ok(Array.isArray(requests[0].history), 'first request must include conversation history');
    assert.equal(requests[0].history.at(-1)?.role, 'user');
    assert.equal(requests[0].history.at(-1)?.content, firstPrompt);

    const followUp = 'What evidence should I collect before committing?';
    await page.locator('.conversation-composer textarea').fill(followUp);
    await page.locator('.conversation-composer button.primary').click();
    await page.getByText(replies[1], { exact: true }).waitFor();

    assert.equal(requests.length, 2, 'follow-up must make one additional request');
    assert.equal(requests[1].brief?.decision, firstPrompt, 'follow-up must preserve the original brief');
    assert.ok(requests[1].history.some((item) => item.role === 'assistant' && item.content === replies[0]), 'follow-up must preserve the prior assistant answer');
    assert.ok(requests[1].history.some((item) => item.role === 'user' && item.content === followUp), 'follow-up must include the new user message');

    await context.close();
    t.diagnostic('Coverage: real app server, authenticated browser UI, two-turn Conversational flow, route and payload contract. Model output is deterministic and mocked; live provider behavior is not covered.');
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
