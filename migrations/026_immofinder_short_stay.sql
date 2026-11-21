ALTER TABLE immofinder_listings ADD COLUMN IF NOT EXISTS street_address text NOT NULL DEFAULT '';
-- P129.50: restore short-stay and seasonal rentals; the period/contact/detail-page gates live in the pipeline.
UPDATE immofinder_settings
SET data = jsonb_set(data, '{search,rejectNonMonthly}', 'false'::jsonb, true),
    updated_at = now()
WHERE jsonb_typeof(data->'search') = 'object'
  AND COALESCE((data->'search'->>'rejectNonMonthly')::boolean, false) = true;
