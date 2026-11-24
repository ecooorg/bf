/**
 * Recheck refresh: for every saved listing (hidden ones too) read the ad page again, look for the publication date and for
 * contacts, and, where a card still has neither phone nor email, run the public contact search. Dependencies are injected,
 * so it runs against fakes in tests. Rows are only ever completed, never emptied: a missing date or contact on the page
 * keeps what is stored.
 * P130.16 L2: after page fetch, re-verify with verifyListingFromPageText and hide sale/mismatch objects.
 */
import { extractContacts, htmlToText, pageMeta, parseListedAtDetailed, dateDiagSnippet, isListingUnavailable, verifyListingFromPageText, parsePrice } from './immofinderCore.ts';
import { applyEnrichmentToRecord, type EnrichmentInput, type EnrichmentResult } from './immofinderContactEnrichment.ts';
import { cardFields, completenessSummary, safeUrlSample } from './immofinderDiag.ts';

export interface RefreshStatus {
  running: boolean; startedAt: number | null; finishedAt: number | null; phase: 'idle' | 'reading' | 'searching' | 'done';
  queued: number; checked: number; datesAdded: number; datesChanged: number; contactsAdded: number; unavailableHidden: number; enrichedFound: number; contactSearches: number;
  unreachable: number; errors: number; current: string; message: string; webSearch: 'on' | 'off';
}

export const newRefreshStatus = (): RefreshStatus => ({
  running: false, startedAt: null, finishedAt: null, phase: 'idle', queued: 0, checked: 0, datesAdded: 0, datesChanged: 0, contactsAdded: 0, unavailableHidden: 0,
  enrichedFound: 0, contactSearches: 0, unreachable: 0, errors: 0, current: '', message: '', webSearch: 'off',
});

export interface RefreshFields {
  direct_phone: string | null; direct_email: string | null; contact_evidence: unknown; contact_status: string; contact_advice: string; raw: Record<string, unknown>;
}
export interface RefreshDeps {
  fetchPage: (url: string) => Promise<{ ok: boolean; status: number; body: string }>;
  platformDomains: string[];
  enrich?: (input: EnrichmentInput) => Promise<EnrichmentResult>;
  update: (id: string, fields: RefreshFields) => Promise<void>;
  log: (level: 'info' | 'warn' | 'error', event: string, details: Record<string, unknown>) => void;
  now?: () => Date;
  shouldStop?: () => boolean;
}

interface Parsed { id: string; row: any; http: number; fetched: boolean; date: Date | null; dateSource: 'declared' | 'text' | 'none'; phones: string[]; emails: string[]; error?: string; dateHint: string | null; unavailable?: boolean; pageText?: string; pageTitle?: string }

const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? { ...(v as Record<string, any>) } : {});
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

async function readPage(row: any, deps: RefreshDeps): Promise<Parsed> {
  const url = String(row.listing_url || '');
  const out: Parsed = { id: String(row.id), row, http: 0, fetched: false, date: null, dateSource: 'none', phones: [], emails: [], dateHint: null };
  if (!/^https?:\/\//i.test(url)) { out.error = 'no_http_url'; return out; }
  try {
    const pg = await deps.fetchPage(url);
    out.http = pg.status;
    if (!pg.ok) return out;
    out.fetched = true;
    const text = htmlToText(pg.body); const meta = pageMeta(pg.body, url);
    const hay = `${meta.title}\n${text.slice(0, 12000)}`;
    out.pageText = hay;
    out.pageTitle = meta.title || String(row.property_name || '');
    const d = parseListedAtDetailed(hay, url, meta.published);
    out.date = d.date; out.dateSource = d.source;
    if (!d.date) out.dateHint = dateDiagSnippet(text);
    out.unavailable = isListingUnavailable(meta.title, text);
    const c = extractContacts(text, deps.platformDomains);
    out.phones = c.phones; out.emails = c.emails;
  } catch (e) { out.error = String((e as Error)?.message || e).slice(0, 120); }
  return out;
}

export async function runRefreshJob(rows: any[], deps: RefreshDeps, status: RefreshStatus): Promise<void> {
  const now = deps.now ?? (() => new Date());
  const t0 = Date.now();
  Object.assign(status, newRefreshStatus(), { running: true, startedAt: t0, phase: 'reading', queued: rows.length, webSearch: deps.enrich ? 'on' : 'off', message: `Reading ${rows.length} pages…` });
  const before = completenessSummary(rows);
  deps.log('info', 'recheck_refresh_start', { queued: rows.length, webSearch: status.webSearch, completenessBefore: before });
  const parsed: Parsed[] = [];
  const dateHints: { url: string; hint: string }[] = [];
  const failedByStatus: Record<string, number> = {};
  for (const row of rows) {
    if (deps.shouldStop?.()) break;
    status.current = `${String(row.property_name || '').slice(0, 40)} · ${String(row.municipality || '')}`;
    const p = await readPage(row, deps);
    parsed.push(p); status.checked = parsed.length; status.message = `Reading pages ${parsed.length}/${rows.length}…`;
    if (!p.fetched) { status.unreachable++; const k = p.error || String(p.http); failedByStatus[k] = (failedByStatus[k] || 0) + 1; }
    if (p.fetched && !p.date && p.dateHint && dateHints.length < 8) dateHints.push({ url: safeUrlSample(row.listing_url), hint: p.dateHint });
  }
  const phoneUse = new Map<string, number>();
  for (const p of parsed) for (const ph of p.phones) { const k = `${hostOf(String(p.row.listing_url))}|${ph}`; phoneUse.set(k, (phoneUse.get(k) || 0) + 1); }

  status.phase = 'searching'; status.checked = 0;
  const after: any[] = [];
  let i = 0;
  for (const p of parsed) {
    i++; const row = p.row;
    status.checked = i; status.current = `${String(row.property_name || '').slice(0, 40)} · ${String(row.municipality || '')}`;
    status.message = `Saving dates and searching contacts ${i}/${parsed.length}…`;
    try {
      const prevRaw = obj(row.raw);
      const hadDate = Boolean(prevRaw.listed_at);
      const raw: Record<string, unknown> = { ...prevRaw };
      const host = hostOf(String(row.listing_url));
      if (p.unavailable) {
        raw.unavailable = true;
        raw.unavailable_at = now().toISOString();
        status.unavailableHidden++;
        await deps.update(p.id, {
          direct_phone: row.direct_phone || null,
          direct_email: row.direct_email || null,
          contact_evidence: row.contact_evidence ?? [],
          contact_status: row.contact_status || 'platform_only',
          contact_advice: String(row.contact_advice || ''),
          raw,
          hidden: true,
          hide_reason: 'listing_unavailable',
        } as any);
        after.push({ ...row, hidden: true, hide_reason: 'listing_unavailable', raw });
        deps.log('info', 'recheck_refresh_item', {
          index: i, total: parsed.length, id: String(row.id).slice(0, 8), host, source: cardFields(row).source,
          http: p.http, fetched: p.fetched, hidden: true, date: 'unavailable', dateSource: p.dateSource,
          pagePhones: 0, pageEmails: 0, hadContact: Boolean(row.direct_phone || row.direct_email),
          hasContact: Boolean(row.direct_phone || row.direct_email), enrich: 'skipped_unavailable', enrichSearches: status.contactSearches,
        });
        continue;
      }
      // P130.16 L2: full-page re-verify — hide sale / price-sale-mismatch objects that slipped in as rent
      if (p.fetched && p.pageText) {
        const storedPrice = row.price_amount != null ? { amount: Number(row.price_amount), unit: String(row.price_unit || 'month'), currency: 'CHF', quote: String(row.price_quote || '') } : null;
        const pagePrice = parsePrice(p.pageText) || storedPrice;
        const reason = verifyListingFromPageText({
          title: p.pageTitle || String(row.property_name || ''),
          url: String(row.listing_url || ''),
          pageText: p.pageText,
          municipality: row.municipality || null,
          roomsEstimated: row.rooms != null ? Number(row.rooms) : null,
          price: pagePrice || storedPrice,
        });
        if (reason === 'for_sale' || reason === 'price_sale_mismatch') {
          raw.verify_l2 = { at: now().toISOString(), reason, evidence_kind: 'page_text' };
          status.unavailableHidden++;
          await deps.update(p.id, {
            direct_phone: row.direct_phone || null,
            direct_email: row.direct_email || null,
            contact_evidence: row.contact_evidence ?? [],
            contact_status: row.contact_status || 'platform_only',
            contact_advice: String(row.contact_advice || ''),
            raw,
            hidden: true,
            hide_reason: reason,
          } as any);
          after.push({ ...row, hidden: true, hide_reason: reason, raw });
          deps.log('info', 'recheck_refresh_item', {
            index: i, total: parsed.length, id: String(row.id).slice(0, 8), host, source: cardFields(row).source,
            http: p.http, fetched: p.fetched, hidden: true, date: 'sale_verify', dateSource: p.dateSource,
            pagePhones: p.phones.length, pageEmails: p.emails.length, hadContact: Boolean(row.direct_phone || row.direct_email),
            hasContact: Boolean(row.direct_phone || row.direct_email), enrich: `skipped_${reason}`, enrichSearches: status.contactSearches,
          });
          continue;
        }
      }
      let dateNote = 'kept';
      if (p.date) {
        const iso = p.date.toISOString();
        if (!hadDate) { status.datesAdded++; dateNote = 'added'; } else if (String(prevRaw.listed_at).slice(0, 10) !== iso.slice(0, 10)) { status.datesChanged++; dateNote = 'changed'; }
        raw.listed_at = iso; raw.listed_at_source = p.dateSource;
      }
      const phones = p.phones.filter((ph) => (phoneUse.get(`${host}|${ph}`) || 0) < 3);
      let phone: string | null = row.direct_phone || null; let email: string | null = row.direct_email || null;
      const evidence: { type: string; value: string; url: string }[] = Array.isArray(row.contact_evidence) ? [...row.contact_evidence] : [];
      const hadContact = Boolean(phone || email);
      if (!phone && phones[0]) { phone = phones[0]; evidence.push({ type: 'phone', value: phones[0], url: String(row.listing_url) }); }
      if (!email && p.emails[0]) { email = p.emails[0]; evidence.push({ type: 'email', value: p.emails[0], url: String(row.listing_url) }); }
      let rec = { direct_phone: phone, direct_email: email, contact_evidence: evidence, contact_status: (row.contact_status || 'platform_only') as 'found' | 'not_found' | 'platform_only', contact_advice: String(row.contact_advice || ''), raw };
      if (phone || email) rec = { ...rec, contact_status: 'found', contact_advice: '' };
      let enrichNote = 'not_needed'; let enrichHit = false;
      if (!phone && !email) {
        if (!deps.enrich) enrichNote = 'web_search_off';
        else {
          const input: EnrichmentInput = {
            listingUrl: String(row.listing_url || ''), propertyName: String(row.property_name || ''), municipality: String(row.municipality || ''), ownerName: row.owner_name || null,
            photoUrls: Array.isArray(row.photo_urls) ? row.photo_urls : [], existingPhones: [], existingEmails: [], platformDomains: deps.platformDomains,
          };
          try {
            const en = await deps.enrich(input);
            rec = applyEnrichmentToRecord(rec, en, rec.contact_advice);
            enrichHit = en.evidence.length > 0; enrichNote = enrichHit ? 'found' : `none:${(en.notes || []).slice(0, 3).join('|')}`;
            if (enrichHit) status.enrichedFound++; status.contactSearches += Number(en.cost?.searches || 0);
          } catch (e) { enrichNote = `error:${String((e as Error)?.message || e).slice(0, 80)}`; }
        }
      }
      if (!hadContact && (rec.direct_phone || rec.direct_email)) status.contactsAdded++;
      rec.raw = { ...rec.raw, recheck: { at: now().toISOString(), http: p.http, fetched: p.fetched, date: dateNote, date_source: p.dateSource, page_phones: p.phones.length, page_emails: p.emails.length, enrich: enrichNote } };
      await deps.update(p.id, rec);
      after.push({ ...row, direct_phone: rec.direct_phone, direct_email: rec.direct_email, raw: rec.raw });
      deps.log('info', 'recheck_refresh_item', {
        index: i, total: parsed.length, id: String(row.id).slice(0, 8), host, source: cardFields(row).source, http: p.http, fetched: p.fetched, hidden: Boolean(row.hidden),
        date: dateNote, dateSource: p.dateSource, pagePhones: p.phones.length, pageEmails: p.emails.length, hadContact, hasContact: Boolean(rec.direct_phone || rec.direct_email), enrich: enrichNote, enrichSearches: status.contactSearches,
      });
    } catch (e) {
      status.errors++;
      deps.log('error', 'recheck_refresh_item_error', { id: String(row.id).slice(0, 8), error: String((e as Error)?.message || e).slice(0, 160) });
      after.push(row);
    }
  }
  status.phase = 'done'; status.running = false; status.finishedAt = Date.now(); status.current = '';
  status.message = `Done: ${status.datesAdded} dates, ${status.contactsAdded} contacts, ${status.unavailableHidden} hidden`;
  deps.log('info', 'recheck_refresh_done', {
    checked: status.checked, datesAdded: status.datesAdded, datesChanged: status.datesChanged, contactsAdded: status.contactsAdded,
    unavailableHidden: status.unavailableHidden, enrichedFound: status.enrichedFound, contactSearches: status.contactSearches,
    unreachable: status.unreachable, errors: status.errors, ms: Date.now() - t0,
    completenessBefore: before, completenessAfter: completenessSummary(after),
  });
}
