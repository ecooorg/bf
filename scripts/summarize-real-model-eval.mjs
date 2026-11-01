/**
 * Summarize Layer B artifacts for the Navigator (paste-friendly).
 * Usage:
 *   node scripts/summarize-real-model-eval.mjs [dir]
 * Default dir: artifacts/real-model-eval
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] || 'artifacts/real-model-eval');
if (!existsSync(dir)) {
  console.error(`No directory: ${dir}`);
  process.exit(2);
}

const files = readdirSync(dir).filter((f) => /^scenario-[A-E]\.json$/.test(f)).sort();
if (!files.length) {
  console.error(`No scenario-*.json in ${dir}`);
  process.exit(2);
}

const rows = [];
for (const f of files) {
  const d = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
  const score = d.rubric?.score;
  rows.push({
    id: d.scenario,
    name: d.name,
    model: d.model,
    pass: d.rubric?.pass,
    score: typeof score === 'number' ? score.toFixed(2) : '?',
    gaps: (d.rubric?.gaps || []).join('; ') || 'none',
    latencyMs: d.latencyMs,
    error: d.error || '',
    excerpt: (d.outputExcerpt || '').slice(0, 280).replace(/\s+/g, ' '),
  });
}

const allPass = rows.every((r) => r.pass && !r.error);
console.log('# Layer B real-model summary');
console.log(`dir=${dir}`);
console.log(`verdict=${allPass ? 'PASS_HEURISTIC' : 'NEEDS_REVIEW'} (heuristic only — human read still required)`);
console.log('');
console.log('| id | score | pass | model | gaps | latency |');
console.log('|----|-------|------|-------|------|---------|');
for (const r of rows) {
  console.log(`| ${r.id} | ${r.score} | ${r.pass} | ${r.model} | ${r.gaps} | ${r.latencyMs}ms |`);
}
console.log('');
for (const r of rows) {
  console.log(`## ${r.id} — ${r.name}`);
  if (r.error) console.log(`ERROR: ${r.error}`);
  console.log(r.excerpt + (r.excerpt.length >= 280 ? '…' : ''));
  console.log('');
}
console.log('Human checklist: facts vs assumptions labeled? no invented numbers? no forced choice? scenario B preserves unaffected work?');
