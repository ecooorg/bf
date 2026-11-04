/**
 * P126.3 — request-level telemetry for Simple Direct Conversation.
 *
 * A completed Express response proves that the server finished writing the
 * response; it does not prove that a browser painted it. Client render
 * telemetry remains explicitly unobserved until a client acknowledgement exists.
 */
export type SimpleConversationTelemetryInput = {
  requestId: string;
  model?: string;
  keySlot?: number;
  keyAttempts?: number;
  durationMs?: number;
  hasAttachments: boolean;
  searchUsed: boolean;
  searchResult: string;
};

export function simpleConversationMetricDetails(input: SimpleConversationTelemetryInput) {
  return {
    agent: 'conversational',
    provider: 'gemini',
    model: input.model || 'unknown',
    keySlot: Number.isFinite(input.keySlot) ? input.keySlot : null,
    keyAttempts: Math.max(0, Number(input.keyAttempts) || 0),
    generationDurationMs: Math.max(0, Number(input.durationMs) || 0),
    hasAttachments: Boolean(input.hasAttachments),
    searchUsed: Boolean(input.searchUsed),
    searchResult: String(input.searchResult || 'not_run'),
  };
}

/**
 * Register delivery observation before sending the response. `finish` means
 * Node completed the HTTP response write; `close` without `finish` is an
 * interrupted response. Neither event proves client-side rendering.
 */
export function observeSimpleResponseDelivery(
  response: {
    statusCode: number;
    once: (event: 'finish' | 'close', listener: () => void) => unknown;
    writableFinished?: boolean;
  },
  record: (event: 'conversation_http_response_success' | 'conversation_http_response_failure' | 'conversation_delivery_interrupted', details: Record<string, unknown>) => void,
  baseDetails: Record<string, unknown>,
): void {
  let settled = false;
  response.once('finish', () => {
    if (settled) return;
    settled = true;
    const success = response.statusCode >= 200 && response.statusCode < 400;
    if (success) record('conversation_http_response_success', { ...baseDetails, delivery: 'http_response_finished', userVisibleSuccess: 'not_observed', clientRendered: 'not_observed' });
    else record('conversation_http_response_failure', { ...baseDetails, delivery: 'http_response_finished_with_error_status', statusCode: response.statusCode, userVisibleSuccess: 'not_observed', clientRendered: 'not_observed' });
  });
  response.once('close', () => {
    if (settled || response.writableFinished) return;
    settled = true;
    record('conversation_delivery_interrupted', { ...baseDetails, delivery: 'connection_closed_before_finish', statusCode: response.statusCode, userVisibleSuccess: 'not_observed', clientRendered: 'not_observed' });
  });
}
