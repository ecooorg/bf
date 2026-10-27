/** Low-cost, hourly probes for optional Gemini candidates. A model is eligible only after a real API call succeeds. */
export const GEMINI_PROBE_CANDIDATES = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemma-4'] as const;
export type ProbeState = { status: 'unknown' | 'available' | 'unavailable'; checkedAt: number | null; reason?: string };
const states = new Map<string, ProbeState>(GEMINI_PROBE_CANDIDATES.map((id) => [id, { status: 'unknown', checkedAt: null }]));
const HOUR = 60 * 60 * 1000;
let lastRun = 0;
let inFlight: Promise<Record<string, ProbeState>> | null = null;
export function getProbeStates(): Record<string, ProbeState> { return Object.fromEntries([...states].map(([k, v]) => [k, { ...v }])); }
export function eligibleGeminiCandidates(): string[] { return GEMINI_PROBE_CANDIDATES.filter((id) => states.get(id)?.status === 'available'); }
export async function probeGeminiCandidates(opts: { apiKey?: string; baseUrl?: string; fetchImpl?: typeof fetch; now?: number } = {}): Promise<Record<string, ProbeState>> {
  const now = opts.now ?? Date.now();
  if (inFlight) return inFlight;
  if (now - lastRun < HOUR) return getProbeStates();
  if (!opts.apiKey) return getProbeStates();
  lastRun = now;
  const fetcher = opts.fetchImpl ?? fetch;
  inFlight = (async () => {
    await Promise.all(GEMINI_PROBE_CANDIDATES.map(async (model) => {
      const base = (opts.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/v1beta\/?$/, '').replace(/\/$/, '');
      const endpoint = `${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const r = await fetcher(`${endpoint}?key=${encodeURIComponent(opts.apiKey!)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with OK.' }] }], generationConfig: { maxOutputTokens: 1 } }), signal: ctrl.signal });
        const body: any = r.ok ? await r.json().catch(() => null) : null;
        const ok = Boolean(r.ok && (body?.candidates?.length || body?.responseId || body?.promptFeedback));
        states.set(model, { status: ok ? 'available' : 'unavailable', checkedAt: now, ...(!ok ? { reason: `HTTP_${r.status}` } : {}) });
      } catch (e) { states.set(model, { status: 'unavailable', checkedAt: now, reason: e instanceof Error && e.name === 'AbortError' ? 'timeout' : 'network_error' }); }
      finally { clearTimeout(timer); }
    }));
    return getProbeStates();
  })().finally(() => { inFlight = null; });
  return inFlight;
}
/** Test seam; not used by application runtime. */
export function resetProbeStateForTests(): void { lastRun = 0; inFlight = null; for (const id of GEMINI_PROBE_CANDIDATES) states.set(id, { status: 'unknown', checkedAt: null }); }
