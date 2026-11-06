/**
 * P127.3a — Pure conversation HTTP payload helpers (contract surface for tests + harness).
 * No I/O. Product handlers build { success, data, meta } via ok(); clients must read data.reply.
 */

export type AgentDataPayload = {
  reply: string;
  sources: string[];
  success?: boolean;
  error?: string;
  code?: string;
};

/** Extract reply/sources from product envelope or flat body. Pure. */
export function extractAgentDataPayload(body: unknown): AgentDataPayload {
  if (!body || typeof body !== 'object') {
    return { reply: '', sources: [] };
  }
  const root = body as Record<string, unknown>;
  const nested = root.data;
  const payload =
    nested && typeof nested === 'object' && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : root;
  const reply = String(
    payload.reply ?? payload.message ?? payload.text ?? payload.answer ?? root.reply ?? '',
  );
  const rawSources = payload.sources;
  const sources = Array.isArray(rawSources)
    ? rawSources
        .map((s) => {
          if (typeof s === 'string') return s;
          if (s && typeof s === 'object') {
            const o = s as Record<string, unknown>;
            return String(o.url ?? o.uri ?? o.link ?? '');
          }
          return '';
        })
        .filter(Boolean)
    : [];
  return {
    reply,
    sources,
    success: typeof root.success === 'boolean' ? root.success : undefined,
    error: root.error != null ? String(root.error) : undefined,
    code: root.code != null ? String(root.code) : undefined,
  };
}
