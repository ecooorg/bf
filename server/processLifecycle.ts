/** Process lifecycle record: why the previous process stopped, uptime and memory (P124.24, finding item 8). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export type LifecycleState = 'running' | 'shutdown' | 'crash';
export type LifecycleRecord = {
  pid: number; bootId: string; bootedAt: string; lastBeatAt: string; state: LifecycleState; reason?: string;
  uptimeSec: number; rssMb: number; heapUsedMb: number; memoryLimitMb: number | null; commit: string; appVersion: string;
};
export type PreviousShutdown = {
  found: boolean; reason: string; gapSec?: number; lastUptimeSec?: number; lastRssMb?: number; previousCommit?: string; previousVersion?: string; memoryLimitMb?: number | null;
};

export const lifecycleFile = (): string => path.join(os.tmpdir(), 'biforge-lifecycle.json');
const mb = (n: number) => Math.round(n / 1048576);

/** Container memory limit (cgroup v2/v1), or null when unlimited or unreadable. */
export function memoryLimitMb(readFile: (p: string) => string = (p) => fs.readFileSync(p, 'utf8')): number | null {
  for (const p of ['/sys/fs/cgroup/memory.max', '/sys/fs/cgroup/memory/memory.limit_in_bytes']) {
    try {
      const raw = readFile(p).trim();
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0 && n < 2 ** 50) return mb(n);
    } catch { /* try next */ }
  }
  return null;
}

export function processSnapshot(): { pid: number; uptimeSec: number; rssMb: number; heapUsedMb: number; memoryLimitMb: number | null } {
  const m = process.memoryUsage();
  return { pid: process.pid, uptimeSec: Math.round(process.uptime()), rssMb: mb(m.rss), heapUsedMb: mb(m.heapUsed), memoryLimitMb: memoryLimitMb() };
}

export function readLifecycle(file = lifecycleFile()): LifecycleRecord | null {
  try {
    const v = JSON.parse(fs.readFileSync(file, 'utf8'));
    return v && typeof v === 'object' && typeof v.bootedAt === 'string' ? (v as LifecycleRecord) : null;
  } catch { return null; }
}

/** Pure classification of the previous process record. */
export function classifyPreviousShutdown(prev: LifecycleRecord | null, nowMs: number): PreviousShutdown {
  if (!prev) return { found: false, reason: 'no_record (first start, or the filesystem was reset by a new container or deploy)' };
  const gapSec = Math.max(0, Math.round((nowMs - Date.parse(prev.lastBeatAt)) / 1000));
  const base = { found: true, gapSec, lastUptimeSec: prev.uptimeSec, lastRssMb: prev.rssMb, previousCommit: prev.commit, previousVersion: prev.appVersion, memoryLimitMb: prev.memoryLimitMb };
  if (prev.state === 'shutdown') return { ...base, reason: `graceful:${prev.reason || 'unknown'}` };
  if (prev.state === 'crash') return { ...base, reason: `crash:${prev.reason || 'unknown'}` };
  const nearLimit = prev.memoryLimitMb && prev.rssMb >= prev.memoryLimitMb * 0.85;
  return { ...base, reason: nearLimit ? 'oom_suspected (no shutdown record; last RSS near the container limit)' : 'killed_without_record (SIGKILL, OOM, host restart or platform stop; no shutdown record)' };
}

function writeRecord(file: string, rec: LifecycleRecord): void {
  try { const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(rec)); fs.renameSync(tmp, file); } catch { /* diagnostics must never break the server */ }
}

export type LifecycleHandle = { boot: { bootId: string; bootedAt: string; previous: PreviousShutdown } & ReturnType<typeof processSnapshot>; markShutdown: (reason: string, state?: LifecycleState) => void; stop: () => void };

export function startLifecycle(opts: { commit: string; appVersion: string; file?: string; heartbeatMs?: number }): LifecycleHandle {
  const file = opts.file || lifecycleFile();
  const previous = classifyPreviousShutdown(readLifecycle(file), Date.now());
  const bootId = crypto.randomUUID();
  const bootedAt = new Date().toISOString();
  let finalState: LifecycleState | null = null;
  const build = (state: LifecycleState, reason?: string): LifecycleRecord => ({ ...processSnapshot(), bootId, bootedAt, lastBeatAt: new Date().toISOString(), state, ...(reason ? { reason } : {}), commit: opts.commit, appVersion: opts.appVersion });
  writeRecord(file, build('running'));
  const timer = setInterval(() => { if (!finalState) writeRecord(file, build('running')); }, opts.heartbeatMs ?? 30_000);
  timer.unref?.();
  const markShutdown = (reason: string, state: LifecycleState = 'shutdown') => { if (finalState === 'crash') return; finalState = state; writeRecord(file, build(state, reason)); };
  // Observers only: these listeners do not change Node's default crash or exit behaviour.
  process.on('uncaughtExceptionMonitor', (_err, origin) => markShutdown(String(origin || 'uncaughtException'), 'crash'));
  process.on('exit', (code) => { if (!finalState) markShutdown(`exit_code_${code}`); });
  return { boot: { bootId, bootedAt, previous, ...processSnapshot() }, markShutdown, stop: () => clearInterval(timer) };
}
