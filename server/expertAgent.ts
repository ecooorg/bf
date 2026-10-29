/**
 * A2 Expert agent — dialogue turn planning and prompt entry (P119.0.3).
 * Owns: Expert never receives the light "information" contract; Expert stage/method-state paragraph.
 * Must not import conversationalAgent.ts or agentRouting.ts (boundary locked by tests/p119-agent-isolation.test.mjs).
 * The underlying prompt pack text still lives in promptPacks.ts (shared infrastructure until a later slice).
 */
import { modeParagraph, type ConversationMode } from './conversationMode.ts';
import { buildSimpleConversationPrompt, expertDialogueParagraph } from './promptPacks.ts';

export interface ExpertTurnPlan {
  agent: 'expert';
  /** Wire/telemetry key; also the only value of the request field that selects this agent. */
  productMode: 'Expert';
  conversationMode: ConversationMode;
  modeBlock: string;
}

export interface ExpertDialogueInput {
  expertStage?: unknown;
  expertContext?: unknown;
}

export function planExpertTurn(detectedMode: ConversationMode, input: ExpertDialogueInput = {}): ExpertTurnPlan {
  // Expert never gets the light information contract: information-detected turns are promoted to decision.
  const conversationMode: ConversationMode = detectedMode === 'information' ? 'decision' : detectedMode;
  const stage = String(input.expertStage || '');
  const context = typeof input.expertContext === 'string' ? input.expertContext : '';
  return {
    agent: 'expert',
    productMode: 'Expert',
    conversationMode,
    modeBlock: `${modeParagraph(conversationMode)}\n\n${expertDialogueParagraph(stage, context)}`,
  };
}

export function buildExpertPrompt(
  input: string,
  attachmentsBlock: string,
  plan: ExpertTurnPlan,
  today: string,
): string {
  return buildSimpleConversationPrompt(input, attachmentsBlock, plan.modeBlock, today, plan.conversationMode, 'Expert');
}
