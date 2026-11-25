import { draftMessage, isPlausibleEmail, isPlausibleSwissPhone, matchMunicipality, normPhone, parseRooms, type ListingType } from './immofinderCore.ts';

export type C131ResultType = 'tourist_owner' | 'direct_offer';
export type C131ContactRoute = 'direct' | 'platform_message' | 'none';
export type C131LetterEvidence = { type: string; value: string; url: string };

export interface C131LetterInput {
  resultType: C131ResultType;
  listingUrl: string;
  finalUrl: string | null | undefined;
  title: string;
  pageText: string;
  pageHtml: string;
  municipalities: string[];
  municipality: string;
  propertyName: string;
  rooms: number | null;
  ownerName: string | null;
  ownerEvidenceQuote: string | null;
  contactRoute: C131ContactRoute;
  contactEvidence: C131LetterEvidence[];
  fetchedAt: string;
}

export type C131LetterResult =
  | { ready: true; draft: string; verifiedAt: string; evidence: Array<{ field: string; value: string | number; quote: string; sourceUrl: string; fetchedAt: string }> }
  | { ready: false; reason: string };

const PRIVATE_OWNER = /\b(von privat|privatvermietung|privater vermieter|privatperson|direkt vom eigent[uü]mer|direkt vom vermieter|private owner|private landlord)\b/i;
export function hasPageContactAction(pageHtml: string): boolean {
  const html = String(pageHtml || '');
  const forms = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/gi) || [];
  return forms.some((form) => /<textarea\b/i.test(form) && /<button\b|<input\b[^>]*type=["']?submit/i.test(form));
}

/** Build L3 only from a single fetched page and a page-evidenced owner/contact route. */
export function buildC131LetterDraft(input: C131LetterInput): C131LetterResult {
  const fail = (reason: string): C131LetterResult => ({ ready: false, reason });
  const text = String(input.pageText || '');
  if (text.trim().length < 120) return fail('page_evidence_missing');
  if (!input.finalUrl) return fail('final_url_missing');
  try {
    const requested = new URL(input.listingUrl);
    const final = new URL(input.finalUrl);
    if (requested.origin !== final.origin || requested.pathname !== final.pathname) return fail('listing_url_mismatch');
  } catch { return fail('listing_url_invalid'); }

  const fetchedAt = new Date(input.fetchedAt);
  if (!Number.isFinite(fetchedAt.getTime())) return fail('fetch_time_missing');
  const pageMunicipality = matchMunicipality(input.title + '\n' + text, input.municipalities);
  if (!pageMunicipality || pageMunicipality !== input.municipality) return fail('locality_not_page_grounded');

  const pageRooms = parseRooms(input.title + '\n' + text);
  if (!pageRooms || pageRooms.basis !== 'zimmer' || pageRooms.rooms < 3 ||
      input.rooms == null || Math.abs(pageRooms.rooms - input.rooms) > 0.01) return fail('rooms_not_page_grounded');

  const ownerQuote = String(input.ownerEvidenceQuote || '').trim();
  if (!ownerQuote || !(text.includes(ownerQuote) || String(input.title || '').includes(ownerQuote)) || !PRIVATE_OWNER.test(ownerQuote)) return fail('private_owner_evidence_missing');

  if (input.contactRoute === 'none') return fail('contact_route_missing');
  if (input.contactRoute === 'platform_message' && !hasPageContactAction(input.pageHtml)) return fail('platform_action_not_page_evidenced');

  const roomQuote = /(?:\d{1,2}(?:[.,]\d)?\s*(?:[- ]?Zimmer|Zi\.?|rooms?|pi[eè]ces?)|(?:Zimmer|rooms?|pi[eè]ces?)\s*[:=]?\s*\d{1,2}(?:[.,]\d)?)/i.exec(input.title + '\n' + text)?.[0] || String(pageRooms.rooms);
  const evidence: Array<{ field: string; value: string | number; quote: string; sourceUrl: string; fetchedAt: string }> = [
    { field: 'owner', value: ownerQuote, quote: ownerQuote, sourceUrl: input.finalUrl, fetchedAt: fetchedAt.toISOString() },
    { field: 'municipality', value: pageMunicipality, quote: pageMunicipality, sourceUrl: input.finalUrl, fetchedAt: fetchedAt.toISOString() },
    { field: 'rooms', value: pageRooms.rooms, quote: roomQuote, sourceUrl: input.finalUrl, fetchedAt: fetchedAt.toISOString() },
  ];
  if (input.contactRoute === 'direct') {
    const direct = input.contactEvidence.find((item) => {
      try {
        const a = new URL(item.url); const b = new URL(input.finalUrl!);
        if (a.origin !== b.origin || a.pathname !== b.pathname) return false;
      } catch { return false; }
      if (item.type === 'email') return isPlausibleEmail(item.value) && text.toLowerCase().includes(item.value.toLowerCase());
      if (item.type === 'phone') {
        if (!isPlausibleSwissPhone(item.value)) return false;
        const digits = normPhone(item.value).replace(/\D/g, '').slice(-9);
        return digits.length === 9 && new RegExp(digits.split('').join('\\D*')).test(text);
      }
      return false;
    });
    if (!direct) return fail('direct_contact_not_page_grounded');
    let contactQuote = direct.value;
    if (direct.type === 'phone') {
      const digits = normPhone(direct.value).replace(/\D/g, '').slice(-9);
      contactQuote = new RegExp(digits.split('').join('\\D*')).exec(text)?.[0] || direct.value;
    }
    evidence.push({ field: 'contact', value: direct.value, quote: contactQuote, sourceUrl: input.finalUrl, fetchedAt: fetchedAt.toISOString() });
  }

  const propertyName = input.propertyName && (text.includes(input.propertyName) || input.title.includes(input.propertyName))
    ? input.propertyName : '';
  const ownerName = input.ownerName && (text.includes(input.ownerName) || input.title.includes(input.ownerName))
    ? input.ownerName : null;
  if (ownerName) evidence.push({ field: 'owner_name', value: ownerName, quote: ownerName, sourceUrl: input.finalUrl, fetchedAt: fetchedAt.toISOString() });
  const listingType: ListingType = input.resultType === 'direct_offer' ? 'long_term_offer' : 'holiday_owner';
  const draft = draftMessage({
    ownerName,
    propertyName,
    municipality: pageMunicipality,
    type: listingType,
    rooms: pageRooms.rooms,
  });
  if (!draft.includes(pageMunicipality) || !draft.includes('drei Jahren')) return fail('draft_contract_invalid');
  if (propertyName && !draft.includes(propertyName)) return fail('property_name_not_grounded');
  if (/festes Einkommen|Betreibungsregister|Privathaftpflicht|\bCHF\s*[\d'’.,]+|\+41\s*\d/i.test(draft)) return fail('unsupported_personal_or_price_claim');
  return { ready: true, draft, verifiedAt: new Date().toISOString(), evidence };
}
