-- ImmoGR personal manual research notebook. Additive; no source pages or legacy tables are modified.
CREATE TABLE IF NOT EXISTS immogr_manual_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL,
  canonical_url text NOT NULL,
  locality_id text NOT NULL REFERENCES immogr_localities(locality_id),
  capture_method text NOT NULL DEFAULT 'manual_user_review' CHECK (capture_method = 'manual_user_review'),
  reviewer_id text NOT NULL DEFAULT 'owner',
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  manual_access_outcome text NOT NULL CHECK (manual_access_outcome IN ('reviewed','in_progress','blocked_by_source','no_relevant_inventory')),
  page_title text,
  property_type text NOT NULL DEFAULT 'unknown' CHECK (property_type IN ('apartment','house','chalet','room','other','unknown')),
  price_amount numeric(12,2) CHECK (price_amount IS NULL OR price_amount >= 0),
  currency char(3) NOT NULL DEFAULT 'CHF' CHECK (currency IN ('CHF','EUR')),
  price_period text NOT NULL DEFAULT 'unknown' CHECK (price_period IN ('month','week','night','season','unknown')),
  owner_class text NOT NULL DEFAULT 'unknown' CHECK (owner_class IN ('private_owner','agency','management_company','tour_operator','intermediary','unknown')),
  availability text,
  reviewer_notes text,
  source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS immogr_manual_reviews_source_date_idx
  ON immogr_manual_reviews (source_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS immogr_manual_reviews_locality_date_idx
  ON immogr_manual_reviews (locality_id, reviewed_at DESC);
