ALTER TABLE immogr_listings DROP CONSTRAINT IF EXISTS immogr_listings_property_type_check;
ALTER TABLE immogr_listings
  ADD CONSTRAINT immogr_listings_property_type_check
  CHECK (property_type IN ('apartment','house','chalet','room','other','unknown'));
