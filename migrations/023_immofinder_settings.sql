-- P128.5: user-editable ImmoFinder settings (schedule, delivery channels, search scope, cost guard).
CREATE TABLE IF NOT EXISTS immofinder_settings (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
