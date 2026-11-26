/**
 * C131 target engine surface (WP3). Additive; legacy server/immofinder*.ts remains the runtime
 * until WP5 switches entry points and deletes the old modules.
 */

export * from './taxonomy.ts';
export * from './classify.ts';
export * from './access.ts';
export * from './owner.ts';
export * from './run.ts';
export { happyholidayAdapter, discover as happyholidayDiscover, extract as happyholidayExtract } from './sources/happyholiday.ts';
