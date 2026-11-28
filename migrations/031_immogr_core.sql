-- ImmoGR independent persistence foundation. Additive only; no legacy tables are read or changed.
CREATE TABLE IF NOT EXISTS immogr_sources (
  id text PRIMARY KEY,
  canonical_domain text NOT NULL,
  operator_name text,
  status text NOT NULL CHECK (status IN ('active','discovery_only','research_required','degraded','retired','not_a_feasible_source','low_priority')),
  terms_url text,
  terms_reviewed_at timestamptz,
  terms_version_or_hash text,
  robots_reviewed_at timestamptz,
  authorized_method text,
  decision_reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS immogr_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL CHECK (mode IN ('manual_discovery','manual_review','source_acquisition','evaluation')),
  category text CHECK (category IN ('direct_rental','private_owner_prospect')),
  commune_id integer,
  status text NOT NULL CHECK (status IN ('queued','running','succeeded','partial','failed','cancelled')),
  config_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  counters jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_code text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS immogr_source_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text REFERENCES immogr_sources(id),
  run_id uuid REFERENCES immogr_runs(id),
  requested_url text NOT NULL,
  final_url text,
  http_status integer,
  content_type text,
  observed_at timestamptz NOT NULL DEFAULT now(),
  content_fingerprint text,
  access_decision text NOT NULL CHECK (access_decision IN ('manual_review','retrieved','failed')),
  parser_version text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS immogr_source_pages_url_observed_idx ON immogr_source_pages (requested_url, observed_at DESC);

CREATE TABLE IF NOT EXISTS immogr_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_url text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('direct_rental','private_owner_prospect')),
  commune_id integer,
  property_type text NOT NULL DEFAULT 'unknown' CHECK (property_type IN ('apartment','house','chalet','other','unknown')),
  owner_class text NOT NULL DEFAULT 'unknown' CHECK (owner_class IN ('private_owner','agency','management_company','tour_operator','intermediary','unknown')),
  monthly_rent_chf numeric(12,2),
  price_period text NOT NULL DEFAULT 'unknown' CHECK (price_period IN ('month','week','night','season','unknown')),
  qualification_state text NOT NULL DEFAULT 'candidate' CHECK (qualification_state IN ('candidate','qualified','rejected','needs_review')),
  prospect_score numeric(5,2),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (monthly_rent_chf IS NULL OR monthly_rent_chf >= 0),
  CHECK (prospect_score IS NULL OR (prospect_score >= 0 AND prospect_score <= 100))
);
CREATE INDEX IF NOT EXISTS immogr_listings_commune_category_idx ON immogr_listings (commune_id, category, qualification_state);

CREATE TABLE IF NOT EXISTS immogr_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES immogr_listings(id) ON DELETE CASCADE,
  owner_class text NOT NULL CHECK (owner_class IN ('private_owner','agency','management_company','tour_operator','intermediary','unknown')),
  display_name text,
  attribution_status text NOT NULL DEFAULT 'unverified' CHECK (attribution_status IN ('unverified','evidence_backed','human_verified','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS immogr_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES immogr_listings(id) ON DELETE CASCADE,
  contact_type text NOT NULL CHECK (contact_type IN ('email','phone','contact_form','platform_message','website')),
  contact_value text NOT NULL,
  attributed_to text NOT NULL CHECK (attributed_to IN ('owner','advertiser','property_manager','platform','unknown')),
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','evidence_backed','human_verified','rejected')),
  source_url text NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  retention_until timestamptz
);

CREATE TABLE IF NOT EXISTS immogr_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES immogr_listings(id) ON DELETE CASCADE,
  source_page_id uuid REFERENCES immogr_source_pages(id),
  field_name text NOT NULL,
  field_value text NOT NULL,
  quote text NOT NULL,
  source_url text NOT NULL,
  page_block text NOT NULL,
  extraction_method text NOT NULL CHECK (extraction_method IN ('structured_data','source_adapter','deterministic_parser','llm_interpretation','human_review')),
  confidence numeric(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  observed_at timestamptz NOT NULL DEFAULT now(),
  conflict_group text
);
CREATE INDEX IF NOT EXISTS immogr_evidence_listing_field_idx ON immogr_evidence (listing_id, field_name, observed_at DESC);

CREATE TABLE IF NOT EXISTS immogr_events (
  id bigserial PRIMARY KEY,
  run_id uuid REFERENCES immogr_runs(id),
  listing_id uuid REFERENCES immogr_listings(id),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS immogr_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES immogr_listings(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approve','reject','correct','needs_more_evidence')),
  reviewer text,
  notes text,
  corrections jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
