-- Persist the separate ImmoGR research category on owner-captured local-page observations.
ALTER TABLE immogr_manual_reviews
  ADD COLUMN IF NOT EXISTS result_category text NOT NULL DEFAULT 'direct_rental';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'immogr_manual_reviews_result_category_check'
      AND conrelid = 'immogr_manual_reviews'::regclass
  ) THEN
    ALTER TABLE immogr_manual_reviews
      ADD CONSTRAINT immogr_manual_reviews_result_category_check
      CHECK (result_category IN ('direct_rental', 'private_owner_prospect'));
  END IF;
END $$;
