// Publish the generated ASSISTANT HANDOFF as the main GitHub Actions job summary.
// The report itself is generated first by patch-quality-report.mjs; no model/API calls.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.env.CI_LOGS_DIR || 'artifacts/ci-checks');
const reportPath = path.join(dir, 'NEXT_PATCH.md');
let report = '';
try { report = fs.readFileSync(reportPath, 'utf8'); } catch {}
if (!report.trim()) {
  report = [
    '# BiForge ASSISTANT HANDOFF', '',
    `PATCH_STATUS=${process.env.CI_STATUS || 'unknown'}`,
    'ERROR=NEXT_PATCH.md was not generated; inspect the preceding workflow step and available logs.',
    'NEXT_ACTION=Fix report-generation/workflow setup before interpreting missing test results.', ''
  ].join('\n');
}
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
