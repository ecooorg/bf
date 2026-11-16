-- P128.2: cache of examined pages so rejected listings are not re-sent to the model on every run.
CREATE TABLE IF NOT EXISTS immofinder_seen (
  url text PRIMARY KEY,
  source_id text NOT NULL DEFAULT '',
  decision text NOT NULL,
  reason text NOT NULL DEFAULT '',
  checked_at timestamptz NOT NULL DEFAULT now()
);
