/**
 * P129.48 — Extend the repair protocol with evidence-backed price validation for saved and new cards.
 *
 * Pure functions only (no DB, no network). The DB layer is server/immofinderRepairStore.ts.
 *
 * RESTORE PLACEHOLDER - will replace with full content in follow-up if this works
 */
export const REPAIR_RULES_VERSION = '130.10j.5';
export function encodeSeenReason(reason: string): string { return `${REPAIR_RULES_VERSION}::${String(reason || 'unknown')}`; }
export function decodeSeenReason(stored: unknown): string | null { const value = String(stored || ''); const prefix = `${REPAIR_RULES_VERSION}::`; return value.startsWith(prefix) ? value.slice(prefix.length) : null; }
