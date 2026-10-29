/**
 * Wire paths of the Conversational and Expert dialogue agents (P119.0.4). Mirrors CONVERSATION_ROUTES in
 * server/agentRouting.ts; the server still accepts the legacy shared path for older clients.
 */
export const CONVERSATIONAL_CHAT_ROUTE = '/api/agent/conversational';
export const EXPERT_CHAT_ROUTE = '/api/agent/expert';
const LEGACY_CHAT_ROUTE = '/api/conversation';

export function chatRoute(expert: boolean | undefined): string {
  return expert ? EXPERT_CHAT_ROUTE : CONVERSATIONAL_CHAT_ROUTE;
}

export function isChatRoute(path: string): boolean {
  return path === CONVERSATIONAL_CHAT_ROUTE || path === EXPERT_CHAT_ROUTE || path === LEGACY_CHAT_ROUTE;
}
