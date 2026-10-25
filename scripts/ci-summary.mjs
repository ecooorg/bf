// P96: GitHub Actions Summary is exactly NEXT_PATCH.md; no duplicate generic summary.
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
    '# BiForge ASSISTANT HANDOFF',
    `PATCH_STATUS=${process.env.CI_STATUS || 'unknown'}`,
    'ERROR=NEXT_PATCH.md missing; report generator did not produce evidence.',
    'NEXT_ACTION=Inspect workflow/report-generator logs; do not infer product-code root cause.',
  ].join('\n') + '\n';
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(reportPath, report);
}
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
