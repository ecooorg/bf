-- P130.17d: durable PostgreSQL-backed ImmoFinder queue and worker leases.
ALTER TABLE immofinder_runs
  ADD COLUMN IF NOT EXISTS lease_owner text,
  ADD COLUMN IF NOT EXISTS lease_until timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS immofinder_runs_queue_idx
  ON immofinder_runs (finished_at, lease_until, started_at)
  WHERE finished_at IS NULL;

-- Give pre-queue in-flight runs a drain window for the old web process before recovery.
UPDATE immofinder_runs
   SET progress = COALESCE(progress, '{}'::jsonb) || jsonb_build_object('state','queued','recoveredFromLegacy',true),
       lease_until = COALESCE(lease_until, now() + interval '60 seconds')
 WHERE finished_at IS NULL
   AND lease_owner IS NULL
   AND NOT (COALESCE(progress, '{}'::jsonb) ? 'state');
