/** Run/search time budgets for source-first live pipeline. */
export const MAX_INDEX_PAGES_PER_SOURCE = 6;
export const MAX_DETAILS_PER_SOURCE = 12;
export const MAX_TOTAL_DETAILS = 48;
export const MAX_RUN_MS = 360_000; // 6 min: serper resolve is slow (~15s/query)
export const SERPER_BUDGET_MS = 150_000; // hard stop discovery so direct sources still run
export const SEEN_TTL_MS = 2 * 60 * 60 * 1000; // 2h
