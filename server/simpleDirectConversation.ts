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
  },
  generate: (prompt: string, byokKey?: string, preferredModel?: string, attachmentParts?: unknown[], useSearch?: boolean) =>
    Promise<{ text: string; model: string; durationMs: number; keySlot: number; keyAttempts: number }>,
): Promise<{ reply: string; model: string; durationMs: number; keySlot: number; keyAttempts: number }> {
  const prompt = buildSimpleDirectPrompt(input);
  const generated = await generate(prompt, input.byokKey, input.preferredModel, input.attachmentParts as unknown[], false);
  const reply = normalizeSimpleDirectReply(generated.text);
  if (!reply) throw Object.assign(new Error('Gemini returned an empty response.'), { code: 'EMPTY_MODEL_RESPONSE' });
  return { reply, model: generated.model, durationMs: generated.durationMs, keySlot: generated.keySlot, keyAttempts: generated.keyAttempts };
}
