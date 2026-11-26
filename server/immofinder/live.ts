/**
 * C131 source-first live ImmoFinder runtime.
 *
 * Uses a small rotating Serper budget for supported Swiss portals and up to three
 * Gemini quote reviews for borderline owner evidence. Snippets never become evidence:
 * every admitted record still comes from a fetched detail page and deterministic gates.
 */

import { processSnapshot } from './pipeline.ts';
import { promoteLevel } from './owner.ts';
import { communesForRun, pickItems } from '../immofinderDiscovery.ts';
import { happyholidayAdapter } from './sources/happyholiday.ts';
import { ferienhausmieteAdapter } from './sources/ferienhausmiete.ts';
import { createSwissClassifiedAdapter } from './sources/swiss-classified.ts';
import type { PipelineDeps, ListingRecord, RunResult, ProgressEvent, SourceStats } from '../immofinderPipeline.ts';
import { buildEvidenceText, classifyType, resolveListingPrice, type ListingType } from '../immofinderCore.ts';
import { candidateIsTarget, candidateScore, detailFetchBadWeight, shouldBlockSourceAfterDetail, normalizeSlug } from './liveFilters.ts';

const MAX_INDEX_PAGES_PER_SOURCE = 6;
const MAX_DETAILS_PER_SOURCE = 12;
const MAX_TOTAL_DETAILS = 48;
const MAX_RUN_MS = 240_000;
const SEEN_TTL_MS = 2 * 60 * 60 * 1000; // 2h: re-try portal URLs after zero-kept runs
