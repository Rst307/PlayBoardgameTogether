CREATE TABLE social_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  friend_id_change_days integer NOT NULL DEFAULT 30 CHECK (friend_id_change_days BETWEEN 0 AND 3650),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0)
);
INSERT INTO social_settings(singleton) VALUES (true);

ALTER TABLE accounts ADD COLUMN friend_id_changed_at timestamptz;
-- Only successful explicit ID edits have this result shape. Automatic default
-- allocation and migration must not start a user's cooldown.
UPDATE accounts a SET friend_id_changed_at = (
  SELECT max(created_at) FROM social_command_receipts r
  WHERE r.account_id=a.id AND r.result ? 'friendId' AND r.result ? 'revision'
);
