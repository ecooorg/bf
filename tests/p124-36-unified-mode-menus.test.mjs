import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const appHeader = readFileSync(new URL('../src/AppHeader.tsx', import.meta.url), 'utf8');
const project = readFileSync(new URL('../src/ProjectMode.tsx', import.meta.url), 'utf8');
const modeMenu = readFileSync(new URL('../src/ModeMenu.tsx', import.meta.url), 'utf8');

test('Conversational and Expert expose the same decision-level More actions', () => {
  assert.match(appHeader, /props\.onBrief &&/);
  assert.match(appHeader, /props\.onDelete &&/);
  assert.doesNotMatch(appHeader, /props\.expertMode && props\.onBrief/);
  assert.doesNotMatch(appHeader, /props\.expertMode && props\.onDelete/);
  assert.match(app, /onBrief=\{\(\) =>/);
  assert.match(app, /onDelete=\{\(\) => removeDecision\(d\.id\)\}/);
});

test('Architect top bar provides New and History routes into the shared conversation tools', () => {
  assert.match(project, /data-testid="architect-new-conversation"/);
  assert.match(project, /biforge-new-conversation/);
  assert.match(project, /data-testid="architect-conversation-history"/);
  assert.match(project, /biforge-open-history/);
  assert.match(app, /biforge-new-conversation/);
  assert.match(app, /biforge-open-history/);
});

test('Conversational and Expert can reach Architect tools; Architect can reach conversation tools', () => {
  assert.match(appHeader, /onProjectWorkspace/);
  assert.match(app, /onProjectWorkspace=\{projectModeEnabled \?/);
  assert.match(project, /data-testid="architect-conversation-tools"/);
  assert.match(project, /Conversation tools \(import, export, saved texts, AI key\)/);
});

test('all modes retain the same three-agent mode selector', () => {
  assert.match(modeMenu, /Conversational/);
  assert.match(modeMenu, /Expert/);
  assert.match(modeMenu, /Architect/);
  assert.match(project, /<ModeMenu current="Project"/);
  assert.match(appHeader, /<ModeMenu current=\{props\.expertMode \? 'Expert' : 'Simple'\}/);
});
