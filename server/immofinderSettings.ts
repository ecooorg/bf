import type { ImmoConfig } from './immofinderCore.ts';
import { DEFAULT_QUALITY, type QualitySettings } from './immofinderCore.ts';

export const SOURCE_IDS = [
  'search',
  'portal-immoscout24',
  'portal-homegate',
  'portal-newhome',
  'portal-flatfox',
  'portal-tutti',
  'portal-anibis',
  'portal-petitesannonces',
  'portal-immobilier',
  'portal-acheter-louer',
  'portal-immostreet',
  'portal-home',
  'portal-icasa',
  'portal-urbanhome',
] as const;
export const TIMEZONE = 'Europe/Zurich';

export interface ImmoSettings {
  schedule: { mode: 'manual' | 'hours' | 'daily'; everyHours: 1 | 3 | 6 | 12; dailyAt: string };
  delivery: { telegram: boolean; email: boolean; emailTo: string; emailContent: 'new' | 'all'; drive: boolean; driveFolderId: string; notifyWhenEmpty: boolean };
  search: {
    minRooms: number;
    communes: string[];
    /** Which of the two 22-commune groups participate in search. */
    municipalityGroups: { group1: boolean; group2: boolean };
    sources: Record<string, boolean>;
    maxAiPages: number;
    /** When false, maxMonthlyRentChf is ignored (no price cap). */
    limitPrice: boolean;
    maxMonthlyRentChf: number;
    maxListingAgeDays: number;
    requirePrice: boolean;
    rejectNonMonthly: boolean;
    rejectSeekerPosts: boolean;
    requireContact: boolean;
    /** Legacy default-wave field retained for persisted settings compatibility. */
    defaultWave: 'carousel' | 'full';
    /** carousel = rotating commune slice; burst = all selected communes in one run. */
    profile: 'carousel' | 'burst';
    carouselCommunesPerRun: number;
    /** How many of the private-search templates run per commune (first N; 1..4). */
    privateQueryTemplates: number;
    /** Extra public contact searches per search run (0 = off). */
    enrichSearchesPerRun: number;
    /** Allow contact searches during Recheck list (they rarely add contacts). */
    recheckContactSearch: boolean;
  };
}

export function defaultSettings(cfg: ImmoConfig): ImmoSettings {
  const q = { ...DEFAULT_QUALITY, ...(cfg.quality || {}) };
  return {
    schedule: { mode: 'manual', everyHours: 3, dailyAt: '06:00' },
    delivery: { telegram: false, email: false, emailTo: '', emailContent: 'new', drive: false, driveFolderId: '', notifyWhenEmpty: false },
    search: {
      minRooms: 2,
      communes: [...cfg.municipalities],
      municipalityGroups: { group1: true, group2: true },
      sources: Object.fromEntries([
        ...SOURCE_IDS.map((s) => [s, false] as const),
        ...(cfg.sources || []).map((src) => [src.id, ['happyholiday', 'ferienhausmiete'].includes(src.id)] as const),
      ]),
      maxAiPages: 40,
      limitPrice: false,
      maxMonthlyRentChf: Math.max(q.maxMonthlyRentChf || 2000, 2000),
      maxListingAgeDays: 0,
      requirePrice: false,
      rejectNonMonthly: false,
      rejectSeekerPosts: true,
      requireContact: false,
      defaultWave: 'full',
      profile: 'burst',
      carouselCommunesPerRun: cfg.municipalities.length,
      privateQueryTemplates: 2,
      enrichSearchesPerRun: 0,
      recheckContactSearch: false,
    },
  };

}

/** Fixed, secret-triggered profile for an owner-requested Chur-only dry-run. */
export function churTestSettings(cfg: ImmoConfig): ImmoSettings {
  const d = defaultSettings(cfg);
  return sanitizeSettings({
    ...d,
    schedule: { ...d.schedule, mode: 'manual' },
    delivery: { ...d.delivery, telegram: false, email: false, emailTo: '', emailContent: 'new', drive: false, driveFolderId: '', notifyWhenEmpty: false },
    search: {
      ...d.search,
      minRooms: 3,
      communes: ['Chur'],
      municipalityGroups: { group1: true, group2: false },
      sources: Object.fromEntries(Object.keys(d.search.sources).map((id) => [id, true])),
      maxAiPages: 200,
      limitPrice: false,
      maxListingAgeDays: 0,
      requirePrice: false,
      rejectNonMonthly: false,
      rejectSeekerPosts: true,
      requireContact: false,
      defaultWave: 'full',
      profile: 'burst',
      carouselCommunesPerRun: 12,
      privateQueryTemplates: 4,
      enrichSearchesPerRun: 0,
      recheckContactSearch: false,
    },
  }, cfg);
}

const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

export function parseDriveFolderId(v: unknown): string {
  const s = String(v ?? '').trim(); const m = /\/folders\/([\w-]{20,})/.exec(s) || /^([\w-]{20,})$/.exec(s);
  return m ? m[1] : '';
}

export function formatZurich(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d; if (Number.isNaN(x.getTime())) return '';
  return new Intl.DateTimeFormat('de-CH', { timeZone: TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(x);
}

function clampInt(v: unknown, min: number, max: number, d: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : d;
}

export function sanitizeSettings(input: any, cfg: ImmoConfig): ImmoSettings {
  const d = defaultSettings(cfg); const i = input && typeof input === 'object' ? input : {};
  const s = i.schedule ?? {}; const dl = i.delivery ?? {}; const se = i.search ?? {};
  const mode = ['manual', 'hours', 'daily'].includes(s.mode) ? s.mode : d.schedule.mode;
  const everyHours = [1, 3, 6, 12].includes(Number(s.everyHours)) ? (Number(s.everyHours) as 1 | 3 | 6 | 12) : d.schedule.everyHours;
  const dailyAt = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s.dailyAt ?? '')) ? String(s.dailyAt) : d.schedule.dailyAt;
  const emailTo = typeof dl.emailTo === 'string' && /^[^\s@,;]{1,64}@[^\s@,;]{1,120}\.[^\s@,;]{2,}$/.test(dl.emailTo.trim()) ? dl.emailTo.trim().slice(0, 190) : '';
  const communes = Array.isArray(se.communes) ? cfg.municipalities.filter((m) => se.communes.includes(m)) : d.search.communes;
  const minRooms = Number.isInteger(Number(se.minRooms)) && Number(se.minRooms) >= 1 && Number(se.minRooms) <= 8 ? Number(se.minRooms) : d.search.minRooms;
  const maxAiPages = [20, 40, 60, 100, 200].includes(Number(se.maxAiPages)) ? Number(se.maxAiPages) : d.search.maxAiPages;
  const srcIn = (se.sources || {}) as Record<string, unknown>;
  const catalogueIds = (cfg.sources || []).map((s) => s.id);
  const allIds = Array.from(new Set<string>([...SOURCE_IDS, ...catalogueIds, ...Object.keys(srcIn)]));
  const sources: Record<string, boolean> = {};
  for (const id of allIds) {
    const defaultEnabled = d.search.sources[id] ?? false;
    sources[id] = Object.prototype.hasOwnProperty.call(srcIn, id) ? bool(srcIn[id], defaultEnabled) : defaultEnabled;
  }
  // Legacy master toggle: swiss-portals on/off → every portal-* source
  if (Object.prototype.hasOwnProperty.call(srcIn, 'swiss-portals')) {
    const on = bool(srcIn['swiss-portals'], true);
    for (const id of SOURCE_IDS) if (id.startsWith('portal-')) sources[id] = on;
  }
  // Legacy: search false used to mean all discovery off
  if (srcIn.search === false && !Object.keys(srcIn).some((k) => k.startsWith('portal-'))) {
    for (const id of SOURCE_IDS) if (id.startsWith('portal-')) sources[id] = false;
  }
  const mgIn = (se.municipalityGroups || {}) as Record<string, unknown>;
  const municipalityGroups = {
    group1: bool(mgIn.group1, true),
    group2: bool(mgIn.group2, true),
  };
  // If neither group is checked, fall back to both (never empty search set by accident)
  if (!municipalityGroups.group1 && !municipalityGroups.group2) {
    municipalityGroups.group1 = true;
    municipalityGroups.group2 = true;
  }
  return {
    schedule: { mode, everyHours, dailyAt },
    delivery: { telegram: bool(dl.telegram, d.delivery.telegram), email: bool(dl.email, false) && Boolean(emailTo), emailTo, emailContent: dl.emailContent === 'all' ? 'all' : 'new', drive: bool(dl.drive, d.delivery.drive), driveFolderId: parseDriveFolderId(dl.driveFolderId), notifyWhenEmpty: bool(dl.notifyWhenEmpty, false) },
    search: {
      minRooms,
      communes: communes.length ? communes : d.search.communes,
      municipalityGroups,
      sources,
      maxAiPages,
      limitPrice: bool(se.limitPrice, d.search.limitPrice),
      maxMonthlyRentChf: clampInt(se.maxMonthlyRentChf, 200, 10000, d.search.maxMonthlyRentChf),
      maxListingAgeDays: clampInt(se.maxListingAgeDays, 0, 3650, d.search.maxListingAgeDays),
      // Unknown portal prices are common; keep the listing and show price as unverified.
      requirePrice: bool(se.requirePrice, d.search.requirePrice),
      rejectNonMonthly: bool(se.rejectNonMonthly, d.search.rejectNonMonthly),
      rejectSeekerPosts: bool(se.rejectSeekerPosts, d.search.rejectSeekerPosts),
      requireContact: bool(se.requireContact, d.search.requireContact),
      defaultWave: se.defaultWave === 'carousel' ? 'carousel' : 'full',
      profile: se.profile === 'carousel' ? 'carousel' : 'burst',
      carouselCommunesPerRun: clampInt(se.carouselCommunesPerRun, 4, Math.max(12, d.search.carouselCommunesPerRun), d.search.carouselCommunesPerRun),
      privateQueryTemplates: clampInt(se.privateQueryTemplates, 1, 4, d.search.privateQueryTemplates),
      enrichSearchesPerRun: clampInt(se.enrichSearchesPerRun, 0, 35, d.search.enrichSearchesPerRun),
      recheckContactSearch: bool(se.recheckContactSearch, d.search.recheckContactSearch),
    },
  };
}

export function applySettings(cfg: ImmoConfig, s: ImmoSettings): ImmoConfig {
  const wantPrivate = s.search.sources.search !== false;
  const portalMeta = (cfg.discovery as any)?.portalSources as { id: string; host: string }[] | undefined;
  const enabledPortalHosts = new Set<string>();
  if (portalMeta?.length) {
    for (const p of portalMeta) {
      if (s.search.sources[p.id] !== false) enabledPortalHosts.add(p.host.replace(/^www\./, ''));
    }
  } else {
    // Fallback: any portal-* true → keep all portalQueries
    for (const [id, on] of Object.entries(s.search.sources)) {
      if (id.startsWith('portal-') && on !== false) enabledPortalHosts.add('*');
    }
  }
  const filterPortalQueries = (qs: string[]) => {
    if (!qs.length) return [];
    if (enabledPortalHosts.has('*')) return qs;
    if (!enabledPortalHosts.size) return [];
    return qs.filter((q) => {
      const m = /site:([a-z0-9.-]+)/i.exec(q);
      if (!m) return true;
      const host = m[1].replace(/^www\./, '');
      return [...enabledPortalHosts].some((h) => host === h || host.endsWith('.' + h) || h.endsWith('.' + host));
    });
  };
  const portalQueries = filterPortalQueries(cfg.discovery?.portalQueries || []);
  const wantPortals = portalQueries.length > 0;
  // Municipalities: intersection of chip selection and enabled groups
  const groups = (cfg as any).municipalityGroups as { group1?: { municipalities: string[] }; group2?: { municipalities: string[] } } | undefined;
  const allowed = new Set<string>();
  if (groups) {
    if (s.search.municipalityGroups?.group1 !== false) (groups.group1?.municipalities || []).forEach((m) => allowed.add(m));
    if (s.search.municipalityGroups?.group2 !== false) (groups.group2?.municipalities || []).forEach((m) => allowed.add(m));
  } else {
    cfg.municipalities.forEach((m) => allowed.add(m));
  }
  const municipalities = cfg.municipalities.filter((m) => s.search.communes.includes(m) && allowed.has(m));
  const discovery = cfg.discovery
    ? {
        ...cfg.discovery,
        enabled: cfg.discovery.enabled && (wantPrivate || wantPortals),
        communesPerRun:
          s.search.profile === 'carousel'
            ? s.search.carouselCommunesPerRun
            : Math.max(cfg.discovery.communesPerRun, municipalities.length > 0 ? municipalities.length : cfg.discovery.communesPerRun),
        queries: wantPrivate ? (cfg.discovery.queries || []).slice(0, s.search.privateQueryTemplates) : [],
        portalQueries,
        // R9: never widen into unmeasured sources as an automatic fallback.
        fallbackPortalQueries: portalQueries,
      }
    : cfg.discovery;
  return {
    ...cfg,
    minRooms: s.search.minRooms,
    municipalities: municipalities.length ? municipalities : cfg.municipalities.filter((m) => allowed.has(m)),
    sources: cfg.sources.filter((src) => s.search.sources[src.id] !== false),
    discovery,
    contactEnrichment: cfg.contactEnrichment ? { ...cfg.contactEnrichment, maxExtraSearchesPerRun: s.search.enrichSearchesPerRun } : cfg.contactEnrichment,
    quality: {
      maxMonthlyRentChf: s.search.limitPrice ? s.search.maxMonthlyRentChf : 0,
      maxListingAgeDays: s.search.maxListingAgeDays,
      requirePrice: s.search.requirePrice,
      rejectNonMonthly: s.search.rejectNonMonthly,
      rejectSeekerPosts: s.search.rejectSeekerPosts,
      requireContact: s.search.requireContact,
    },
  };
}

export function zurichParts(d: Date): { date: string; minutes: number } {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

export function isDue(schedule: ImmoSettings['schedule'], lastRun: Date | null, now: Date): boolean {
  if (schedule.mode === 'manual') return false;
  if (schedule.mode === 'hours') return !lastRun || now.getTime() - lastRun.getTime() >= (schedule.everyHours * 60 - 20) * 60000;
  const { date, minutes } = zurichParts(now);
  const [hh, mm] = schedule.dailyAt.split(':').map(Number);
  const target = hh * 60 + mm;
  if (minutes < target || minutes >= target + 70) return false;
  if (!lastRun) return true;
  return zurichParts(lastRun).date !== date;
}
