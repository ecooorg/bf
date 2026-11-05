/**
 * Test helper (P119.0.4): build a dialogue prompt through the agent-owned entry points.
 * productMode is the legacy wire key: 'Expert' -> expertAgent, anything else -> conversationalAgent.
 */
import { buildConversationalPrompt } from '../server/conversationalAgent.ts';
import { buildExpertPrompt } from '../server/expertAgent.ts';

export function buildAgentPrompt(productMode, input, attachmentsBlock, modeBlock, today, mode = 'decision') {
  const base = { conversationMode: mode, modeBlock };
  return productMode === 'Expert'
    ? buildExpertPrompt(input, attachmentsBlock, { agent: 'expert', productMode: 'Expert', ...base }, today)
    : buildConversationalPrompt(input, attachmentsBlock, { agent: 'conversational', productMode: 'Simple', ...base }, today);
}
