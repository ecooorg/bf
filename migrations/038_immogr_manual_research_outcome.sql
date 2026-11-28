-- Normalize historical manual research outcomes to technical request results.
ALTER TABLE immogr_manual_reviews
  DROP CONSTRAINT IF EXISTS immogr_manual_reviews_manual_access_outcome_check;
UPDATE immogr_manual_reviews
SET manual_access_outcome = 'request_failed'
WHERE manual_access_outcome = 'blocked_by_source';
ALTER TABLE immogr_manual_reviews
  ADD CONSTRAINT immogr_manual_reviews_manual_access_outcome_check
  CHECK (manual_access_outcome IN ('reviewed','in_progress','request_failed','no_relevant_inventory'));
