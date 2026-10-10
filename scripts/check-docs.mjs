import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const candidates = ['README.md', 'AGENTS.md', 'DEPLOY_RAILWAY.md', 'docs'];
const files = [];
function walk(p) {
  for (const ent of fs.readdirSync(p, { withFileTypes: true })) {
    const full = path.join(p, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (ent.isFile() && full.endsWith('.md')) files.push(full);
  }
}
for (const c of candidates) {
  const full = path.join(root, c);
  if (!fs.existsSync(full)) continue;
  if (fs.statSync(full).isDirectory()) walk(full); else files.push(full);
}
const errors = [];
for (const file of [...new Set(files)]) {
  const text = fs.readFileSync(file, 'utf8');
  // Markdown inline links and images; skip URLs, mailto, anchors, and templated links.
  for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const raw = match[1].trim().split(/\s+/)[0].replace(/^<|>$/g, '');
    if (!raw || /^(?:https?:|mailto:|tel:|#|data:|\{\{)/i.test(raw)) continue;
    const target = decodeURIComponent(raw.split('#')[0].split('?')[0]);
    if (!target) continue;
    const resolved = path.resolve(path.dirname(file), target);
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
      errors.push(`${path.relative(root, file)}: link escapes repository: ${raw}`);
    } else if (!fs.existsSync(resolved)) {
      errors.push(`${path.relative(root, file)}: missing link target: ${raw}`);
    }
  }
}
// P00: every path in backticks in the main documents must exist.
// Skipped: URLs, placeholders (XX, NN, 0X, <...>, *), generated output, and lines marked "will be created".
const pathDocs = ['AGENTS.md', 'README.md', 'DEPLOY_RAILWAY.md', 'docs/START_HERE.md', 'docs/REPO_MAP.md'];
const EXT = /\.(md|ts|tsx|mjs|json|toml|yaml|yml|txt|sql|sh|html|css|png|svg|example)$/i;
const GENERATED = /^(dist|dist-server|node_modules|artifacts)(\/|$)|^perf-report\.json$/;
let pathChecks = 0;
for (const rel of pathDocs) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { errors.push(`${rel}: file listed for path checks is missing`); continue; }
  const text = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
  for (const line of text.split('\n')) {
    if (/will be created|to be created/i.test(line)) continue;
    for (const m of line.matchAll(/`([^`\n]+)`/g)) {
      let tok = m[1].trim();
      if (/\s/.test(tok) || /[*<>{}$=:|(),;@]/.test(tok) || /XX|NN|0X/.test(tok) || /^(https?|mailto):/i.test(tok)) continue;
      tok = tok.replace(/^\.\//, '').replace(/\/$/, '');
      if (!tok || tok.startsWith('/') || !(EXT.test(tok) || m[1].trim().endsWith('/')) || GENERATED.test(tok)) continue;
      pathChecks++;
      if (!fs.existsSync(path.resolve(root, tok))) errors.push(`${rel}: missing path in backticks: ${m[1]}`);
    }
  }
}
if (errors.length) {
  console.error(`check:docs failed (${errors.length} problem(s))`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`check:docs OK (${files.length} Markdown files, ${pathChecks} backticked paths checked)`);
