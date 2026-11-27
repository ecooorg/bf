-- ImmoGR independent persistence foundation. Additive only; no legacy tables are read or changed.
CREATE TABLE IF NOT EXISTS immogr_communes (
  bfs_id integer PRIMARY KEY,
  official_name text NOT NULL UNIQUE,
  priority_rating smallint CHECK (priority_rating IN (1, 2)),
  target_44 boolean,
  aliases text[] NOT NULL DEFAULT '{}',
  postcodes text[] NOT NULL DEFAULT '{}',
  source_reference text NOT NULL,
  source_as_of date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO immogr_communes (bfs_id, official_name, source_reference, source_as_of) VALUES
  (3542, "Albula/Alvra", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3701, "Andeer", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3921, "Arosa", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3681, "Avers", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3544, "Bergün Filisur", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3781, "Bever", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3721, "Bonaduz", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3792, "Bregaglia", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3981, "Breil/Brigels", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3551, "Brusio", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3804, "Buseno", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3837, "Calanca", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3831, "Cama", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3805, "Castaneda", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3661, "Cazis", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3782, "Celerina/Schlarigna", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3901, "Chur", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3911, "Churwalden", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3881, "Conters im Prättigau", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3851, "Davos", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3982, "Disentis/Mustér", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3722, "Domat/Ems", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3673, "Domleschg", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3572, "Falera", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3731, "Felsberg", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3713, "Ferrera", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3861, "Fideris", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3951, "Fläsch", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3662, "Flerden", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3732, "Flims", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3862, "Furna", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3633, "Fürstenau", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3832, "Grono", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3961, "Grüsch", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3619, "Ilanz/Glion", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3863, "Jenaz", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3952, "Jenins", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3871, "Klosters", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3882, "Küblis", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3785, "La Punt Chamues-ch", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3575, "Laax", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3955, "Landquart", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3513, "Lantsch/Lenz", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3821, "Lostallo", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3618, "Lumnezia", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3891, "Luzein", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3783, "Madulain", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3953, "Maienfeld", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3954, "Malans", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3663, "Masein", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3983, "Medel (Lucmagn)", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3822, "Mesocco", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3715, "Muntogna da Schons", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3988, "Obersaxen Mundaun", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3784, "Pontresina", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3561, "Poschiavo", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3723, "Rhäzüns", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3714, "Rheinwald", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3711, "Rongellen", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3808, "Rossa", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3637, "Rothenbrunnen", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3834, "Roveredo (GR)", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3672, "Safiental", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3581, "Sagogn", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3786, "Samedan", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3752, "Samnaun", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3835, "San Vittore", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3810, "Santa Maria im Calanca", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3788, "S-chanf", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3638, "Scharans", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3962, "Schiers", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3582, "Schluein", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3514, "Schmitten (GR)", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3762, "Scuol", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3972, "Seewis im Prättigau", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3640, "Sils im Domleschg", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3789, "Sils im Engadin/Segl", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3790, "Silvaplana", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3823, "Soazza", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3787, "St. Moritz", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3695, "Sufers", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3985, "Sumvitg", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3543, "Surses", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3733, "Tamins", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3668, "Thusis", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3945, "Trimmis", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3734, "Trin", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3987, "Trun", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3669, "Tschappina", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3986, "Tujetsch", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3946, "Untervaz", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3670, "Urmein", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3847, "Val Müstair", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3603, "Vals", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3764, "Valsot", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3506, "Vaz/Obervaz", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3746, "Zernez", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3712, "Zillis-Reischen", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3947, "Zizers", 'Canton Graubünden official municipality directory', DATE '2026-09-14'),
  (3791, "Zuoz", 'Canton Graubünden official municipality directory', DATE '2026-09-14')
ON CONFLICT (bfs_id) DO UPDATE SET
  official_name = EXCLUDED.official_name,
  source_reference = EXCLUDED.source_reference,
  source_as_of = EXCLUDED.source_as_of;

CREATE TABLE IF NOT EXISTS immogr_sources (
  id text PRIMARY KEY,
  canonical_domain text NOT NULL,
  operator_name text,
  status text NOT NULL CHECK (status IN ('active','discovery_only','research_required','permission_required','excluded_pending_written_permission','degraded','retired','not_a_feasible_source','low_priority')),
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
  mode text NOT NULL CHECK (mode IN ('manual_discovery','manual_review','authorized_acquisition','evaluation')),
  category text CHECK (category IN ('direct_rental','private_owner_prospect')),
  commune_id integer REFERENCES immogr_communes(bfs_id),
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
  access_decision text NOT NULL CHECK (access_decision IN ('manual_review','authorized','blocked_terms','blocked_robots','blocked_rate_limit','blocked_auth','failed')),
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
