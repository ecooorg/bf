-- P93.3: staged App Builder jobs and per-unit results (used only when APP_BUILDER_ENGINE=staged).
CREATE TABLE IF NOT EXISTS app_build_jobs (
  id UUID PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','running','done','failed','cancelled')),
  stage TEXT NOT NULL DEFAULT 'preflight',
  spec JSONB,
  plan JSONB,
  calls_used INTEGER NOT NULL DEFAULT 0,
  calls_budget INTEGER NOT NULL DEFAULT 25,
  error JSONB,
  report JSONB,
  artifact_id TEXT,
  task_text TEXT NOT NULL DEFAULT '',
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_build_jobs_status_idx ON app_build_jobs(status, heartbeat_at);
CREATE INDEX IF NOT EXISTS app_build_jobs_project_idx ON app_build_jobs(project_id, created_at DESC);
CREATE TABLE IF NOT EXISTS app_build_unit_results (
  job_id UUID NOT NULL REFERENCES app_build_jobs(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, unit_id, cache_key)
);
CREATE INDEX IF NOT EXISTS app_build_unit_results_cache_idx ON app_build_unit_results(cache_key);
