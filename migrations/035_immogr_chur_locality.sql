-- Add Chur as a standalone search target without changing the existing 22+22 groups.
ALTER TABLE immogr_localities
  DROP CONSTRAINT IF EXISTS immogr_localities_target_group_check;
ALTER TABLE immogr_localities
  ADD CONSTRAINT immogr_localities_target_group_check CHECK (target_group IN (0, 1, 2));

INSERT INTO immogr_localities (locality_id, locality_name, canton_code, target_group)
VALUES ('chur', 'Chur', 'GR', 0)
ON CONFLICT (locality_id) DO UPDATE SET
  locality_name = EXCLUDED.locality_name,
  canton_code = EXCLUDED.canton_code,
  target_group = EXCLUDED.target_group;
