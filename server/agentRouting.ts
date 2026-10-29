/**
 * Single place that decides which agent serves POST /api/conversation (P119.0.3).
 * Contract (REQ-AGENT-001): Expert if and only if body.productMode === 'Expert'; anything else is Conversational.
 * P119.0.4: each agent also has its own route. The agent-named routes PIN the agent (the route wins over any body.productMode);
 * the legacy shared route keeps the body-field selection so old clients and open tabs keep working.
 * Architect is never served here — it lives behind /project and /api/projects/*.
 */
import type { ConversationMode } from './conversationMode.ts';
import { buildConversationalPrompt, planConversationalTurn, type ConversationalTurnPlan } from './conversationalAgent.ts';
import { buildExpertPrompt, planExpertTurn, type ExpertTurnPlan } from './expertAgent.ts';

export type ConversationAgentId = 'conversational' | 'expert';

/** Wire paths of the dialogue agents. `legacy` is the compatibility path (agent chosen by body.productMode). */
export const CONVERSATION_ROUTES = {
  legacy: '/api/conversation',
  conversational: '/api/agent/conversational',
  expert: '/api/agent/expert',
} as const;

/** Express middleware: the route, not the body, decides the agent. Rewrites only the selector field; the rest of the body is untouched. */
export function pinConversationAgent(agent: ConversationAgentId) {
  return (req: { body?: unknown }, _res: unknown, next: () => void): void => {
    const base = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {};
    req.body = { ...base, productMode: agent === 'expert' ? 'Expert' : 'Simple' };
    next();
  };
}
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
