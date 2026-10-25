-- P93.6: shared, cross-instance request-start pacing and daily request budget per model.
CREATE TABLE IF NOT EXISTS model_request_slots (
  model_id TEXT PRIMARY KEY,
  next_allowed_at TIMESTAMPTZ NOT NULL,
  quota_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
  requests_today INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE model_request_slots ADD COLUMN IF NOT EXISTS quota_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date);
ALTER TABLE model_request_slots ADD COLUMN IF NOT EXISTS requests_today INTEGER NOT NULL DEFAULT 0;
ALTER TABLE model_request_slots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
