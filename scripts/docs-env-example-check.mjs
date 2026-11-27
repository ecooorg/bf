#!/usr/bin/env node
/** Ensure each application environment variable is represented in .env.example. */
import fs from 'node:fs';

const inventory = JSON.parse(fs.readFileSync('docs/generated-env-inventory.json', 'utf8'));
const example = fs.readFileSync('.env.example', 'utf8');
const documented = new Set([...example.matchAll(/^\s*#?\s*([A-Z][A-Z0-9_]*)\s*=/gm)].map((match) => match[1]));
const ciOnly = /^(?:CI|GITHUB_ACTIONS|GITHUB_EVENT_NAME|GITHUB_REF|GITHUB_SHA|GITHUB_TOKEN|GITHUB_WORKFLOW|RUNNER_|ACTIONS_)/;
// Historical ImmoFinder source remains in Git for audit only. Its environment
// variables are not active application configuration and are intentionally
// excluded from the current .env.example contract.
const isRetiredImmoFinderSource = (file) =>
  file.startsWith('server/immofinder') || file.startsWith('src/ImmoFinder');
const activeVariables = inventory.variables.filter(({ files = [] }) =>
  files.some((file) => !isRetiredImmoFinderSource(file)),
);
const missing = activeVariables.map(({ name }) => name).filter((name) => !ciOnly.test(name) && !documented.has(name));
if (missing.length) {
  console.error(`Environment example coverage: FAIL (${missing.length} missing)`);
  for (const name of missing) console.error(`- ${name}`);
  process.exit(1);
}
console.log(`Environment example coverage: PASS (${activeVariables.filter(({ name }) => !ciOnly.test(name)).length} application variables represented)`);
