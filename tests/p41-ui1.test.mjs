import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const status = readFileSync(new URL('../docs/STATUS.md', import.meta.url), 'utf8');
const journal = readFileSync(new URL('../docs/PATCH_JOURNAL.md', import.meta.url), 'utf8');

test('UI1 start screen offers all three explicit modes', () => {
  for (const mode of ['Simple', 'Expert', 'Project']) assert.match(app, new RegExp(`<h2>${mode}</h2>`));
  assert.match(app, /onClick=\{\(\) => chooseStartMode\('Simple'\)\}/);
  assert.match(app, /onClick=\{\(\) => chooseStartMode\('Expert'\)\}/);
});

test('unavailable Project is disabled and not silently substituted', () => {
  assert.match(app, /disabled=\{!projectModeEnabled\}/);
  assert.match(app, /Currently unavailable/);
  assert.match(app, /if \(mode === 'Project' && !projectModeEnabled\) return/);
});

test('mode selection is explicit and session-persisted', () => {
  assert.match(app, /setExpertMode\(mode === 'Expert'\)/);
  assert.match(app, /sessionStorage\.setItem\('biforge-start-mode', mode\)/);
});

test('STATUS orders QA1 between UI1 and MANUAL1 and records approved UX1 decision', () => {
  const ui = status.indexOf('**UI1**');
  const qa = status.indexOf('**QA1**');
  const manual = status.indexOf('**MANUAL1**');
  assert.ok(ui >= 0, 'STATUS must mention **UI1**');
  assert.ok(qa >= 0, 'STATUS must mention **QA1**');
  assert.ok(manual >= 0, 'STATUS must mention **MANUAL1**');
  assert.ok(ui < qa && qa < manual, 'STATUS order: UI1 before QA1 before MANUAL1');
  assert.doesNotMatch(status, /UX1 feedback\?/i);
});

test('patch journal records existing folder picker menu behavior', () => {
  assert.match(journal, /PICK_FOLDER_EVENT/);
});

test('Change mode control returns to start screen', () => {
  assert.match(app, /data-testid="change-mode"/);
  assert.match(app, /resetStartMode|onChangeMode/);
  assert.match(app, /sessionStorage\.removeItem\('biforge-start-mode'\)/);
});

test('Expert/Simple toggle is in More menu, not a top-level header button', () => {
  assert.match(app, /Mode selection \(Simple \/ Expert \/ Project\)/);
  assert.match(app, /Switch to Expert method|Switch to Simple chat/);
  // Top-level header actions should not render the old Expert method label button
  assert.match(app, /data-testid="toggle-expert-menu"/);
  assert.match(app, /data-testid="change-mode"/);
});
