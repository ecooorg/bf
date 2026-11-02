#!/usr/bin/env node
/** Check repository paths in maintained, non-historical documentation. */
import fs from 'node:fs';
import path from 'node:path';

const files = [
  'docs/API_CONTRACTS.md',
  'docs/SECURITY_AND_PRIVACY.md',
  'docs/INFORMATION_QUALITY_WORKFLOW.md',
  'docs/USER_VALUE_EVALUATION.md',
  'docs/USER_VALUE_EXPERT_C122.md',
];
const pathLike = /^(?:\.\.?\/)?[\w./-]+\.(?:md|mjs|js|ts|tsx|json|yml|yaml|sql|sh|zip)$/;
const missing = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/`([^`]+)`/g)) {
    const candidate = match[1];
    if (!pathLike.test(candidate) || candidate.includes('*')) continue;
    const resolved = [path.resolve(candidate), path.resolve(path.dirname(file), candidate)];
    if (!resolved.some((target) => fs.existsSync(target))) missing.push({ file, candidate });
  }
}
if (missing.length) {
  console.error(`Documentation reference integrity: FAIL (${missing.length} missing repository paths)`);
  for (const item of missing) console.error(`- ${item.file}: \`${item.candidate}\``);
  process.exit(1);
}
console.log(`Documentation reference integrity: PASS (${files.length} maintained documents scanned)`);
