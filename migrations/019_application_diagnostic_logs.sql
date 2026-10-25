-- P93.7: detailed, privacy-preserving in-app diagnostics; seven-day retention.
CREATE TABLE IF NOT EXISTS application_diagnostic_logs (
  id bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  level varchar(10) NOT NULL CHECK (level IN ('debug','info','warn','error')),
  component varchar(80) NOT NULL,
  event varchar(100) NOT NULL,
  message varchar(1200) NOT NULL DEFAULT '',
  request_id varchar(100),
  operation_id varchar(90),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_name varchar(100),
  error_code varchar(100),
  stack text
);
CREATE INDEX IF NOT EXISTS application_diagnostic_logs_recent_idx ON application_diagnostic_logs (id DESC);
CREATE INDEX IF NOT EXISTS application_diagnostic_logs_operation_idx ON application_diagnostic_logs (operation_id, id DESC) WHERE operation_id IS NOT NULL;
CREATE OR REPLACE FUNCTION prune_application_diagnostic_logs() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id % 100 = 0 THEN DELETE FROM application_diagnostic_logs WHERE occurred_at < now() - interval '7 days'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS application_diagnostic_logs_prune ON application_diagnostic_logs;
CREATE TRIGGER application_diagnostic_logs_prune AFTER INSERT ON application_diagnostic_logs FOR EACH ROW EXECUTE FUNCTION prune_application_diagnostic_logs();
