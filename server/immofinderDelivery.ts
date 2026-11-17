import crypto from 'node:crypto';
import { formatZurich } from './immofinderSettings.ts';

export async function sendTelegram(text: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN; const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return 'skipped: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set';
  try {
    const r = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: text.slice(0, 3900), disable_web_page_preview: true }) });
    return r.ok ? 'sent' : `error: HTTP ${r.status}`;
  } catch (e) { return `error: ${String((e as Error)?.message || e).slice(0, 80).replace(token, '***')}`; }
}

export function serviceAccountEmail(): string {
  try { return String(JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}').client_email || ''); } catch { return ''; }
}
export function channelStatus() {
  return { telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID), email: Boolean(process.env.RESEND_API_KEY), drive: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON), driveAccount: serviceAccountEmail() };
}

/** Email through the Resend HTTP API (RESEND_API_KEY). The free sender onboarding@resend.dev delivers only to the Resend account owner's address. */
export async function sendEmail(to: string, subject: string, text: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const key = process.env.RESEND_API_KEY; if (!key) return 'skipped: RESEND_API_KEY not set';
  try {
    const r = await fetchImpl('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.IMMOFINDER_EMAIL_FROM || 'ImmoFinder <onboarding@resend.dev>', to: [to], subject, text }) });
    return r.ok ? 'sent' : `error: HTTP ${r.status} ${(await r.text()).replace(/\s+/g, ' ').slice(0, 120).split(key).join('***')}`;
  } catch (e) { return `error: ${String((e as Error)?.message || e).slice(0, 80).split(key).join('***')}`; }
}

/** First line: place · price · rooms · contacts. Then short object text and a direct object URL only. */
export function formatPriceLine(r: any): string {
  if (r.rent_monthly_chf != null && Number.isFinite(Number(r.rent_monthly_chf))) {
    const unit = r.pricing_unit === 'week' ? '/wk' : r.pricing_unit === 'night' ? '/night' : '/mo';
    return `CHF ${r.rent_monthly_chf}${unit}`;
  }
  // F: show verified quote even when unit/monthly conversion is unknown
  const quote = String(r.raw?.price?.quote || r.price_quote || '').replace(/\s+/g, ' ').trim();
  if (quote.length >= 3 && /\d/.test(quote)) return quote.slice(0, 48);
  if (r.raw?.price?.amount != null && Number.isFinite(Number(r.raw.price.amount))) {
    const u = r.pricing_unit && r.pricing_unit !== 'unknown' ? ` ${r.pricing_unit}` : '';
    return `${r.raw.price.amount}${u}`.slice(0, 40);
  }
  if (r.pricing_unit && r.pricing_unit !== 'unknown') return String(r.pricing_unit);
  return 'price n/a';
}

export function formatContactLine(r: any): string {
  const parts = [r.owner_name, r.direct_phone, r.direct_email].filter(Boolean).map(String);
  if (parts.length) return parts.join(' · ');
  return 'no direct contact';
}

/** Prefer the object URL; flag marketplace/group/search pages that are not a single listing. */
export function formatDirectLink(r: any): string {
  const url = String(r.listing_url || '').trim();
  if (!url) return 'Link: (missing)';
  // Heuristic mirrors isSpecificLink: facebook group roots and bare commune search pages are weak.
  let specific = true;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname || '';
    if (host.endsWith('facebook.com')) {
      specific = /\/(marketplace\/item|posts|permalink|videos|photo)\b/.test(path) || /story_fbid|fbid/.test(u.search);
    } else if (/\/(city|area|suche|search|liste|marktplatz)\/?$/i.test(path) || path.split('/').filter(Boolean).length <= 1) {
      specific = /\d{5,}/.test(path) || /[a-z0-9]+(-[a-z0-9]+){3,}/i.test(path.split('/').filter(Boolean).pop() || '');
    }
  } catch { /* keep url */ }
  return specific ? `Link: ${url}` : `Link (may open a list/group, not one object): ${url}`;
}

/** Compact card used on screen, Drive sheet cell, Docs, email and Telegram. */
export function formatListingCard(r: any): string {
  const place = r.municipality || '?';
  const rooms = r.rooms_estimated != null ? `${r.rooms_estimated} rooms` : 'rooms n/a';
  const line1 = `📍 ${place} · ${formatPriceLine(r)} · ${rooms} · ${formatContactLine(r)}`;
  const name = String(r.property_name || '').trim();
  const desc = String(r.description_de || '').replace(/\s+/g, ' ').trim().slice(0, 180);
  const about = [name && name !== place ? name : '', desc].filter(Boolean).join(' — ').slice(0, 220);
  const when = r.first_seen_at ? `Found: ${formatZurich(r.first_seen_at)}` : '';
  const status = r.status && r.status !== 'NEW' ? `Status: ${r.status}` : '';
  return [line1, about, formatDirectLink(r), when, status].filter(Boolean).join('\n');
}

/** Plain-text listing block shared by email and Telegram. */
export function formatListingsText(rows: any[], opts: { heading: string; limit: number; driveUrl?: string }): string {
  const sorted = [...rows].sort((a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime());
  const body = sorted.slice(0, opts.limit).map((r) => formatListingCard(r)).join('\n\n');
  const more = sorted.length > opts.limit ? `\n\n…and ${sorted.length - opts.limit} more in the app.` : '';
  return `${opts.heading}${body ? `\n\n${body}` : ''}${more}${opts.driveUrl ? `\n\nDrive: ${opts.driveUrl}` : ''}`;
}

const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const SCOPES = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/documents';
async function driveToken(sa: { client_email: string; private_key: string }, f: typeof fetch): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({ iss: sa.client_email, scope: SCOPES, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3000 }));
  const sig = crypto.createSign('RSA-SHA256').update(`${head}.${claim}`).sign(sa.private_key).toString('base64url');
  const r = await f('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` }) });
  const d: any = await r.json(); if (!d.access_token) throw new Error('Google token request failed (check GOOGLE_SERVICE_ACCOUNT_JSON)'); return d.access_token;
}

/** One cell per object (phone-friendly): place · price · rooms · contact first, then short text + direct link. */
export function listingsTable(rows: any[]): string[][] {
  const cell = (r: any) => formatListingCard(r).slice(0, 45000);
  return [['ImmoFinder objects (newest first)'], ...[...rows].sort((a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime()).map((r) => [cell(r)])];
}

export const SHEET_NAME = 'ImmoFinder listings'; export const DOC_NAME = 'ImmoFinder drafts';
const SETUP_HINT = `Service accounts cannot create files in a personal Drive. In the folder create a Google Sheet named "${SHEET_NAME}" and a Google Doc named "${DOC_NAME}", share the folder with the service account as Editor, and enable the Google Sheets API and Google Docs API in the Google Cloud project.`;

async function resolveDrive(folderId: string, f: typeof fetch) {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON; if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  if (!folderId) throw new Error('no Drive folder ID (set it in Settings)');
  const sa = JSON.parse(raw); const H = { Authorization: `Bearer ${await driveToken(sa, f)}` };
  const api = 'https://www.googleapis.com/drive/v3';
  const meta = await f(`${api}/files/${folderId}?fields=id,name&supportsAllDrives=true`, { headers: H });
  if (!meta.ok) throw new Error(`folder not accessible (HTTP ${meta.status}): share it with ${sa.client_email} as Editor`);
  const find = async (name: string, mime: string) => {
    const q = encodeURIComponent(`'${folderId}' in parents and name='${name}' and mimeType='${mime}' and trashed=false`);
    return (((await (await f(`${api}/files?q=${q}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`, { headers: H })).json()) as any).files || [])[0]?.id as string | undefined;
  };
  const sheetId = await find(SHEET_NAME, 'application/vnd.google-apps.spreadsheet'); const docId = await find(DOC_NAME, 'application/vnd.google-apps.document');
  if (!sheetId || !docId) throw new Error(`missing in the folder: ${[!sheetId && `Google Sheet "${SHEET_NAME}"`, !docId && `Google Doc "${DOC_NAME}"`].filter(Boolean).join(' and ')}. ${SETUP_HINT}`);
  return { H, sheetId, docId };
}

/** Read-only readiness check used by the settings "Check" button. */

/** Overwrite Sheet + Doc with an empty baseline so Drive matches a wiped DB. */
export async function clearDriveExport(folderId: string, f: typeof fetch = fetch): Promise<{ status: string; url?: string }> {
  try {
    const { H, sheetId, docId } = await resolveDrive(folderId, f); const J = { ...H, 'Content-Type': 'application/json' };
    const sh = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values`;
    let r = await f(`${sh}/A1?valueInputOption=RAW`, { method: 'PUT', headers: J, body: JSON.stringify({ values: [['ImmoFinder objects (newest first)'], ['(cleared — no listings yet)']] }) });
    if (!r.ok) throw new Error(`Sheets clear HTTP ${r.status}`);
    const dd = `https://docs.googleapis.com/v1/documents/${docId}`;
    const doc: any = await (await f(dd, { headers: H })).json();
    const end = Number(doc?.body?.content?.at(-1)?.endIndex ?? 1);
    if (!doc?.body) throw new Error('Docs read failed');
    const requests: any[] = [];
    if (end > 2) requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: end - 1 } } });
    requests.push({ insertText: { location: { index: 1 }, text: 'ImmoFinder drafts — cleared. No listings yet.\n' } });
    r = await f(`${dd}:batchUpdate`, { method: 'POST', headers: J, body: JSON.stringify({ requests }) });
    if (!r.ok) throw new Error(`Docs clear HTTP ${r.status}`);
    return { status: 'cleared', url: `https://drive.google.com/drive/folders/${folderId}` };
  } catch (e) {
    return { status: `error: ${String((e as Error)?.message || e).slice(0, 300)}` };
  }
}

export async function checkDrive(folderId: string, f: typeof fetch = fetch): Promise<string> {
  try { await resolveDrive(folderId, f); return 'ready: folder and both files found'; } catch (e) { return `error: ${String((e as Error)?.message || e).slice(0, 400)}`; }
}

/** Updates an existing Sheet and Doc (created by the owner, so the owner's quota is used). Service accounts cannot create files. */
export async function exportDrive(rows: any[], folderId: string, f: typeof fetch = fetch): Promise<{ status: string; url?: string }> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return { status: 'skipped: GOOGLE_SERVICE_ACCOUNT_JSON not set' };
  try {
    const { H, sheetId, docId } = await resolveDrive(folderId, f); const J = { ...H, 'Content-Type': 'application/json' };
    const sh = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values`;
    let r = await f(`${sh}/A1:ZZ10000:clear`, { method: 'POST', headers: J, body: '{}' }); if (!r.ok) throw new Error(`Sheets clear HTTP ${r.status} (enable the Google Sheets API)`);
    r = await f(`${sh}/A1?valueInputOption=RAW`, { method: 'PUT', headers: J, body: JSON.stringify({ values: listingsTable(rows) }) }); if (!r.ok) throw new Error(`Sheets write HTTP ${r.status}`);
    try { // wrap text and a wide column so one object reads like a card; formatting problems never fail the export
      const meta: any = await (await f(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.sheetId`, { headers: H })).json(); const gid = meta?.sheets?.[0]?.properties?.sheetId ?? 0;
      await f(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, { method: 'POST', headers: J, body: JSON.stringify({ requests: [
        { repeatCell: { range: { sheetId: gid, startColumnIndex: 0, endColumnIndex: 1 }, cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' } }, fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)' } },
        { updateDimensionProperties: { range: { sheetId: gid, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 560 }, fields: 'pixelSize' } },
        { repeatCell: { range: { sheetId: gid, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: 'userEnteredFormat.textFormat.bold' } },
      ] }) });
    } catch { /* ignore */ }
    const dd = `https://docs.googleapis.com/v1/documents/${docId}`;
    const doc: any = await (await f(dd, { headers: H })).json();
    const end = Number(doc?.body?.content?.at(-1)?.endIndex ?? 1);
    if (!doc?.body) throw new Error('Docs read failed (enable the Google Docs API)');
    const text = [...rows].sort((a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime())
      .map((x) => `${formatListingCard(x)}\n\nDraft:\n${x.draft_message_de || ''}\n\n----------------------------------------\n`).join('\n') || 'No listings yet.';
    const requests: any[] = []; if (end > 2) requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: end - 1 } } });
    requests.push({ insertText: { location: { index: 1 }, text } });
    r = await f(`${dd}:batchUpdate`, { method: 'POST', headers: J, body: JSON.stringify({ requests }) }); if (!r.ok) throw new Error(`Docs write HTTP ${r.status}`);
    return { status: 'exported', url: `https://drive.google.com/drive/folders/${folderId}` };
  } catch (e) { return { status: `error: ${String((e as Error)?.message || e).slice(0, 300)}` }; }
}
