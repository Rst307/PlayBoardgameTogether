-- Match command receipts remain valid for the lifetime of the saved match.
UPDATE command_receipts
SET expires_at = 'infinity'::timestamptz
WHERE operation LIKE 'match.action:%';

ALTER TABLE matches
  ADD COLUMN state_schema_version text,
  ADD COLUMN rule_digest text,
  ADD COLUMN resource_digest text;

-- Existing matches have no trustworthy code or resource digest. They remain
-- readable under their exact installed version; new matches lock all digests.
CREATE INDEX command_receipts_match_operation_idx
  ON command_receipts(operation, request_id)
  WHERE operation LIKE 'match.action:%';
