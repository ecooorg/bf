-- P92: privacy-preserving operation events, no prompts, source code or secrets.
CREATE TABLE IF NOT EXISTS project_diagnostic_events (
  id bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  operation_id varchar(90) NOT NULL,
  event varchar(90) NOT NULL,
  stage varchar(90) NOT NULL,
  status varchar(90) NOT NULL,
  duration_ms bigint,
  bytes bigint,
  file_count integer,
  error_code varchar(90)
);
CREATE INDEX IF NOT EXISTS project_diagnostic_recent_idx ON project_diagnostic_events (id DESC);
-- Keep at most seven days of events at insertion time (no background worker needed).
CREATE OR REPLACE FUNCTION prune_project_diagnostic_events() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id % 100 = 0 THEN DELETE FROM project_diagnostic_events WHERE occurred_at < now() - interval '7 days'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER project_diagnostic_prune AFTER INSERT ON project_diagnostic_events FOR EACH ROW EXECUTE FUNCTION prune_project_diagnostic_events();
