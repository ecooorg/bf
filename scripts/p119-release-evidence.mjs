import { mkdir, writeFile, appendFile } from 'node:fs/promises';

const sha = String(process.env.GITHUB_SHA || '').toLowerCase();
const runId = String(process.env.GITHUB_RUN_ID || '');
const attempt = String(process.env.GITHUB_RUN_ATTEMPT || '');
if (!/^[0-9a-f]{40}$/.test(sha) || !/^\d+$/.test(runId) || !/^\d+$/.test(attempt)) {
  throw new Error('Full GITHUB_SHA, GITHUB_RUN_ID and GITHUB_RUN_ATTEMPT are required for release evidence');
}
const checks = {
  fullCiDag: process.env.CI_OUTCOME || 'NOT_RUN',
  uiTests: process.env.UI_OUTCOME || 'NOT_RUN',
  conversationalExpertLive: process.env.AGENTS_OUTCOME || 'NOT_RUN',
  liveUiAndAgentEntry: process.env.LIVE_UI_OUTCOME || 'NOT_RUN',
  architectDeploymentPreflight: process.env.ARCHITECT_PREFLIGHT_OUTCOME || 'NOT_RUN',
  architectVerifiedZip: process.env.ARCHITECT_OUTCOME || 'NOT_RUN',
};
const accepted = Object.values(checks).every(value => value === 'success');
const evidence = {
  gate: 'P119.0.7',
  verdict: accepted ? 'PASS' : 'FAIL',
  formalAcceptance: 'PENDING_NAVIGATOR',
  commit: sha,
  workflowRun: { id: runId, attempt },
  checks,
  generatedAt: new Date().toISOString(),
  rule: 'PASS requires every required check to have outcome success. This evidence does not itself constitute Navigator acceptance.',
};
await mkdir('p119-live', { recursive: true });
await writeFile('p119-live/release-gate.json', `${JSON.stringify(evidence, null, 2)}\n`);
const summary = [
  '### P119.0.7 Release Gate',
  `- Verdict: **${evidence.verdict}**`,
  `- Commit: ${sha}`,
  `- Formal acceptance: **PENDING NAVIGATOR**`,
  ...Object.entries(checks).map(([name, value]) => `- ${name}: **${value}**`),
].join('\n') + '\n';
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(summary);
if (!accepted) process.exitCode = 1;
