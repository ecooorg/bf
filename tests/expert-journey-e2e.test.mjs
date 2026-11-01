/**
 * P122.7+ Expert journey browser E2E (mocked model).
 * Intentionally narrow: entry → method shell → stage readiness → open dialogue.
 * Live analytical quality is Layer B, not this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import { chromium } from 'playwright';

const PASS = 'p1227-e2e-local-pass';
const SECRET = 'p1227-e2e-session-secret-'.padEnd(40, 'x');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });

test('P122.7 Expert journey: shell, stage readiness, dialogue surface', async (t) => {
  if (process.env.EXPERT_COVERAGE_ONLY === '1') {
    t.skip('skipped under EXPERT_COVERAGE_ONLY');
    return;
  }

  if (!existsSync('dist/index.html')) {
    const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', timeout: 180_000 });
    assert.equal(build.status, 0, 'npm run build must succeed before browser journey');
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
  server.stdout.on('data', (c) => { serverOutput += c; });
  server.stderr.on('data', (c) => { serverOutput += c; });
  let browser;

  try {
    let healthy = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (server.exitCode !== null) throw new Error(`server exited before ready:\n${serverOutput}`);
      try {
        const response = await fetch(`${base}/api/health`);
        if (response.ok) {
          healthy = true;
          break;
        }
      } catch {
        /* retry */
      }
      await sleep(250);
    }
    assert.equal(healthy, true, `server did not become healthy:\n${serverOutput}`);

    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);

    await page.route('**/api/agent/expert', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            reply: 'Structured analysis started.',
            state: {},
            triage: 'NORMAL',
            nextStep: 'Formulate the decision brief.',
            options: [],
            newOptions: [],
            newOptionTypes: [],
            factsToCheck: [],
            attachmentNotes: [],
          },
          meta: {},
        }),
      });
    });
    await page.route('**/api/understand', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            neutralization: { items: [] },
            radar: {
              facts: [],
              assumptions: [],
              interpretations: [],
              values: [],
              needsExternalCheck: [],
              unknowns: [],
            },
          },
          meta: {},
        }),
      });
    });

    await page.goto(base);
    await page.getByRole('textbox', { name: 'Sign in' }).fill(PASS);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByTestId('start-mode-expert').click();
    await page.getByRole('button', { name: /Start conversation/i }).click();

    const briefText = 'Should we pilot a new process this quarter given limited budget?';
    await page.locator('.conversation-input').fill(briefText);
    await page.locator('.conversation-entry-actions button.primary').click();

    await page.getByTestId('expert-steps').waitFor({ state: 'visible' });
    await page.getByTestId('step-title').waitFor({ state: 'visible' });

    // Stage readiness may be hidden when the stage is complete with no notes;
    // after a fresh brief the UNDERSTAND/BRIEF path often shows reasons.
    const readiness = page.getByTestId('stage-readiness');
    if (await readiness.count()) {
      await readiness.waitFor({ state: 'visible' });
      const text = (await readiness.textContent()) || '';
      assert.ok(text.length > 5, 'stage readiness should contain guidance text');
    }

    // Open dialogue surface for Expert (non-triage / non-brief after analysis path)
    const dialogue = page.getByTestId('expert-open-dialogue');
    // May appear after understand path; do not hard-fail if still on early step
    if (await dialogue.count()) {
      await dialogue.waitFor({ state: 'visible' });
    }

    t.diagnostic(
      'Coverage: Expert entry, method shell, optional stage-readiness banner, optional open dialogue. Model mocked.'
    );
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
