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

/** Plain-text listing block shared by email and Telegram; every entry carries the date and time it was found (Swiss time). */
export function formatListingsText(rows: any[], opts: { heading: string; limit: number; driveUrl?: string }): string {
  const sorted = [...rows].sort((a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime());
  const body = sorted.slice(0, opts.limit).map((r) => [
    `• ${r.property_name} (${r.municipality}, ${r.rooms_estimated} rooms, ${r.listing_type === 'long_term_offer' ? 'direct offer' : 'holiday owner'})`, `  Found: ${formatZurich(r.first_seen_at)}`, `  ${r.listing_url}`,
    [r.owner_name, r.direct_phone, r.direct_email].filter(Boolean).length ? `  Contact: ${[r.owner_name, r.direct_phone, r.direct_email].filter(Boolean).join(' · ')}` : '', r.status && r.status !== 'NEW' ? `  Status: ${r.status}` : '',
  ].filter(Boolean).join('\n')).join('\n\n');
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

/** One cell per object (readable on a phone): everything except the letter draft, newest first. */
export function listingsTable(rows: any[]): string[][] {
  const cell = (r: any) => [
    `${r.property_name}`, `📍 ${r.municipality} · ${r.rooms_estimated} rooms · ${r.listing_type === 'long_term_offer' ? 'direct offer' : 'holiday owner'} · ${r.status}`, `Found: ${formatZurich(r.first_seen_at)}`,
    [r.owner_name, r.direct_phone, r.direct_email].filter(Boolean).length ? `Contact: ${[r.owner_name, r.direct_phone, r.direct_email].filter(Boolean).join(' · ')}` : `Contact: not found. ${String(r.contact_advice || '').slice(0, 160)}`,
    `Link: ${r.listing_url}`, (r.photo_urls || []).length ? `Photos: ${(r.photo_urls || []).slice(0, 3).join(' ')}` : '', (r.source_urls || []).length > 1 ? `Other sources: ${(r.source_urls || []).slice(1).join(' ')}` : '',
    r.description_de ? `Text: ${r.description_de}` : '',
  ].filter(Boolean).join('\n').slice(0, 45000);
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
      .map((x) => `${x.property_name} (${x.municipality}) — found ${formatZurich(x.first_seen_at)}\n${x.listing_url}\n\n${x.draft_message_de}\n\n----------------------------------------\n`).join('\n') || 'No listings yet.';
    const requests: any[] = []; if (end > 2) requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: end - 1 } } });
    requests.push({ insertText: { location: { index: 1 }, text } });
    r = await f(`${dd}:batchUpdate`, { method: 'POST', headers: J, body: JSON.stringify({ requests }) }); if (!r.ok) throw new Error(`Docs write HTTP ${r.status}`);
    return { status: 'exported', url: `https://drive.google.com/drive/folders/${folderId}` };
  } catch (e) { return { status: `error: ${String((e as Error)?.message || e).slice(0, 300)}` }; }
}
