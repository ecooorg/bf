/**
 * A1 Conversational agent — turn planning and prompt entry (P119.0.3).
 * Owns: conversation-mode focus paragraph and the Conversational prompt entry point.
 * Must not import expertAgent.ts or agentRouting.ts (boundary locked by tests/p119-agent-isolation.test.mjs).
 * The underlying prompt pack text still lives in promptPacks.ts (shared infrastructure until a later slice).
 */
import { modeParagraph, type ConversationMode } from './conversationMode.ts';
import { buildSimpleConversationPrompt } from './promptPacks.ts';

export interface ConversationalTurnPlan {
  agent: 'conversational';
  /** Legacy wire/telemetry key; kept for compatibility with logs and the request contract. */
  productMode: 'Simple';
  conversationMode: ConversationMode;
  modeBlock: string;
}

export function planConversationalTurn(detectedMode: ConversationMode): ConversationalTurnPlan {
  return {
    agent: 'conversational',
    productMode: 'Simple',
    conversationMode: detectedMode,
    modeBlock: modeParagraph(detectedMode),
  };
}

export function buildConversationalPrompt(
  input: string,
  attachmentsBlock: string,
  plan: ConversationalTurnPlan,
  today: string,
): string {
  return buildSimpleConversationPrompt(input, attachmentsBlock, plan.modeBlock, today, plan.conversationMode, 'Simple');
}
