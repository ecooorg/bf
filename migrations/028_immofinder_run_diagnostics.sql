-- P130.0: durable diagnostics handoff from Render to GitHub Actions.
CREATE TABLE IF NOT EXISTS immofinder_run_diagnostics (
  run_id text PRIMARY KEY,
  completed_at timestamptz NOT NULL DEFAULT now(),
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS immofinder_run_diagnostics_completed_idx
  ON immofinder_run_diagnostics (completed_at DESC, run_id DESC);
