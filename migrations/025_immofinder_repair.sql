-- P129.47: idempotent assistant repair batches and append-only operation evidence.
CREATE TABLE IF NOT EXISTS immofinder_repair_batches (
  batch_id text PRIMARY KEY,
  kind text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS immofinder_repair_events (
  id bigserial PRIMARY KEY,
  batch_id text NOT NULL REFERENCES immofinder_repair_batches(batch_id),
  listing_id uuid NOT NULL,
  op text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL,
  detail text,
  before_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS immofinder_repair_events_batch_idx ON immofinder_repair_events(batch_id, created_at);
