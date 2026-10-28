import pkg from '../package.json' with { type: 'json' };

/** Feature flags */
export const FEATURES = {
  voice: false,
  pwaInstall: false,
  offlineIndicator: false,
};

/** DRV-02: minimum time between two autosave writes to Drive (ms). Override with VITE_AUTOSAVE_MIN_INTERVAL_MS. */
const envInterval = Number((import.meta as any).env?.VITE_AUTOSAVE_MIN_INTERVAL_MS);
export const AUTOSAVE_MIN_INTERVAL_MS = Number.isFinite(envInterval) && envInterval >= 0 && (import.meta as any).env?.VITE_AUTOSAVE_MIN_INTERVAL_MS ? envInterval : 30000;

/** Single source of truth: package.json "version" (program) and "patch" (last applied patch). Never define either elsewhere. */
export const APP_VERSION: string = String(pkg.version);
export const APP_PATCH: string = String(pkg.patch);
/** classic | builder — this tree is pipeline-first (IR → scaffold → ZIP). */
export const PRODUCT_LINE = 'builder';
export const SCHEMA_VERSION = 11;
