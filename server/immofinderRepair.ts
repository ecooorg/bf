/**
 * P129.48 — Extend the repair protocol with evidence-backed price validation for saved and new cards.
 *
 * Pure functions only (no DB, no network). The DB layer is server/immofinderRepairStore.ts.
 *
 * Contract:
 *  - `snapshotLine(row)` is the JSONL line the Assistant reads (All Logs, export-snapshot, GitHub snapshot).
 *  - `auditRow(row)` is the single rule set that decides which saved cards are fit for screen, e-mail and Drive.
 *  - Repair ops are a closed whitelist (hide | unhide | delete | clear_contact | set_price | mark_collage).
 *    No op can write an arbitrary URL or free text; `set_price` is accepted only when the amount is literally
 *    present in the card's own stored page text.
 */
export const REPAIR_RULES_VERSION = '131.8g.6';
export function PLACEHOLDER_RESTORE_NEEDED() { return true; }
