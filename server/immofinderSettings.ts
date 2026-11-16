import type { ImmoConfig } from './immofinderCore.ts';

export const SOURCE_IDS = ['happyholiday', 'ferienhausmiete', 'graubuenden', 'search'] as const;
export const TIMEZONE = 'Europe/Zurich';

export interface ImmoSettings {
  schedule: { mode: 'manual' | 'hours' | 'daily'; everyHours: 3 | 6 | 12; dailyAt: string };
  delivery: { telegram: boolean; email: boolean; emailTo: string; emailContent: 'new' | 'all'; drive: boolean; driveFolderId: string; notifyWhenEmpty: boolean };
  search: { minRooms: number; communes: string[]; sources: Record<string, boolean>; maxAiPages: number };
}

export function defaultSettings(cfg: ImmoConfig): ImmoSettings {
  return {
    schedule: { mode: 'manual', everyHours: 3, dailyAt: '06:00' },
    delivery: { telegram: true, email: false, emailTo: '', emailContent: 'new', drive: true, driveFolderId: '', notifyWhenEmpty: false },
    search: { minRooms: cfg.minRooms, communes: [...cfg.municipalities], sources: Object.fromEntries(SOURCE_IDS.map((s) => [s, true])), maxAiPages: 60 },
  };
}

const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

/** Accepts a Drive folder URL or a bare ID; returns the ID or ''. */
export function parseDriveFolderId(v: unknown): string {
  const s = String(v ?? '').trim(); const m = /\/folders\/([\w-]{20,})/.exec(s) || /^([\w-]{20,})$/.exec(s);
  return m ? m[1] : '';
}

/** "16.11.2026, 03:07" in Swiss time. */
export function formatZurich(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d; if (Number.isNaN(x.getTime())) return '';
  return new Intl.DateTimeFormat('de-CH', { timeZone: TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(x);
}

/** Validates untrusted input; anything invalid falls back to the default for that field. */
export function sanitizeSettings(input: any, cfg: ImmoConfig): ImmoSettings {
  const d = defaultSettings(cfg); const i = input && typeof input === 'object' ? input : {};
  const s = i.schedule ?? {}; const dl = i.delivery ?? {}; const se = i.search ?? {};
  const mode = ['manual', 'hours', 'daily'].includes(s.mode) ? s.mode : d.schedule.mode;
  const everyHours = [3, 6, 12].includes(Number(s.everyHours)) ? (Number(s.everyHours) as 3 | 6 | 12) : d.schedule.everyHours;
  const dailyAt = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s.dailyAt ?? '')) ? String(s.dailyAt) : d.schedule.dailyAt;
  const emailTo = typeof dl.emailTo === 'string' && /^[^\s@,;]{1,64}@[^\s@,;]{1,120}\.[^\s@,;]{2,}$/.test(dl.emailTo.trim()) ? dl.emailTo.trim().slice(0, 190) : '';
  const communes = Array.isArray(se.communes) ? cfg.municipalities.filter((m) => se.communes.includes(m)) : d.search.communes;
  const minRooms = Number.isInteger(Number(se.minRooms)) && Number(se.minRooms) >= 1 && Number(se.minRooms) <= 8 ? Number(se.minRooms) : d.search.minRooms;
  const maxAiPages = [20, 40, 60, 100, 200].includes(Number(se.maxAiPages)) ? Number(se.maxAiPages) : d.search.maxAiPages;
  const sources = Object.fromEntries(SOURCE_IDS.map((id) => [id, bool(se.sources?.[id], true)]));
  return {
    schedule: { mode, everyHours, dailyAt },
    delivery: { telegram: bool(dl.telegram, d.delivery.telegram), email: bool(dl.email, false) && Boolean(emailTo), emailTo, emailContent: dl.emailContent === 'all' ? 'all' : 'new', drive: bool(dl.drive, d.delivery.drive), driveFolderId: parseDriveFolderId(dl.driveFolderId), notifyWhenEmpty: bool(dl.notifyWhenEmpty, false) },
    search: { minRooms, communes: communes.length ? communes : d.search.communes, sources, maxAiPages },
  };
}

/** Effective config for one run: user's scope applied over the base config. */
export function applySettings(cfg: ImmoConfig, s: ImmoSettings): ImmoConfig {
  return {
    ...cfg, minRooms: s.search.minRooms, municipalities: cfg.municipalities.filter((m) => s.search.communes.includes(m)),
    sources: cfg.sources.filter((src) => src.phase !== 1 || s.search.sources[src.id] !== false),
    discovery: cfg.discovery ? { ...cfg.discovery, enabled: cfg.discovery.enabled && s.search.sources.search !== false } : cfg.discovery,
  };
}

/** Local date (YYYY-MM-DD) and minutes since midnight in Switzerland. */
export function zurichParts(d: Date): { date: string; minutes: number } {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/** The hourly cron tick asks this; manual mode is never due. */
export function isDue(schedule: ImmoSettings['schedule'], lastRun: Date | null, now: Date): boolean {
  if (schedule.mode === 'manual') return false;
  if (schedule.mode === 'hours') return !lastRun || now.getTime() - lastRun.getTime() >= (schedule.everyHours * 60 - 20) * 60000;
  const [h, m] = schedule.dailyAt.split(':').map(Number); const at = h * 60 + m;
  const n = zurichParts(now); if (n.minutes < at) return false;
  if (!lastRun) return true;
  const l = zurichParts(lastRun);
  return l.date < n.date || (l.date === n.date && l.minutes < at);
}
