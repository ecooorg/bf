/**
 * Single place that decides which agent serves POST /api/conversation (P119.0.3).
 * Contract (REQ-AGENT-001): Expert if and only if body.productMode === 'Expert'; anything else is Conversational.
 * Architect is never served here — it lives behind /project and /api/projects/*.
 */
import type { ConversationMode } from './conversationMode.ts';
import { buildConversationalPrompt, planConversationalTurn, type ConversationalTurnPlan } from './conversationalAgent.ts';
import { buildExpertPrompt, planExpertTurn, type ExpertTurnPlan } from './expertAgent.ts';

export type ConversationAgentId = 'conversational' | 'expert';
export type ConversationTurnPlan = ConversationalTurnPlan | ExpertTurnPlan;

export function resolveConversationAgent(body: unknown): ConversationAgentId {
  const pm = body && typeof body === 'object' ? (body as { productMode?: unknown }).productMode : undefined;
  return pm === 'Expert' ? 'expert' : 'conversational';
}

export function planConversationTurn(body: unknown, detectedMode: ConversationMode): ConversationTurnPlan {
  if (resolveConversationAgent(body) === 'expert') {
    const b = body as { expertStage?: unknown; expertContext?: unknown };
    return planExpertTurn(detectedMode, { expertStage: b.expertStage, expertContext: b.expertContext });
  }
  return planConversationalTurn(detectedMode);
}

export function buildConversationTurnPrompt(
  input: string,
  attachmentsBlock: string,
  plan: ConversationTurnPlan,
  today: string = new Date().toISOString().slice(0, 10),
): string {
  return plan.agent === 'expert'
    ? buildExpertPrompt(input, attachmentsBlock, plan, today)
    : buildConversationalPrompt(input, attachmentsBlock, plan, today);
}
