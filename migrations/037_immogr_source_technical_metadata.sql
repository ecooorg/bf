-- Remove legacy source permission metadata and normalize stored retrieval outcomes.
ALTER TABLE immogr_sources DROP CONSTRAINT IF EXISTS immogr_sources_status_check;
ALTER TABLE immogr_sources DROP COLUMN IF EXISTS status;

ALTER TABLE immogr_sources DROP COLUMN IF EXISTS terms_url;
ALTER TABLE immogr_sources DROP COLUMN IF EXISTS terms_reviewed_at;
ALTER TABLE immogr_sources DROP COLUMN IF EXISTS terms_version_or_hash;
ALTER TABLE immogr_sources DROP COLUMN IF EXISTS robots_reviewed_at;
ALTER TABLE immogr_sources DROP COLUMN IF EXISTS authorized_method;
ALTER TABLE immogr_sources DROP COLUMN IF EXISTS decision_reason;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'immogr_source_pages' AND column_name = 'access_decision'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'immogr_source_pages' AND column_name = 'retrieval_status'
  ) THEN
    ALTER TABLE immogr_source_pages RENAME COLUMN access_decision TO retrieval_status;
  END IF;
END $$;

ALTER TABLE immogr_source_pages DROP CONSTRAINT IF EXISTS immogr_source_pages_access_decision_check;
ALTER TABLE immogr_source_pages DROP CONSTRAINT IF EXISTS immogr_source_pages_retrieval_status_check;
UPDATE immogr_source_pages SET retrieval_status = 'observed' WHERE retrieval_status = 'manual_review';
ALTER TABLE immogr_source_pages
  ADD CONSTRAINT immogr_source_pages_retrieval_status_check
  CHECK (retrieval_status IN ('observed','retrieved','failed'));

ALTER TABLE immogr_runs DROP CONSTRAINT IF EXISTS immogr_runs_mode_check;
UPDATE immogr_runs SET mode = 'source_acquisition' WHERE mode = 'authorized_acquisition';
ALTER TABLE immogr_runs
  ADD CONSTRAINT immogr_runs_mode_check
  CHECK (mode IN ('manual_discovery','manual_review','source_acquisition','evaluation'));
