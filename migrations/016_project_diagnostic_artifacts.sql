-- P92.1: correlation survives process restarts and multiple server instances.
CREATE TABLE IF NOT EXISTS project_diagnostic_artifacts (
  artifact_id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_diagnostic_artifacts_operation_idx ON project_diagnostic_artifacts(operation_id);
