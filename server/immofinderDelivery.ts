import crypto from 'node:crypto';
import { csvEscape } from './immofinderCore.ts';

export interface DeliveryResult { telegram: string; drive: string; driveUrl?: string }

export async function sendTelegram(text: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN; const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return 'skipped: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set';
  try {
    const r = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: text.slice(0, 3900), disable_web_page_preview: true }) });
    return r.ok ? 'sent' : `error: HTTP ${r.status}`;
  } catch (e) { return `error: ${String((e as Error)?.message || e).slice(0, 80).replace(token, '***')}`; }
}

export function channelStatus() {
  return { telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID), email: Boolean(process.env.RESEND_API_KEY), drive: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) };
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

const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url');
async function driveToken(sa: { client_email: string; private_key: string }, f: typeof fetch): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/drive', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3000 }));
  const sig = crypto.createSign('RSA-SHA256').update(`${head}.${claim}`).sign(sa.private_key).toString('base64url');
  const r = await f('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` }) });
  const d: any = await r.json(); if (!d.access_token) throw new Error('drive token request failed'); return d.access_token;
}

export function listingsCsv(rows: any[]): string {
  const cols = ['status', 'municipality', 'property_name', 'rooms_estimated', 'contact_status', 'direct_phone', 'direct_email', 'owner_name', 'listing_url', 'photo_urls', 'source_urls', 'description_de', 'description_ru', 'contact_advice', 'draft_message_de'];
  return [cols.join(','), ...rows.map((r) => cols.map((c) => csvEscape(Array.isArray(r[c]) ? r[c].join(' ') : r[c])).join(','))].join('\n');
}

/** Writes listings.csv / listings.json / drafts.txt into the Drive folder (created and shared on first use). Skipped without credentials. */
export async function exportDrive(rows: any[], f: typeof fetch = fetch): Promise<{ status: string; url?: string }> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return { status: 'skipped: GOOGLE_SERVICE_ACCOUNT_JSON not set' };
  try {
    const sa = JSON.parse(raw); const tok = await driveToken(sa, f); const H = { Authorization: `Bearer ${tok}` };
    const api = 'https://www.googleapis.com/drive/v3'; let folder = process.env.IMMOFINDER_DRIVE_FOLDER_ID || '';
    if (!folder) {
      const q = encodeURIComponent("name='ImmoFinder GR' and mimeType='application/vnd.google-apps.folder' and trashed=false");
      folder = ((await (await f(`${api}/files?q=${q}&fields=files(id)`, { headers: H })).json()) as any).files?.[0]?.id || '';
      if (!folder) {
        folder = ((await (await f(`${api}/files`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'ImmoFinder GR', mimeType: 'application/vnd.google-apps.folder' }) })).json()) as any).id;
        const share = process.env.IMMOFINDER_DRIVE_SHARE_EMAIL;
        if (share) await f(`${api}/files/${folder}/permissions`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'user', role: 'writer', emailAddress: share }) });
      }
    }
    // Service accounts have no storage quota for ordinary files, so write native Google Sheets/Docs (converted from CSV/text); old copies are replaced.
    const files: [string, string, string, string][] = [
      ['ImmoFinder listings', 'application/vnd.google-apps.spreadsheet', 'text/csv', listingsCsv(rows)],
      ['ImmoFinder drafts', 'application/vnd.google-apps.document', 'text/plain', rows.map((r) => `${r.property_name} (${r.municipality})\n${r.listing_url}\n\n${r.draft_message_de}\n\n----------------------------------------\n`).join('\n')],
    ];
    for (const [name, nativeType, srcType, body] of files) {
      const q = encodeURIComponent(`name='${name}' and '${folder}' in parents and trashed=false`);
      for (const old of ((await (await f(`${api}/files?q=${q}&fields=files(id)`, { headers: H })).json()) as any).files || []) await f(`${api}/files/${old.id}`, { method: 'DELETE', headers: H });
      const bnd = 'immo' + crypto.randomBytes(8).toString('hex');
      const multipart = `--${bnd}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ name, parents: [folder], mimeType: nativeType })}\r\n--${bnd}\r\nContent-Type: ${srcType}; charset=UTF-8\r\n\r\n${body}\r\n--${bnd}--`;
      const r = await f('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { ...H, 'Content-Type': `multipart/related; boundary=${bnd}` }, body: multipart });
      if (!r.ok) throw new Error(`upload ${name} HTTP ${r.status} ${(await r.text()).replace(/\s+/g, ' ').slice(0, 140)}`);
    }
    return { status: 'exported', url: `https://drive.google.com/drive/folders/${folder}` };
  } catch (e) { return { status: `error: ${String((e as Error)?.message || e).slice(0, 120)}` }; }
}
