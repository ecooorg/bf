/**
 * C131 WP3 owner stage — private-vs-agency evidence, contact routes, owner key.
 * Pure functions over page text + config. No network. Used by the source-first live pipeline.
 */

export type ContactRoute = 'direct' | 'platform_message' | 'none';

export interface OwnerEvidence {
  isPrivateOwner: boolean;
  markers: string[];
  contactRoute: ContactRoute;
  phone: string | null;
  email: string | null;
  ownerKey: string | null;
  ownerName: string | null;
  platformFormPresent: boolean;
}

const PRIVATE_MARKERS = [
  /von\s+privat/i,
  /privatperson/i,
  /private\s+owner/i,
  /propriétaire\s+particulier/i,
  /privato/i,
  /direkt\s+vom\s+eigentümer/i,
  /ohne\s+makler/i,
];

const PHONE_RE = /(?:\+|00)?(?:41|43|49)?[\s.\/-]*(?:\d[\s.\/-]*){9,12}/g;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PLATFORM_FORM_RE = /(?:kontaktformular|nachricht\s+senden|send\s+message|contact\s+form|écrire\s+un\s+message|unverbindlich\s+anfragen|kontaktdaten\s+anzeigen)/i;

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 13) return null;
  // Reject common page placeholders and sequential demo numbers before treating them as owner contact.
  if (/(?:1234567890|9876543210|0123456789|000000|111111|999999)/.test(digits)) return null;
  const validSwiss = /^(?:0\d{9}|41\d{9}|0041\d{9})$/.test(digits);
  const validNeighbour = /^(?:43|49)\d{8,12}$/.test(digits) || /^004(?:3|9)\d{8,12}$/.test(digits);
  if (!validSwiss && !validNeighbour) return null;
  return digits;
}

function isPlausibleEmail(e: string): boolean {
  if (!e || e.length > 80) return false;
  if (/@(example|test|domain|email)\./i.test(e)) return false;
  if (/noreply|no-reply|support@|info@portal|admin@/i.test(e)) return false;
  return true;
}

export function extractOwnerEvidence(
  title: string,
  pageText: string,
  stopAgencies: string[],
  sourceId?: string,
): OwnerEvidence {
  const text = `${title}\n${pageText}`;
  const markers: string[] = [];
  for (const re of PRIVATE_MARKERS) {
    const m = text.match(re);
    if (m) markers.push(m[0]);
  }

  const agencyHit = stopAgencies.some((a) => text.toLowerCase().includes(a.toLowerCase()));
  const isPrivateOwner = markers.length > 0 && !agencyHit;

  let phone: string | null = null;
  const phones = text.match(PHONE_RE) || [];
  for (const p of phones) {
    const n = normalizePhone(p);
    if (n) {
      phone = n;
      break;
    }
  }

  let email: string | null = null;
  const emails = text.match(EMAIL_RE) || [];
  for (const e of emails) {
    if (isPlausibleEmail(e)) {
      email = e.toLowerCase();
      break;
    }
  }

  const platformFormPresent = PLATFORM_FORM_RE.test(text);

  let contactRoute: ContactRoute = 'none';
  if (phone || email) contactRoute = 'direct';
  else if (platformFormPresent) contactRoute = 'platform_message';

  const ownerNameMatch = /\b(?:Herr|Frau|Familie|Eheleute)\s+[A-ZÄÖÜ][\p{L}\p{M}.'’-]+(?:\s+[A-ZÄÖÜ][\p{L}\p{M}.'’-]+){0,2}/u.exec(text)?.[0] || null;
  const ownerName = ownerNameMatch?.replace(/\s+Kontaktdaten\b.*$/i, '') || null;

  let ownerKey: string | null = null;
  if (phone) ownerKey = `phone:${phone}`;
  else if (email) ownerKey = `email:${email}`;
  else if (isPrivateOwner && sourceId) ownerKey = `src:${sourceId}:${title.slice(0, 40).toLowerCase().replace(/\s+/g, '_')}`;

  return {
    isPrivateOwner,
    markers,
    contactRoute,
    phone,
    email,
    ownerKey,
    ownerName,
    platformFormPresent,
  };
}

export function promoteLevel(
  currentLevel: 'L0' | 'L1' | 'L2' | 'L3',
  owner: OwnerEvidence,
): 'L0' | 'L1' | 'L2' | 'L3' {
  if (currentLevel !== 'L1') return currentLevel;
  if (owner.isPrivateOwner && owner.contactRoute !== 'none') return 'L2';
  return 'L1';
}
