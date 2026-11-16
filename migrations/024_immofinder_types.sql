-- P128.8: listing type (holiday owner vs direct long-term offer), hidden flag for unsuitable saved rows.
ALTER TABLE immofinder_listings ADD COLUMN IF NOT EXISTS listing_type text NOT NULL DEFAULT 'holiday_owner';
ALTER TABLE immofinder_listings ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
ALTER TABLE immofinder_listings ADD COLUMN IF NOT EXISTS hide_reason text NOT NULL DEFAULT '';
