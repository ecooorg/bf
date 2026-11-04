/**
 * P126.1 — Simple Direct Conversation request shaping.
 * This module deliberately contains no intent, search-planning, quality, or epistemic pipeline.
 */
export const SIMPLE_DIRECT_SYSTEM = [
  'You are BiForge, a helpful conversational assistant.',
  'Respect the user’s goals, be honest about uncertainty and capabilities, and respond in the user’s language.',
  'Use the supplied conversation history and attachments when relevant.',
  'Continue the conversation naturally.',
].join(' ');

export type SimpleHistoryMessage = { role: 'user' | 'assistant'; content: string };

export function buildSimpleDirectPrompt(input: {
  latestUserMessage: string;
  history: SimpleHistoryMessage[];
  attachmentText?: string;
}): string {
  const latestIndex = input.history.map((message) => message.role).lastIndexOf('user');
  const latestHistoryMessage = latestIndex >= 0 ? input.history[latestIndex] : undefined;
  const priorHistory = latestHistoryMessage?.content === input.latestUserMessage
    ? input.history.slice(0, latestIndex)
    : input.history;
  const history = priorHistory.slice(-12).map((message) => ({
    role: message.role,
    content: message.content.slice(0, 8000),
  }));
  return [
    history.length ? `Conversation history:\n${history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')}` : '',
    `Latest user message:\n${input.latestUserMessage}`,
    input.attachmentText ? `Attachments:\n${input.attachmentText}` : '',
  ].filter(Boolean).join('\n\n');
}

export function normalizeSimpleDirectReply(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function handleSimpleDirectConversation(
  input: {
    latestUserMessage: string;
    history: SimpleHistoryMessage[];
    attachmentText?: string;
    attachmentParts?: unknown[];
    byokKey?: string;
    preferredModel?: string;
    promptOverride?: string;
  },
  generate: (prompt: string, byokKey?: string, preferredModel?: string, attachmentParts?: unknown[], useSearch?: boolean) =>
    Promise<{ text: string; model: string; durationMs: number; keySlot: number; keyAttempts: number }>,
): Promise<{ reply: string; model: string; durationMs: number; keySlot: number; keyAttempts: number }> {
  const prompt = input.promptOverride ?? buildSimpleDirectPrompt(input);
  const generated = await generate(prompt, input.byokKey, input.preferredModel, input.attachmentParts as unknown[], false);
  const reply = normalizeSimpleDirectReply(generated.text);
  if (!reply) throw Object.assign(new Error('Gemini returned an empty response.'), { code: 'EMPTY_MODEL_RESPONSE' });
  return { reply, model: generated.model, durationMs: generated.durationMs, keySlot: generated.keySlot, keyAttempts: generated.keyAttempts };
}


/** Detect an explicit request for a web lookup without invoking intent classification or a model planner. */
export function isExplicitSearchRequest(text: string): boolean {
  return /(?:найди(?:те)?(?:\s+(?:в\s+(?:сети|интернете)|онлайн))?|поищи(?:те)?(?:\s+(?:в\s+(?:сети|интернете)|онлайн))?|поиск(?:ай|ать)?(?:\s+в\s+(?:сети|интернете))?|\bв\s+(?:сети|интернете)\b|find\s+(?:(?:it|them|this|that|data|info(?:rmation)?)\s+)?(?:online|on\s+the\s+web|on\s+the\s+internet)|search\s+(?:the\s+)?(?:web|internet|online)|look\s+up\s+(?:online|on\s+the\s+web)|\bgoogle\b)/iu.test(String(text || ''));
}

/** Optional search is fail-open: failure and timeout become status data, never a generation exception. */
export async function resolveOptionalSearch<T extends { status?: string; reason?: string }>(opts: {
  expected: boolean;
  timeoutMs: number;
  run: () => Promise<T>;
}): Promise<{ expected: boolean; timedOut: boolean; result: T | { status: 'failed'; reason: string } | null }> {
  if (!opts.expected) return { expected: false, timedOut: false, result: null };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<{ timedOut: true }>((resolve) => {
      timer = setTimeout(() => resolve({ timedOut: true }), Math.max(1, opts.timeoutMs));
    });
    const search = Promise.resolve().then(opts.run)
      .then((result) => ({ timedOut: false as const, result }))
      .catch(() => ({ timedOut: false as const, result: { status: 'failed' as const, reason: 'exception' } }));
    const settled = await Promise.race([search, timeout]);
    if (settled.timedOut) return { expected: true, timedOut: true, result: { status: 'failed', reason: 'timeout' } };
    return { expected: true, timedOut: false, result: settled.result };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
