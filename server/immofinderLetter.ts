import { draftMessage, matchMunicipality, parseRooms, type ListingType } from './immofinderCore.ts';

export type C131ResultType = 'tourist_owner' | 'direct_offer';
export type C131ContactRoute = 'direct' | 'platform_message' | 'none';
export type C131LetterEvidence = { type: string; value: string; url: string };

export interface C131LetterInput {
  resultType: C131ResultType;
  listingUrl: string;
  finalUrl: string | null | undefined;
  title: string;
  pageText: string;
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
  | { ready: true; draft: string; verifiedAt: string; evidence: Array<{ field: string; value: string; quote: string; sourceUrl: string; fetchedAt: string }> }
  | { ready: false; reason: string };

const PRIVATE_OWNER = /\b(von privat|privatvermietung|privater vermieter|privatperson|direkt vom eigent[uü]mer|direkt vom vermieter|private owner|private landlord)\b/i;
const PLATFORM_ACTIONS = [
  'inserent kontaktieren', 'anbieter kontaktieren', 'kontakt aufnehmen', 'kontaktformular',
  'nachricht senden', 'nachricht schreiben', 'kontaktieren', 'contact owner', 'contact advertiser',
  'send message', 'message host', 'contacter le propriétaire', 'contacter l’annonceur',
  'contatta il proprietario', 'scrivi al venditore',
];

export function hasPageContactAction(pageText: string): boolean {
  const text = String(pageText || '').toLocaleLowerCase().replace(/\s+/g, ' ');
  return PLATFORM_ACTIONS.some((marker) => text.includes(marker));
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
  if (!ownerQuote || !text.includes(ownerQuote) || !PRIVATE_OWNER.test(ownerQuote)) return fail('private_owner_evidence_missing');

  if (input.contactRoute === 'none') return fail('contact_route_missing');
  if (input.contactRoute === 'platform_message' && !hasPageContactAction(text)) return fail('platform_action_not_page_evidenced');

  const evidence = [
    { field: 'owner', value: ownerQuote, quote: ownerQuote, sourceUrl: input.finalUrl, fetchedAt: fetchedAt.toISOString() },
    { field: 'municipality', value: pageMunicipality, quote: pageMunicipality, sourceUrl: input.finalUrl, fetchedAt: fetchedAt.toISOString() },
    { field: 'rooms', value: pageRooms.rooms, quote: pageRooms.quote, sourceUrl: input.finalUrl, fetchedAt: fetchedAt.toISOString() },
  ];
  if (input.contactRoute === 'direct') {
    const direct = input.contactEvidence.find((item) => {
      if (!item.value || !text.includes(item.value)) return false;
      try {
        const a = new URL(item.url); const b = new URL(input.finalUrl!);
        return a.origin === b.origin && a.pathname === b.pathname;
      } catch { return false; }
    });
    if (!direct) return fail('direct_contact_not_page_grounded');
    evidence.push({ field: 'contact', value: direct.value, quote: direct.value, sourceUrl: input.finalUrl, fetchedAt: fetchedAt.toISOString() });
  }

  const propertyName = input.propertyName && (text.includes(input.propertyName) || input.title.includes(input.propertyName))
    ? input.propertyName : '';
  const ownerName = input.ownerName && (text.includes(input.ownerName) || input.title.includes(input.ownerName))
    ? input.ownerName : null;
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
