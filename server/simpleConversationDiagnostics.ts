/**
 * P126.3 / P126.19 — request-level telemetry for Simple Direct Conversation.
 *
 * A completed Express response proves that the server finished writing the
 * response; it does not prove that a browser painted it. Client render
 * acknowledgement (POST /api/diagnostics/client-render) upgrades clientRendered.
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
  /** Product shell: Simple | Expert | Project */
  productMode?: string;
  /** First chars of the latest user turn (for All Logs request index). */
  userPreview?: string;
  /** Length of the model reply text. */
  replyChars?: number;
  searchProvider?: string;
  searchSourceCount?: number;
  searchTopic?: string;
  searchPlace?: string;
  searchHosts?: string[];
};

export function simpleConversationMetricDetails(input: SimpleConversationTelemetryInput) {
  const details: Record<string, unknown> = {
    agent: 'conversational',
    productMode: input.productMode || 'Simple',
    provider: 'gemini',
    model: input.model || 'unknown',
    keySlot: Number.isFinite(input.keySlot) ? input.keySlot : null,
    keyAttempts: Math.max(0, Number(input.keyAttempts) || 0),
    generationDurationMs: Math.max(0, Number(input.durationMs) || 0),
    hasAttachments: Boolean(input.hasAttachments),
    searchUsed: Boolean(input.searchUsed),
    searchResult: String(input.searchResult || 'not_run'),
  };
  if (input.userPreview) details.userPreview = String(input.userPreview).slice(0, 240);
  if (Number.isFinite(input.replyChars)) details.replyChars = Math.max(0, Number(input.replyChars));
  if (input.searchProvider) details.searchProvider = input.searchProvider;
  if (input.searchSourceCount != null) details.searchSourceCount = input.searchSourceCount;
  if (input.searchTopic) details.searchTopic = input.searchTopic;
  if (input.searchPlace) details.searchPlace = input.searchPlace;
  if (input.searchHosts?.length) details.searchHosts = input.searchHosts.slice(0, 12);
  return details;
}

/**
 * Register delivery observation before sending the response. `finish` means
 * Node completed the HTTP response write; `close` without `finish` is an
 * interrupted response. Neither event proves client-side rendering until
 * a client-render acknowledgement arrives for the same requestId.
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
    if (success) {
      record('conversation_http_response_success', {
        ...baseDetails,
        delivery: 'http_response_finished',
        userVisibleSuccess: 'not_observed',
        clientRendered: 'awaiting_client_ack',
      });
    } else {
      record('conversation_http_response_failure', {
        ...baseDetails,
        delivery: 'http_response_finished_with_error_status',
        statusCode: response.statusCode,
        userVisibleSuccess: 'not_observed',
        clientRendered: 'not_applicable',
      });
    }
  });
  response.once('close', () => {
    if (settled || response.writableFinished) return;
    settled = true;
    record('conversation_delivery_interrupted', {
      ...baseDetails,
      delivery: 'connection_closed_before_finish',
      statusCode: response.statusCode,
      userVisibleSuccess: 'not_observed',
      clientRendered: 'not_applicable',
    });
  });
}
