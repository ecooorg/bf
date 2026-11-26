/**
 * C131 engine surface. The production search route enters through live.ts; legacy server/immofinder*.ts
 * modules remain for shared storage, routes, repair, delivery and compatibility until WP5 retirement.
 */

export * from './taxonomy.ts';
export * from './classify.ts';
export * from './access.ts';
export * from './owner.ts';
export * from './run.ts';
export {
  happyholidayAdapter,
  discover as happyholidayDiscover,
  extract as happyholidayExtract,
} from './sources/happyholiday.ts';
export {
  ferienhausmieteAdapter,
  discover as ferienhausmieteDiscover,
  extract as ferienhausmieteExtract,
} from './sources/ferienhausmiete.ts';
export { processSnapshot, replaySnapshots } from './pipeline.ts';
export { dryRunBatch } from './dryRun.ts';
export type { DryRunItem, DryRunReport, DryRunRow } from './dryRun.ts';
