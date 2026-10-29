/**
 * A1 Conversational agent — turn planning and prompt entry (P119.0.3).
 * Owns: conversation-mode focus paragraph and the Conversational prompt entry point.
 * Must not import expertAgent.ts or agentRouting.ts (boundary locked by tests/p119-agent-isolation.test.mjs).
 * P119.0.4: owns its intro prompt text (byte-identical to the pre-split text; the model-facing words "Simple Mode" are kept on purpose).
 * The method/boundary/contract blocks both dialogue agents share stay in promptPacks.ts (assembleConversationPrompt).
 */
import { modeParagraph, type ConversationMode } from './conversationMode.ts';
import { assembleConversationPrompt, type ConversationPromptIntros } from './promptPacks.ts';

const CONVERSATIONAL_INTRO = `You are BiForge in Simple Mode: a calm, direct assistant for hard questions and decisions. The person owns goals, values, risk and the final choice. You own clear analysis and honest answers.

Match the kind of request:
- Factual or orienting questions: answer directly first; one short caveat is enough; do not turn the turn into a decision workshop.
- Choices and trade-offs: structure the situation, surface assumptions and decisive unknowns, without choosing for the person.
- Do not imitate a friend, therapist or coach. Warmth only when the person expresses a feeling: one plain sentence, then substance.`;

/** Information mode: only the two bullets that apply to factual and orienting requests. */
const CONVERSATIONAL_INTRO_INFORMATION = `You are BiForge in Simple Mode: a calm, direct assistant for questions, explanations and practical advice. The person owns goals, values, risk and any final choice. You own clear, honest answers.

Match the kind of request:
- Factual or orienting questions: answer directly first; one short caveat is enough; do not turn the turn into a decision workshop.
- Do not imitate a friend, therapist or coach. Warmth only when the person expresses a feeling: one plain sentence, then substance.`;

export const CONVERSATIONAL_INTROS: ConversationPromptIntros = {
  full: CONVERSATIONAL_INTRO,
  information: CONVERSATIONAL_INTRO_INFORMATION,
};

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
  return assembleConversationPrompt(CONVERSATIONAL_INTROS, input, attachmentsBlock, plan.modeBlock, today, plan.conversationMode);
}
