/**
 * IR → resolve stack → materialize scaffold → optional narrow model slice → ZIP bytes.
 * Generated code is never executed here.
 */
import JSZip from 'jszip';
import { parseAppIr, resolveStack, type AppIr } from './ir.ts';
import { materializeScaffold } from './scaffolds.ts';

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

  const ir = await step('parse_ir', () => parseAppIr(input.ir), steps, log);
  const stack = await step('resolve_stack', () => resolveStack(ir), steps, log);
  let files = await step('materialize_scaffold', () => materializeScaffold(stack, ir), steps, log);

  const allowSlice = input.allowSlice !== false && typeof input.sliceGenerate === 'function';
  if (allowSlice && (ir.features.length > 0 || ir.constraints.trim().length > 0)) {
    const t0 = Date.now();
    try {
      const sliced = await input.sliceGenerate!({ ir, stack, files });
      if (sliced?.files && Object.keys(sliced.files).length) {
        files = mergeFiles(files, sliced.files);
      }
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
      log.push(`slice_generate:soft_fail:${String((e as Error)?.message || e).slice(0, 200)}`);
    }
  } else {
    steps.push({ id: 'slice_generate', status: 'skipped', ms: 0, detail: 'no features/constraints or disabled' });
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
      const zip = new JSZip();
      for (const [path, content] of Object.entries(files)) {
        zip.file(path, content);
      }
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
      return Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } }));
    },
    steps,
    log,
  );

  return { ir, stack, files, steps, zipBuffer, log };
}
