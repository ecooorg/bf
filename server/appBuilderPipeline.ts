/**
 * IR → resolve stack → materialize scaffold → optional narrow model slice → ZIP bytes.
 * Generated code is never executed here.
 */
import JSZip from 'jszip';
import { parseAppIr, resolveStack, type AppIr } from './appBuilderIr.ts';
import { materializeScaffold } from './appBuilderScaffolds.ts';
import { validateZipArchive } from './artifactFormat.ts';

export type PipelineStep = {
  id: string;
  status: 'ok' | 'skipped' | 'error';
  ms: number;
  detail?: string;
};

export type PipelineResult = {
  ir: AppIr;
  stack: string;
  files: Record<string, string>;
  steps: PipelineStep[];
  zipBuffer: Buffer;
  /** Machine log for debugging the middle layer */
  log: string[];
  /** Whether the user's goal went beyond the generic scaffold. 'applied' only if the model returned files that were merged. */
  slice: { status: 'applied' | 'skipped' | 'failed'; reason: string };
};

export type SliceGenerator = (input: {
  ir: AppIr;
  stack: string;
  files: Record<string, string>;
}) => Promise<{ files?: Record<string, string>; notes?: string }>;

function step<T>(id: string, fn: () => T | Promise<T>, steps: PipelineStep[], log: string[]): Promise<T> {
  const t0 = Date.now();
  return Promise.resolve()
    .then(fn)
    .then((value) => {
      const ms = Date.now() - t0;
      steps.push({ id, status: 'ok', ms });
      log.push(`${id}:ok:${ms}ms`);
      return value;
    })
    .catch((e) => {
      const ms = Date.now() - t0;
      const detail = String((e as Error)?.message || e).slice(0, 300);
      steps.push({ id, status: 'error', ms, detail });
      log.push(`${id}:error:${detail}`);
      throw e;
    });
}

/** Merge custom files; refuse path escape. */
function mergeFiles(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  const out = { ...base };
  for (const [rawPath, content] of Object.entries(extra)) {
    const p = rawPath.replace(/^\/+/, '').replace(/\\/g, '/');
    if (!p || p.includes('..') || p.startsWith('.git/')) continue;
    if (typeof content !== 'string') continue;
    if (Buffer.byteLength(content, 'utf8') > 1_000_000) continue;
    out[p] = content;
  }
  return out;
}

export async function runAppBuilderPipeline(input: {
  ir: unknown;
  /** Optional narrow generation (e.g. model). Scaffold works without it. */
  sliceGenerate?: SliceGenerator;
  /** When false, skip model slice even if provided. */
  allowSlice?: boolean;
}): Promise<PipelineResult> {
  const steps: PipelineStep[] = [];
  const log: string[] = [];
  let slice: PipelineResult['slice'] = { status: 'skipped', reason: 'model slice is not enabled on this server' };

  const ir = await step('parse_ir', () => parseAppIr(input.ir), steps, log);
  const stack = await step('resolve_stack', () => resolveStack(ir), steps, log);
  let files = await step('materialize_scaffold', () => materializeScaffold(stack, ir), steps, log);

  const allowSlice = input.allowSlice !== false && typeof input.sliceGenerate === 'function';
  if (allowSlice && (ir.goal.trim().length > 0 || ir.features.length > 0 || ir.constraints.trim().length > 0)) {
    const t0 = Date.now();
    try {
      const sliced = await input.sliceGenerate!({ ir, stack, files });
      if (sliced?.files && Object.keys(sliced.files).length) {
        const before = JSON.stringify(files);
        files = mergeFiles(files, sliced.files);
        slice = JSON.stringify(files) !== before ? { status: 'applied', reason: sliced.notes?.slice(0, 200) || 'model files merged' } : { status: 'skipped', reason: 'model returned only rejected files (bad paths or too large)' };
      } else slice = { status: 'skipped', reason: sliced?.notes?.slice(0, 200) || 'model returned no files' };
      steps.push({
        id: 'slice_generate',
        status: 'ok',
        ms: Date.now() - t0,
        detail: sliced?.notes?.slice(0, 200),
      });
      log.push(`slice_generate:ok:${Date.now() - t0}ms`);
    } catch (e) {
      // Scaffold alone is still a valid product; slice failures are non-fatal.
      steps.push({
        id: 'slice_generate',
        status: 'error',
        ms: Date.now() - t0,
        detail: String((e as Error)?.message || e).slice(0, 300),
      });
      slice = { status: 'failed', reason: String((e as Error)?.message || e).slice(0, 200) };
      log.push(`slice_generate:soft_fail:${String((e as Error)?.message || e).slice(0, 200)}`);
    }
  } else {
    if (allowSlice) slice = { status: 'skipped', reason: 'empty goal, features and constraints' };
    steps.push({ id: 'slice_generate', status: 'skipped', ms: 0, detail: slice.reason });
    log.push('slice_generate:skipped');
  }

  files = await step(
    'ensure_deploy_docs',
    () => {
      if (!files['DEPLOY-MANUAL.md']) {
        files['DEPLOY-MANUAL.md'] = files['README.md'] || '# Deploy manually via GitHub + Render/Railway\n';
      }
      files['BIFORGE-IR.json'] = JSON.stringify({ ir, stack, builtAt: new Date().toISOString() }, null, 2) + '\n';
      return files;
    },
    steps,
    log,
  );

  const zipBuffer = await step(
    'assemble_zip',
    async () => {
      const sourceEntries = Object.entries(files);
      if (!sourceEntries.length) throw new Error('No files were generated; refusing to create an empty project ZIP');
      const hasSource = sourceEntries.some(([path, content]) =>
        /\.(html?|[cm]?js|[cm]?ts|tsx|jsx|css|py|vue|svelte)$/i.test(path) && typeof content === 'string' && content.trim().length > 0,
      );
      if (!hasSource) throw new Error('Generated project contains no non-empty source-code file');

      const zip = new JSZip();
      for (const [path, content] of sourceEntries) zip.file(path, content);
      zip.file(
        'BIFORGE-README.txt',
        [
          'Built by BiForge App Builder pipeline (IR → scaffold → optional slice → ZIP).',
          `Stack: ${stack}`,
          `Name: ${ir.name}`,
          'This code was not executed on the BiForge server.',
          'Open README.md for local run and manual GitHub/Render steps.',
          '',
        ].join('\n'),
      );
      const buffer = Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } }));
      const checked = validateZipArchive(buffer, [...Object.keys(files), 'BIFORGE-README.txt']);
      const reopened = await JSZip.loadAsync(buffer);
      for (const [path, expected] of sourceEntries) {
        const entry = reopened.file(path);
        if (!entry) throw new Error(`ZIP verification failed: missing ${path}`);
        const actual = await entry.async('string');
        if (actual !== expected) throw new Error(`ZIP verification failed: content mismatch for ${path}`);
      }
      log.push(`zip_verify:ok:${checked.entries.length}_entries:${checked.size}_bytes`);
      return buffer;
    },
    steps,
    log,
  );

  return { ir, stack, files, steps, zipBuffer, log, slice };
}
