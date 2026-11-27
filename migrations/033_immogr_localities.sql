-- Owner-defined ImmoGR locality scope. Additive: retain the historic municipality catalogue and FK unchanged.
CREATE TABLE IF NOT EXISTS immogr_localities (
  locality_id text PRIMARY KEY,
  locality_name text NOT NULL UNIQUE,
  canton_code char(2) NOT NULL DEFAULT 'GR' CHECK (canton_code = 'GR'),
  target_group smallint NOT NULL CHECK (target_group IN (1, 2)),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO immogr_localities (locality_id, locality_name, canton_code, target_group) VALUES
  ('araschgen', 'Araschgen', 'GR', 1),
  ('bonaduz', 'Bonaduz', 'GR', 1),
  ('churwalden', 'Churwalden', 'GR', 1),
  ('domat-ems', 'Domat/Ems', 'GR', 1),
  ('felsberg', 'Felsberg', 'GR', 1),
  ('haldenstein', 'Haldenstein', 'GR', 1),
  ('igis', 'Igis', 'GR', 1),
  ('landquart', 'Landquart', 'GR', 1),
  ('maladers', 'Maladers', 'GR', 1),
  ('malix', 'Malix', 'GR', 1),
  ('passugg', 'Passugg', 'GR', 1),
  ('praden', 'Praden', 'GR', 1),
  ('reichenau', 'Reichenau', 'GR', 1),
  ('rhazuns', 'Rhäzüns', 'GR', 1),
  ('tamins', 'Tamins', 'GR', 1),
  ('trimmis', 'Trimmis', 'GR', 1),
  ('trin', 'Trin', 'GR', 1),
  ('trin-digg', 'Trin Digg', 'GR', 1),
  ('trin-mulin', 'Trin Mulin', 'GR', 1),
  ('tschiertschen', 'Tschiertschen', 'GR', 1),
  ('untervaz', 'Untervaz', 'GR', 1),
  ('zizers', 'Zizers', 'GR', 1),
  ('cazis', 'Cazis', 'GR', 2),
  ('domleschg', 'Domleschg', 'GR', 2),
  ('flasch', 'Fläsch', 'GR', 2),
  ('flims', 'Flims', 'GR', 2),
  ('grusch', 'Grüsch', 'GR', 2),
  ('jenins', 'Jenins', 'GR', 2),
  ('laax', 'Laax', 'GR', 2),
  ('lenzerheide', 'Lenzerheide', 'GR', 2),
  ('maienfeld', 'Maienfeld', 'GR', 2),
  ('malans', 'Malans', 'GR', 2),
  ('mastrils', 'Mastrils', 'GR', 2),
  ('parpan', 'Parpan', 'GR', 2),
  ('pratval', 'Pratval', 'GR', 2),
  ('rodels', 'Rodels', 'GR', 2),
  ('rothenbrunnen', 'Rothenbrunnen', 'GR', 2),
  ('says', 'Says', 'GR', 2),
  ('scharans', 'Scharans', 'GR', 2),
  ('sils-im-domleschg', 'Sils im Domleschg', 'GR', 2),
  ('st-peter', 'St. Peter', 'GR', 2),
  ('summaprada', 'Summaprada', 'GR', 2),
  ('thusis', 'Thusis', 'GR', 2),
  ('valbella', 'Valbella', 'GR', 2)
ON CONFLICT (locality_id) DO UPDATE SET
  locality_name = EXCLUDED.locality_name,
  canton_code = EXCLUDED.canton_code,
  target_group = EXCLUDED.target_group;

ALTER TABLE immogr_listings
  ADD COLUMN IF NOT EXISTS locality_id text REFERENCES immogr_localities(locality_id);

CREATE INDEX IF NOT EXISTS immogr_listings_locality_category_idx
  ON immogr_listings (locality_id, category, qualification_state);
