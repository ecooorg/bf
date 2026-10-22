/**
 * Copy lint.
 *  1. Forbidden legacy phrases (TZ A-05, T14) — always fail.
 *  2. UI copy rules (P60): visible text must not contain internal jargon and must stay short.
 *     Existing violations are recorded as DEBT per file. A file may have fewer than its debt,
 *     never more: new violations fail the check. Never raise a number; fix the text instead.
 *
 * Visible text = JSX text and quoted strings that contain a space (class names, ids, paths excluded).
 * Run `node scripts/lint-copy.mjs --print-debt` to see the current counts.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.env.LINT_COPY_ROOT || 'src');
const PRINT_DEBT = process.argv.includes('--print-debt');

const FORBIDDEN = [
  /calculateOptionScore/,
  /Weighted Score Index/,
  /sensitivitySliders/,
  /costOfInactionAnnual/,
  /Recalculate scenarios/,
  /Anti-hallucination radar/,
  /Critical for forecast/,
  /probability calculation/,
];

// Words that describe how the system works inside. People should never have to read them.
const JARGON = {
  'kill criteria': /kill criteri/i,
  'locked card': /locked card/i,
  fingerprint: /fingerprint/i,
  waive: /\bwaiv/i,
  'hand-off': /hand-?off/i,
  gates: /\bgates?\b/i,
  scaffold: /scaffold/i,
  passport: /passport/i,
  'developer data': /developer data/i,
  'raw JSON': /raw json/i,
  model_patch: /model_patch/i,
};
const MAX_WORDS = 24; // hard ceiling for one visible string; the target for hints is 12 (see AGENTS.md)
const SKIP_FILES = new Set(['demo-coffee.ts', 'decision.ts']);
const NON_TEXT_ATTR = /(className|data-testid|href|src|type|key|role|htmlFor|name|id|style|target|rel|autoComplete|inputMode|accept|from|import)\s*=?\s*$/;

// Allowed existing violations: { 'path relative to src': { rule: count } }. Only ever decrease.
const DEBT = {
  'App.tsx': { 'long': 4 },
  'ProjectDelivery.tsx': { 'fingerprint': 2, 'gates': 2, 'hand-off': 6, 'long': 1, 'waive': 5 },
  'ProjectMode.tsx': { 'long': 2 },
  'ProjectNoviceWizard.tsx': { 'scaffold': 1 },
  'ProjectPathChooser.tsx': { 'long': 2 },
  'WorkspacePanel.tsx': { 'long': 1 },
  'driveMirror.ts': { 'long': 1 },
  'en.ts': { 'long': 1 },
  'projectAppBuilder.ts': {},
  'projectCapabilities.ts': { 'hand-off': 2 },
  'projectDeliveryModel.ts': { 'waive': 1 },
};

export function visibleTexts(src) {
  const out = [];
  for (const m of src.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) {
    const t = m[1].replace(/\s+/g, ' ').trim();
    if (/=>|;|\/\/|\)\s*\{/.test(t)) continue; // code, not text
    out.push(t);
  }
  for (const m of src.matchAll(/(?<![\w$])(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)")/g)) {
    const pre = src.slice(Math.max(0, m.index - 14), m.index);
    if (NON_TEXT_ATTR.test(pre)) continue;
    const s = m[1] ?? m[2];
    if (s && s.includes(' ') && /[A-Za-z]{3}/.test(s)) out.push(s);
  }
  return out;
}

export function scanFile(src) {
  const found = {}; // rule -> [strings]
  for (const t of visibleTexts(src)) {
    for (const [name, re] of Object.entries(JARGON)) if (re.test(t)) (found[name] ||= []).push(t);
    if (t.split(/\s+/).length > MAX_WORDS) (found.long ||= []).push(t);
  }
  return found;
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) files.push(p);
  }
  return files;
}

let failed = false;
const measured = {};
for (const p of walk(ROOT)) {
  const rel = path.relative(ROOT, p).split(path.sep).join('/');
  const text = fs.readFileSync(p, 'utf8');
  for (const re of FORBIDDEN) {
    if (re.test(text)) { console.error(`FORBIDDEN ${re} in ${p}`); failed = true; }
  }
  if (SKIP_FILES.has(path.basename(p)) || !/\.(ts|tsx)$/.test(p)) continue;
  const found = scanFile(text);
  for (const [rule, list] of Object.entries(found)) {
    (measured[rel] ||= {})[rule] = list.length;
    const allowed = DEBT[rel]?.[rule] ?? 0;
    if (!PRINT_DEBT && list.length > allowed) {
      failed = true;
      const what = rule === 'long' ? `text longer than ${MAX_WORDS} words` : `internal term "${rule}" in visible text`;
      console.error(`COPY ${rel}: ${list.length} × ${what} (allowed ${allowed}). Shorten or reword; do not raise the allowance.`);
      for (const t of list.slice(0, 5)) console.error(`  · ${t.length > 120 ? t.slice(0, 117) + '…' : t}`);
    }
  }
}
if (PRINT_DEBT) {
  console.log(JSON.stringify(measured, null, 2));
  process.exit(0);
}
for (const [rel, rules] of Object.entries(DEBT)) {
  for (const [rule, n] of Object.entries(rules)) {
    const now = measured[rel]?.[rule] ?? 0;
    if (now < n) console.log(`lint:copy note: ${rel} "${rule}" is now ${now} (allowance ${n}); lower the allowance.`);
  }
}
if (failed) {
  console.error('lint:copy failed');
  process.exit(1);
}
console.log('lint:copy OK');
