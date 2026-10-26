// P96: GitHub Actions Summary is exactly NEXT_PATCH.md; no duplicate generic summary.
// P105: when the generator produced nothing, write a minimal NEXT_PATCH.md plus a schema-valid fallback handoff-report.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.env.CI_LOGS_DIR || 'artifacts/ci-checks');
const reportPath = path.join(dir, 'NEXT_PATCH.md');
let report = '';
try { report = fs.readFileSync(reportPath, 'utf8'); } catch {}
if (!report.trim()) {
  const lines = [
    '# BiForge ASSISTANT HANDOFF',
    `PATCH_STATUS=${process.env.CI_STATUS || 'unknown'}`,
    'ERROR=NEXT_PATCH.md missing; report generator did not produce evidence.',
    'NEXT_ACTION=Inspect workflow/report-generator logs; do not infer product-code root cause.',
  ];
  fs.mkdirSync(dir, { recursive: true });
  try {
    const lib = await import('./evidenceLib.mjs');
    const fallback = lib.buildFallbackHandoff(process.env.CI_STATUS);
    if (lib.validateHandoffReport(fallback).ok) {
      fs.writeFileSync(path.join(dir, 'handoff-report.json'), JSON.stringify(fallback, null, 2) + '\n');
      lines.push(`HANDOFF_JSON=${JSON.stringify(fallback)}`);
    }
  } catch {}
  report = lines.join('\n') + '\n';
  fs.writeFileSync(reportPath, report);
}
// Intentionally no console or GitHub Actions step-summary output; NEXT_PATCH.md is the sole handoff.
