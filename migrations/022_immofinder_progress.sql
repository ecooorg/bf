-- P128.4: live progress of a running search (stage, current step, counters, last log lines).
ALTER TABLE immofinder_runs ADD COLUMN IF NOT EXISTS progress jsonb NOT NULL DEFAULT '{}'::jsonb;
