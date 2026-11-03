/** P124.31 — bounded production latency policy for model generation. */
export interface LlmLatencyConfig {
  callTimeoutMs: number;
  totalDeadlineMs: number;
  maxModelCalls: number;
  configured: { callTimeoutMs: number | null; totalDeadlineMs: number | null; maxModelCalls: number | null };
  warnings: string[];
}

function positiveInt(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
}

/**
 * Upstream settings are deliberately clamped. A stale Render value must not restore
 * multi-minute model cascades; stricter operator values remain respected.
 */
export function readLlmLatencyConfig(env: Record<string, string | undefined> = process.env): LlmLatencyConfig {
  const configured = {
    callTimeoutMs: positiveInt(env.LLM_CALL_TIMEOUT_MS),
    totalDeadlineMs: positiveInt(env.LLM_TOTAL_DEADLINE_MS),
    maxModelCalls: positiveInt(env.MAX_MODEL_CALLS),
  };
  const callTimeoutMs = Math.min(12_000, Math.max(2_000, configured.callTimeoutMs ?? 12_000));
  const totalDeadlineMs = Math.min(30_000, Math.max(5_000, configured.totalDeadlineMs ?? 30_000));
  const maxModelCalls = Math.min(3, Math.max(1, configured.maxModelCalls ?? 3));
  const warnings: string[] = [];
  for (const [name, value] of [['LLM_CALL_TIMEOUT_MS', configured.callTimeoutMs], ['LLM_TOTAL_DEADLINE_MS', configured.totalDeadlineMs], ['MAX_MODEL_CALLS', configured.maxModelCalls]] as const) {
    if (env[name] !== undefined && env[name]!.trim() !== '' && value === null) warnings.push(`${name} is invalid; the application default is used.`);
  }
  if ((configured.callTimeoutMs ?? 0) > 12_000) warnings.push('LLM_CALL_TIMEOUT_MS exceeds the 12000 ms runtime hard cap.');
  if ((configured.totalDeadlineMs ?? 0) > 30_000) warnings.push('LLM_TOTAL_DEADLINE_MS exceeds the 30000 ms runtime hard cap.');
  if ((configured.maxModelCalls ?? 0) > 3) warnings.push('MAX_MODEL_CALLS exceeds the 3-call runtime hard cap.');
  return { callTimeoutMs, totalDeadlineMs, maxModelCalls, configured, warnings };
}
