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

test('P123.18 Conversational and Expert transitions isolate session context', async (t) => {
  if (!existsSync('dist/index.html')) {
    const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', timeout: 180_000 });
    assert.equal(build.status, 0, 'npm run build must succeed before the browser scenario');
  }

  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
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
      'First response: keep the original goal and assumptions visible.',
      'Follow-up response: use the same goal and earlier answer.',
    ];
    await page.route('**/api/agent/conversational', async (route) => {
      const request = route.request();
      assert.equal(request.method(), 'POST');
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
            reply, state: {}, triage: 'NORMAL', nextStep: 'Continue with the existing goal.',
            options: [], newOptions: [], newOptionTypes: [], factsToCheck: [], attachmentNotes: [],
          },
          meta: { testFixture: 'p120.0.4' },
        }),
      });
    });

    await page.goto(base);
    await page.getByRole('textbox', { name: 'Sign in' }).fill(PASS);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByTestId('start-mode-simple').click();
    await page.getByRole('button', { name: /Start conversation/i }).click();

    const firstPrompt = 'Keep this project goal when I switch agents: launch a community garden.';
    await page.locator('.conversation-input').fill(firstPrompt);
    await page.locator('.conversation-entry-actions button.primary').click();
    await page.getByText(replies[0], { exact: true }).waitFor();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].brief?.decision, firstPrompt);

    // Switching agents creates a new independent Decision; the old session remains saved in the library.
    await page.getByTestId('mode-menu-button').click();
    await page.getByTestId('mode-item-expert').click();
    await page.getByTestId('mode-menu-button').waitFor();
    assert.equal(await page.getByTestId('mode-menu-button').innerText(), 'Expert');

    await page.getByTestId('mode-menu-button').click();
    await page.getByTestId('mode-item-simple').click();
    assert.equal(await page.getByTestId('mode-menu-button').innerText(), 'Conversational');
    // Switching agents creates the new empty Decision immediately; the chat composer
    // is therefore mounted directly and the empty-state Start conversation button is absent.
    await page.locator('.conversation-composer textarea').waitFor();
    await page.getByRole('button', { name: /Start conversation/i }).waitFor({ state: 'detached' });

    const followUp = 'What is the smallest next step for a completely separate question?';
    await page.locator('.conversation-composer textarea').fill(followUp);
    await page.locator('.conversation-composer button.primary').click();
    await page.getByText(replies[1], { exact: true }).waitFor();

    assert.equal(requests.length, 2, 'switching agents must not itself submit duplicate turns');
    assert.equal(requests[1].brief?.decision, followUp, 'the new Conversational session must start from its own brief');
    assert.equal(requests[1].history.some((item) => item.content === firstPrompt), false, 'prior Expert/Conversational session must not leak into the new session');
    assert.equal(requests[1].history.some((item) => item.content === replies[0]), false, 'prior assistant response must not cross the mode boundary');

    // Architect is intentionally a separate workspace; this deployment keeps it disabled.
    await page.getByTestId('mode-menu-button').click();
    const architectItem = page.getByTestId('mode-item-project');
    assert.equal(await architectItem.isDisabled(), true, 'disabled Architect must not be selectable from chat');
    assert.equal(requests.length, 2, 'opening the menu must not send a conversation request');

    await context.close();
    t.diagnostic('Coverage: authenticated browser, Conversational → Expert → Conversational switch, fresh isolated session after each agent switch, no duplicate turns, and disabled Architect entry remains unavailable. Responses are deterministic and mocked; live provider behavior and enabled Architect navigation are not covered here.');
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
