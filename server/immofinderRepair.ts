/**
 * Temporary stub — full body restored by ensure-repair from zlib payload (P131.8i).
 * Exports match consumers so typecheck/build pass while payload is repaired.
 */
export const REPAIR_RULES_VERSION = '131.8g.6';
export function encodeSeenReason(reason: string): string { return `${REPAIR_RULES_VERSION}::${reason}`; }
export function decodeSeenReason(stored: unknown): string | null {
  const v = String(stored || ''); const p = `${REPAIR_RULES_VERSION}::`;
  return v.startsWith(p) ? v.slice(p.length) : null;
}
export function normalizeUrl(u: unknown): string { return String(u || '').toLowerCase(); }
export function sameListingUrlTarget(a: string, b: string): boolean { return normalizeUrl(a) === normalizeUrl(b); }
export function phoneInText(_p: string, _t: string): boolean { return false; }
export function emailInText(_e: string, _t: string): boolean { return false; }
export function maskPhone(p: string | null | undefined): string | null { return p ? '***' : null; }
export function maskEmail(e: string | null | undefined): string | null { return e ? '***@***' : null; }
export function maskContactsInText(t: string): string { return t; }
export function amountInText(_a: number, _t: string): boolean { return true; }
export type PriceCandidate = { amount: number; unit: string; quote: string; index: number; side: boolean; rentLabelled: boolean };
export function priceCandidates(_t: string): PriceCandidate[] { return []; }
export type PriceVerdict = { status: 'ok' } | { status: 'missing' } | { status: 'repair'; price: { amount: number; unit: 'month' | 'week' | 'night' | 'season' }; why: string } | { status: 'suspect'; why: string };
export function priceVerdict(_row: any): PriceVerdict { return { status: 'ok' }; }
export type ContactVerdict = { phone: string; email: string };
export function contactVerdict(_row: any): ContactVerdict { return { phone: 'none', email: 'none' }; }
export type RepairOpName = 'hide' | 'unhide' | 'delete' | 'clear_contact' | 'set_price' | 'mark_collage';
export type RepairOp = { op: RepairOpName; id: string; reason: string; price?: { amount: number; unit: 'month' | 'week' | 'night' | 'season' }; fields?: ('phone' | 'email')[] };
export type RepairBatch = { batchId: string; generatedAt?: string; basedOnSnapshot?: string; ops: RepairOp[] };
export type RowPatch = Record<string, unknown>;
export type AuditContext = { municipalities: string[]; portalHosts?: string[] };
export function hardRejectReason(_row: any, _ctx: AuditContext): string | null { return null; }
export function auditRow(row: any, ctx: AuditContext): { id: string; flags: string[]; hardReason: string | null; ops: RepairOp[] } {
  return { id: String(row?.id || ''), flags: [], hardReason: hardRejectReason(row, ctx), ops: [] };
}
export function sanitizeNewRecord<T extends Record<string, any>>(rec: T, _ctx?: AuditContext): { rec: T; notes: string[]; hardReason: string | null } {
  return { rec, notes: [], hardReason: null };
}
export function ctxFromConfig(cfg: any): AuditContext {
  return { municipalities: cfg?.municipalities || [], portalHosts: cfg?.discovery?.portalHosts || [] };
}
export function parseRepairFile(_text: string): RepairBatch | null { return null; }
export function planAutoOps(_rows: any[], _ctx: AuditContext): RepairOp[] { return []; }
export function previewOps(_ops: RepairOp[], _rows: any[]): any[] { return []; }
export function repairQueue(): RepairOp[] { return []; }
export function snapshotJsonl(_rows: any[]): string { return ''; }
export function snapshotMeta(): Record<string, unknown> { return {}; }
export function evaluateOp(_op: RepairOp, _row: any): { ok: boolean; reason?: string } { return { ok: true }; }
export function validateOps(ops: RepairOp[]): { ok: boolean; errors: string[] } { return { ok: true, errors: [] }; }
