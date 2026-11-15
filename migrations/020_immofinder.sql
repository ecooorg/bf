-- P128.1: ImmoFinder GR listings and run log.
CREATE TABLE IF NOT EXISTS immofinder_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_key text NOT NULL UNIQUE,
  source_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  listing_url text NOT NULL,
  photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  municipality text NOT NULL,
  property_name text NOT NULL DEFAULT '',
  rooms_text text NOT NULL DEFAULT '',
  rooms_estimated numeric(3,1),
  rooms_basis text NOT NULL DEFAULT 'zimmer',
  description_de text NOT NULL DEFAULT '',
  description_ru text NOT NULL DEFAULT '',
  title_ru text NOT NULL DEFAULT '',
  owner_name text,
  direct_phone text,
  direct_email text,
  personal_website text,
  contact_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  contact_status text NOT NULL DEFAULT 'platform_only' CHECK (contact_status IN ('found','not_found','platform_only')),
  contact_advice text NOT NULL DEFAULT '',
  private_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  osint_notes text NOT NULL DEFAULT '',
  draft_message_de text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','CONTACTED','REPLIED','REJECTED')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS immofinder_listings_status_idx ON immofinder_listings (status, last_seen_at DESC);
CREATE TABLE IF NOT EXISTS immofinder_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  trigger text NOT NULL DEFAULT 'manual',
  dry_run boolean NOT NULL DEFAULT false,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  est_cost_usd numeric(8,4) NOT NULL DEFAULT 0,
  delivery jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS immofinder_runs_started_idx ON immofinder_runs (started_at DESC);
