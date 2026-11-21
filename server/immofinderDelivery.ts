import crypto from 'node:crypto';
import { formatZurich } from './immofinderSettings.ts';
import { IMMO_COLORS as C, immoCardModel, immoCardPlainText, immoDatesText, immoFormatDate, immoLinkLine } from '../src/immoCard.ts';

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

/** Human-readable rent period for cards (never hide night/week as bare CHF). */
export function pricePeriodLabel(unit: string | null | undefined): string | null {
  const u = String(unit || '').toLowerCase();
  if (u === 'night' || u === 'day') return 'per night';
  if (u === 'week') return 'per week';
  if (u === 'month') return 'per month';
  if (u === 'season') return 'per season';
  return null;
}

/** First line price: amount + explicit period. Prefer listing amount/unit over converted monthly. */
export function formatPriceLine(r: any): string {
  const unit = String(r.pricing_unit || r.raw?.price?.unit || '').toLowerCase() || 'unknown';
  const period = pricePeriodLabel(unit);
  const rawAmount = r.raw?.price?.amount;
  const amount =
    rawAmount != null && Number.isFinite(Number(rawAmount))
      ? Number(rawAmount)
      : null;
  const quote = String(r.raw?.price?.quote || r.price_quote || '').replace(/\s+/g, ' ').trim();

  // Known period + original amount (night 119, week 1750, month 1600)
  if (amount != null && period) {
    return `CHF ${amount} ${period}`;
  }
  // Explicit monthly field only when unit is month (do not show night×30 as "per month")
  if (unit === 'month' && r.rent_monthly_chf != null && Number.isFinite(Number(r.rent_monthly_chf))) {
    return `CHF ${r.rent_monthly_chf} per month`;
  }
  // Quote from page, annotate period if missing in the quote text
  if (quote.length >= 3 && /\d/.test(quote)) {
    const hasPeriodWord = /per\s+(night|week|month|season)|\/(mo|wk|night)|\b(nacht|nächte|tag|tage|woche|wochen|monat|mtl\.?|season|saison)\b/i.test(quote);
    if (period && !hasPeriodWord) return `${quote.slice(0, 36)} (${period})`;
    if (!period && !hasPeriodWord) return `${quote.slice(0, 36)} (period unclear)`;
    return quote.slice(0, 48);
  }
  if (amount != null) {
    return period ? `CHF ${amount} ${period}` : `CHF ${amount} (period unclear)`;
  }
  if (period) return period;
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

/**
 * Compact card used on email and Telegram — same model as the screen and Drive sheet.
 * Headline / about / link / published only (no source-snippet dumps).
 */
export function formatListingCard(r: any): string {
  const k = immoCardModel(r);
  const when = k.published ? `Published: ${k.published.replace(/^published\s+/i, '')}` : '';
  const link = k.url
    ? (k.linkNote ? `Link (may open a list/group, not one object): ${k.url}` : `Link: ${k.url}`)
    : 'Link: (missing)';
  return [k.headline, k.about, link, when].filter(Boolean).join('\n');
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

/** Plain-text fallback of the sheet (one cell per object, same order and wording as the screen, no letters). Used only if rich formatting is rejected. */
export function listingsTable(rows: any[]): string[][] {
  return [[`Listings (${rows.length})`], ...rows.map((r) => [immoCardPlainText(immoCardModel(r)).slice(0, 45000)])];
}

const hex = (h: string) => ({ red: parseInt(h.slice(1, 3), 16) / 255, green: parseInt(h.slice(3, 5), 16) / 255, blue: parseInt(h.slice(5, 7), 16) / 255 });
const FONT = 'Inter';
const SHEET_COLS = [120, 100, 100, 100, 90, 90]; // px, 600 total — one card reads like the phone screen
const SHEET_W = SHEET_COLS.reduce((a, b) => a + b, 0);

/** Rough wrapped line count for a merged cell (Sheets does not auto-fit merged cells). */
function wrapLines(text: string, pt: number, bold = false): number {
  const cpl = Math.max(10, Math.floor((SHEET_W - 12) / (pt * 1.333 * (bold ? 0.68 : 0.62))));
  return String(text).split('\n').reduce((n, p) => n + Math.max(1, Math.ceil(p.length / cpl)), 0);
}
const rowPx = (text: string, pt: number, bold = false) => Math.round(wrapLines(text, pt, bold) * pt * 1.333 * 1.4 + 12);

/**
 * Sheet layout: one card = headline / description / link line / buttons row / spacer, painted like the app screen
 * (dark card, bold headline, light-blue text, blue "Open" button, chips for photos). Pure function: returns Sheets API requests.
 */
export function buildSheetRequests(rows: any[], gid: number, opts: { rowCount?: number; columnCount?: number; emptyNote?: string } = {}): { requests: any[]; totalRows: number } {
  const cards = rows.map((r) => immoCardModel(r));
  const base = (bg: string, extra: any = {}) => ({ backgroundColor: hex(bg), verticalAlignment: 'TOP', wrapStrategy: 'WRAP', textFormat: { fontFamily: FONT, fontSize: 11, foregroundColor: hex(C.text) }, ...extra });
  const blank = (bg: string) => ({ userEnteredFormat: base(bg) });
  const grid: any[][] = []; const heights: number[] = []; const merges: [number, number, number, number][] = []; const borders: any[] = [];
  const push = (cells: any[], h: number) => { grid.push(cells); heights.push(h); return grid.length - 1; };
  const wide = (value: string, fmt: any, runs: any[] | null, bg: string) => [{ userEnteredValue: { stringValue: value }, userEnteredFormat: base(bg, fmt), ...(runs ? { textFormatRuns: runs } : {}) }, ...Array.from({ length: 5 }, () => blank(bg))];

  const title = cards.length ? `Listings (${cards.length})` : `Listings (0)`;
  let r = push(wide(title, { textFormat: { fontFamily: FONT, fontSize: 14, bold: true, foregroundColor: hex(C.text) }, verticalAlignment: 'MIDDLE' }, null, C.page), 36); merges.push([r, r + 1, 0, 6]);
  if (!cards.length) { r = push(wide(opts.emptyNote || 'No listings yet.', { textFormat: { fontFamily: FONT, fontSize: 11, foregroundColor: hex(C.muted) } }, null, C.page), 28); merges.push([r, r + 1, 0, 6]); }

  for (const k of cards) {
    const top = grid.length;
    r = push(wide(k.headline, { textFormat: { fontFamily: FONT, fontSize: 12, bold: true, foregroundColor: hex(C.text) } }, null, C.card), rowPx(k.headline, 12, true)); merges.push([r, r + 1, 0, 6]);
    if (k.about) { r = push(wide(k.about, { textFormat: { fontFamily: FONT, fontSize: 11, foregroundColor: hex(C.about) } }, null, C.card), rowPx(k.about, 11)); merges.push([r, r + 1, 0, 6]); }
    const line = immoLinkLine(k); const lineFont = { fontFamily: FONT, fontSize: 10 };
    const runs: any[] = [{ startIndex: 0, format: { ...lineFont, foregroundColor: hex(C.link), underline: false, ...(k.url ? { link: { uri: k.url } } : {}) } }];
    let at = k.url.length;
    if (k.linkNote) { runs.push({ startIndex: at, format: { ...lineFont, foregroundColor: hex(C.warn), underline: false } }); at += k.linkNote.length + 1; }
    if (k.published) runs.push({ startIndex: at, format: { ...lineFont, foregroundColor: hex(C.muted), underline: false } });
    r = push(wide(line, { textFormat: { ...lineFont, foregroundColor: hex(C.link) } }, runs, C.card), rowPx(line, 10)); merges.push([r, r + 1, 0, 6]);
    const btn = (label: string, url: string, open: boolean) => ({ userEnteredValue: { stringValue: label }, userEnteredFormat: base(open ? C.btnBg : C.chipBg, { horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', textFormat: { fontFamily: FONT, fontSize: 10, bold: open, underline: false, foregroundColor: hex(open ? C.btnText : C.chipText), ...(url ? { link: { uri: url } } : {}) } }) });
    const cells = [btn(k.openLabel, k.url, true), ...[0, 1, 2].map((i) => (k.photos[i] ? btn(k.photos[i].label, k.photos[i].url, false) : blank(C.card))),
      blank(C.card), blank(C.card)];
    r = push(cells, 34); merges.push([r, r + 1, 4, 6]);
    borders.push({ r0: top, r1: r + 1, c0: 0, c1: 6, color: C.border }, { r0: top, r1: top + 1, c0: 0, c1: 1, color: C.btnBorder });
    push(Array.from({ length: 6 }, () => blank(C.page)), 12);
  }
  const totalRows = grid.length;
  const sid = { sheetId: gid }; const full = { sheetId: gid };
  const line = (color: string, style = 'SOLID') => ({ style, width: 1, color: hex(color) });
  const requests: any[] = [
    { unmergeCells: { range: full } },
    { updateCells: { range: full, fields: '*' } },
    { updateSheetProperties: { properties: { sheetId: gid, gridProperties: { hideGridlines: true, rowCount: Math.max(totalRows + 20, 100), columnCount: Math.max(opts.columnCount || 26, 6) } }, fields: 'gridProperties.hideGridlines,gridProperties.rowCount,gridProperties.columnCount' } },
    { repeatCell: { range: full, cell: { userEnteredFormat: { backgroundColor: hex(C.page), textFormat: { fontFamily: FONT, fontSize: 11, foregroundColor: hex(C.text) } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
    ...SHEET_COLS.map((px, i) => ({ updateDimensionProperties: { range: { ...sid, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 }, properties: { pixelSize: px }, fields: 'pixelSize' } })),
    ...heights.map((px, i) => ({ updateDimensionProperties: { range: { ...sid, dimension: 'ROWS', startIndex: i, endIndex: i + 1 }, properties: { pixelSize: px }, fields: 'pixelSize' } })),
    { updateCells: { start: { ...sid, rowIndex: 0, columnIndex: 0 }, rows: grid.map((values) => ({ values })), fields: 'userEnteredValue,userEnteredFormat,textFormatRuns' } },
    ...merges.map(([a, b, c, d]) => ({ mergeCells: { range: { ...sid, startRowIndex: a, endRowIndex: b, startColumnIndex: c, endColumnIndex: d }, mergeType: 'MERGE_ALL' } })),
    ...borders.map((b) => ({ updateBorders: { range: { ...sid, startRowIndex: b.r0, endRowIndex: b.r1, startColumnIndex: b.c0, endColumnIndex: b.c1 }, top: line(b.color), bottom: line(b.color), left: line(b.color), right: line(b.color) } })),
  ];
  return { requests, totalRows };
}

/**
 * Doc layout: same card, paragraph by paragraph, on the dark page: shaded + framed paragraphs, bold headline, coloured text,
 * links with the button / chip look. Pure function: returns Docs API requests for a document whose body currently ends at `endIndex`.
 */
export function buildDocRequests(rows: any[], endIndex: number, opts: { emptyNote?: string } = {}): any[] {
  const cards = rows.map((r) => immoCardModel(r));
  type Seg = { t: string; fg?: string; bg?: string; bold?: boolean; pt?: number; link?: string };
  type Para = { segs: Seg[]; card?: boolean; pt?: number; spaceBelow?: number };
  const paras: Para[] = [{ segs: [{ t: cards.length ? `Listings (${cards.length})` : 'Listings (0)', bold: true, pt: 18 }], spaceBelow: 8 }];
  if (!cards.length) paras.push({ segs: [{ t: opts.emptyNote || 'No listings yet.', fg: C.muted }] });
  const NB = '\u00A0';
  for (const k of cards) {
    paras.push({ card: true, segs: [{ t: k.headline, bold: true, pt: 12 }] });
    if (k.about) paras.push({ card: true, segs: [{ t: k.about, fg: C.about, pt: 10.5 }] });
    const ls: Seg[] = [{ t: k.url, fg: C.link, pt: 10, link: k.url || undefined }];
    if (k.linkNote) ls.push({ t: ` ${k.linkNote}`, fg: C.warn, pt: 10 });
    if (k.published) ls.push({ t: ` · ${immoDatesText(k)}`, fg: C.muted, pt: 10 });
    paras.push({ card: true, segs: ls });
    const bs: Seg[] = [{ t: `${NB}${k.openLabel}${NB}`, fg: C.btnText, bg: C.btnBg, bold: true, pt: 10, link: k.url || undefined }];
    for (const p of k.photos) bs.push({ t: '  ', pt: 10 }, { t: `${NB}${p.label}${NB}`, fg: C.chipText, bg: C.chipBg, pt: 10, link: p.url });
    paras.push({ card: true, segs: bs });
    paras.push({ segs: [{ t: '', pt: 6 }], spaceBelow: 0 });
  }
  let text = ''; const styleReqs: any[] = []; const cardRanges: { start: number; end: number }[] = []; const spacerRanges: [number, number][] = []; const titleRanges: [number, number, number][] = [];
  const colour = (h: string) => ({ color: { rgbColor: hex(h) } });
  paras.forEach((p) => {
    const pStart = 1 + text.length;
    for (const sg of p.segs) {
      const start = 1 + text.length; text += sg.t; const end = 1 + text.length;
      if (end > start) {
        const st: any = { fontSize: { magnitude: sg.pt || 11, unit: 'PT' }, bold: Boolean(sg.bold), underline: false };
        const fields = ['fontSize', 'bold', 'underline'];
        if (sg.fg) { st.foregroundColor = colour(sg.fg); fields.push('foregroundColor'); }
        if (sg.bg) { st.backgroundColor = colour(sg.bg); fields.push('backgroundColor'); }
        if (sg.link) { st.link = { url: sg.link }; fields.push('link'); }
        styleReqs.push({ updateTextStyle: { range: { startIndex: start, endIndex: end }, textStyle: st, fields: fields.join(',') } });
      }
    }
    text += '\n';
    const pEnd = 1 + text.length;
    if (p.card) cardRanges.push({ start: pStart, end: pEnd });
    else if (p.segs[0]?.pt === 6) spacerRanges.push([pStart, pEnd]);
    else if (p.spaceBelow) titleRanges.push([pStart, pEnd, p.spaceBelow]);
  });
  const total = 1 + text.length; const all = { startIndex: 1, endIndex: total };
  const edge = { color: colour(C.border), width: { magnitude: 1, unit: 'PT' }, padding: { magnitude: 6, unit: 'PT' }, dashStyle: 'SOLID' };
  const requests: any[] = [];
  if (endIndex > 2) requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: endIndex - 1 } } });
  requests.push({ insertText: { location: { index: 1 }, text } });
  requests.push({ updateDocumentStyle: { documentStyle: { background: { color: colour(C.page) }, marginTop: { magnitude: 36, unit: 'PT' }, marginBottom: { magnitude: 36, unit: 'PT' }, marginLeft: { magnitude: 36, unit: 'PT' }, marginRight: { magnitude: 36, unit: 'PT' } }, fields: 'background,marginTop,marginBottom,marginLeft,marginRight' } });
  requests.push({ updateParagraphStyle: { range: all, paragraphStyle: { namedStyleType: 'NORMAL_TEXT', alignment: 'START', lineSpacing: 115, spaceAbove: { magnitude: 0, unit: 'PT' }, spaceBelow: { magnitude: 0, unit: 'PT' }, indentStart: { magnitude: 0, unit: 'PT' }, indentEnd: { magnitude: 0, unit: 'PT' }, indentFirstLine: { magnitude: 0, unit: 'PT' } }, fields: 'namedStyleType,alignment,lineSpacing,spaceAbove,spaceBelow,indentStart,indentEnd,indentFirstLine,shading,borderTop,borderBottom,borderLeft,borderRight,borderBetween' } });
  requests.push({ updateTextStyle: { range: all, textStyle: { foregroundColor: colour(C.text), weightedFontFamily: { fontFamily: FONT }, fontSize: { magnitude: 11, unit: 'PT' }, bold: false, italic: false, underline: false }, fields: 'foregroundColor,weightedFontFamily,fontSize,bold,italic,underline,backgroundColor,link' } });
  for (const q of styleReqs) {
    requests.push(q);
  }
  for (const [a, b, below] of titleRanges) requests.push({ updateParagraphStyle: { range: { startIndex: a, endIndex: b }, paragraphStyle: { spaceBelow: { magnitude: below, unit: 'PT' } }, fields: 'spaceBelow' } });
  for (const [a, b] of spacerRanges) requests.push({ updateParagraphStyle: { range: { startIndex: a, endIndex: b }, paragraphStyle: { lineSpacing: 100 }, fields: 'lineSpacing' } });
  for (const cr of cardRanges) {
    requests.push({ updateParagraphStyle: { range: { startIndex: cr.start, endIndex: cr.end }, paragraphStyle: { shading: { backgroundColor: colour(C.card) }, borderTop: edge, borderBottom: edge, borderLeft: edge, borderRight: edge, indentStart: { magnitude: 10, unit: 'PT' }, indentEnd: { magnitude: 10, unit: 'PT' } }, fields: 'shading,borderTop,borderBottom,borderLeft,borderRight,indentStart,indentEnd' } });
  }
  return requests;
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
    return (((await (await f(`${api}/files?q=${q}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`, { headers: H })).json()) as any).files || [])[0]?.id as string | undefined;
  };
  const sheetId = await find(SHEET_NAME, 'application/vnd.google-apps.spreadsheet');
  const docId = await find(DOC_NAME, 'application/vnd.google-apps.document');
  // Allow partial export: update whichever file exists. Service accounts still cannot create files in personal Drive.
  if (!sheetId && !docId) {
    throw new Error(`missing in the folder: Google Sheet "${SHEET_NAME}" and Google Doc "${DOC_NAME}". ${SETUP_HINT}`);
  }
  return { H, sheetId: sheetId || null, docId: docId || null, saEmail: String(sa.client_email || '') };
}

/** Read-only readiness check used by the settings "Check" button. */

/** Overwrite Sheet + Doc with an empty baseline so Drive matches a wiped DB. */
export async function clearDriveExport(folderId: string, f: typeof fetch = fetch): Promise<{ status: string; url?: string }> {
  const r = await exportDrive([], folderId, f, 'Cleared — no listings yet.');
  return r.status === 'exported' ? { ...r, status: 'cleared' } : r;
}

export async function checkDrive(folderId: string, f: typeof fetch = fetch): Promise<string> {
  try {
    const r = await resolveDrive(folderId, f);
    const missing: string[] = [];
    if (!r.sheetId) missing.push(`Google Sheet "${SHEET_NAME}"`);
    if (!r.docId) missing.push(`Google Doc "${DOC_NAME}"`);
    // Keep the historic "missing in the folder" phrase so P128.6 / UI checks stay stable.
    if (missing.length) return `error: missing in the folder: ${missing.join(' and ')}. ${SETUP_HINT}`;
    return 'ready: folder and both files found';
  } catch (e) { return `error: ${String((e as Error)?.message || e).slice(0, 400)}`; }
}

/**
 * Updates an existing Sheet and Doc (created by the owner, so the owner's quota is used). Service accounts cannot create files.
 * Both files show the same cards as the app screen, in the same order (the order of `rows`); no letters are written.
 */
export async function exportDrive(rows: any[], folderId: string, f: typeof fetch = fetch, emptyNote?: string): Promise<{ status: string; url?: string }> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return { status: 'skipped: GOOGLE_SERVICE_ACCOUNT_JSON not set' };
  try {
    const { H, sheetId, docId } = await resolveDrive(folderId, f); const J = { ...H, 'Content-Type': 'application/json' };
    const notes: string[] = [];
    // --- Sheet (independent of Doc)
    if (sheetId) {
      const sh = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
      let gid = 0; let rowCount = 1000; let columnCount = 26;
      try {
        const meta: any = await (await f(`${sh}?fields=sheets.properties(sheetId,gridProperties)`, { headers: H })).json();
        const pr = meta?.sheets?.[0]?.properties; gid = pr?.sheetId ?? 0; rowCount = pr?.gridProperties?.rowCount ?? rowCount; columnCount = pr?.gridProperties?.columnCount ?? columnCount;
      } catch { /* defaults */ }
      const sheetPlan = buildSheetRequests(rows, gid, { rowCount, columnCount, emptyNote });
      let r = await f(`${sh}:batchUpdate`, { method: 'POST', headers: J, body: JSON.stringify({ requests: sheetPlan.requests }) });
      if (!r.ok) {
        const why = `HTTP ${r.status}`;
        r = await f(`${sh}/values/A1:ZZ10000:clear`, { method: 'POST', headers: J, body: '{}' }); if (!r.ok) throw new Error(`Sheets clear HTTP ${r.status} (enable the Google Sheets API)`);
        r = await f(`${sh}/values/A1?valueInputOption=RAW`, { method: 'PUT', headers: J, body: JSON.stringify({ values: listingsTable(rows) }) }); if (!r.ok) throw new Error(`Sheets write HTTP ${r.status}`);
        notes.push(`sheet: plain text (formatting rejected, ${why})`);
      }
      // success: no note (status stays plain "exported" when both files write cleanly)
    } else {
      notes.push(`sheet: missing "${SHEET_NAME}" — create it in the folder (${SETUP_HINT})`);
    }
    // --- Doc (independent of Sheet)
    if (docId) {
      const dd = `https://docs.googleapis.com/v1/documents/${docId}`;
      const doc: any = await (await f(dd, { headers: H })).json();
      const end = Number(doc?.body?.content?.at(-1)?.endIndex ?? 1);
      if (!doc?.body) throw new Error('Docs read failed (enable the Google Docs API)');
      let r = await f(`${dd}:batchUpdate`, { method: 'POST', headers: J, body: JSON.stringify({ requests: buildDocRequests(rows, end, { emptyNote }) }) });
      if (!r.ok) {
        const why = `HTTP ${r.status}`;
        const text = (rows.length ? rows.map((x) => immoCardPlainText(immoCardModel(x))).join('\n\n') : (emptyNote || 'No listings yet.'));
        const plain: any[] = []; if (end > 2) plain.push({ deleteContentRange: { range: { startIndex: 1, endIndex: end - 1 } } });
        plain.push({ insertText: { location: { index: 1 }, text: `Listings (${rows.length})\n\n${text}\n` } });
        r = await f(`${dd}:batchUpdate`, { method: 'POST', headers: J, body: JSON.stringify({ requests: plain }) }); if (!r.ok) throw new Error(`Docs write HTTP ${r.status}`);
        notes.push(`doc: plain text (formatting rejected, ${why})`);
      }
      // success: no note
    } else {
      notes.push(`doc: missing "${DOC_NAME}" — create it in the folder and share with the service account as Editor`);
    }
    // Full success → "exported". Partial / plain-text fallback → "exported (…notes…)".
    const status = notes.length ? `exported (${notes.join('; ')})` : 'exported';
    return { status, url: `https://drive.google.com/drive/folders/${folderId}` };
  } catch (e) { return { status: `error: ${String((e as Error)?.message || e).slice(0, 300)}` }; }
}
