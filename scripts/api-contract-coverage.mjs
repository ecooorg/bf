#!/usr/bin/env node
import fs from 'node:fs';
const inventory = JSON.parse(fs.readFileSync('docs/generated-route-inventory.json', 'utf8'));
const docPath = 'docs/API_CONTRACTS.md';
const doc = fs.readFileSync(docPath, 'utf8');
const begin = '<!-- BEGIN GENERATED ROUTE INDEX -->';
const end = '<!-- END GENERATED ROUTE INDEX -->';
const startAt = doc.indexOf(begin);
const endAt = doc.indexOf(end);
if (startAt < 0 || endAt < 0 || endAt < startAt) {
  console.error('API_CONTRACTS.md is missing generated route index markers');
  process.exit(1);
}
const rows = inventory.routes.map((route) =>
  `| \`${route.method}\` | \`${route.path}\` | \`${route.file}\` | Source inventory only; detailed request/response schema pending |`
).join('\n');
const generated = `${begin}\n| Method | Path | Registration source | Contract detail status |\n|---|---|---|---|\n${rows}\n${end}`;
const current = doc.slice(startAt, endAt + end.length);
if (process.argv.includes('--write')) {
  fs.writeFileSync(docPath, doc.replace(current, generated));
  console.log(`API route index generated (${inventory.routes.length} routes)`);
} else if (current !== generated) {
  console.error(`API route index is stale: expected ${inventory.routes.length} rows from generated-route-inventory.json`);
  process.exit(1);
} else {
  console.log(`API contract route index: PASS (${inventory.routes.length}/${inventory.count} source routes indexed; detailed schemas are explicitly marked pending)`);
}
