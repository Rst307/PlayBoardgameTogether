-- Keep explicitly customized IDs. Replace only untouched UUID defaults.
-- Reuse the social write lock so default allocation and ID edits serialize.
CREATE OR REPLACE FUNCTION assign_friend_id() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  candidate text;
  suffix text;
  attempt integer := 1;
BEGIN
  IF NEW.friend_id IS NOT NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('social-write', 0));
  candidate := NEW.username_canonical;
  WHILE EXISTS (SELECT 1 FROM accounts WHERE friend_id = candidate) LOOP
    attempt := attempt + 1;
    suffix := '_' || attempt::text;
    candidate := left(NEW.username_canonical, 36 - length(suffix)) || suffix;
  END LOOP;
  NEW.friend_id := candidate;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  account_row record;
  candidate text;
  suffix text;
  attempt integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('social-write', 0));
  FOR account_row IN
    SELECT id, username_canonical FROM accounts
    WHERE social_revision = 1 AND friend_id = 'p_' || replace(id::text, '-', '')
    ORDER BY username_canonical, id
  LOOP
    candidate := account_row.username_canonical;
    attempt := 1;
    WHILE EXISTS (SELECT 1 FROM accounts WHERE friend_id = candidate) LOOP
      attempt := attempt + 1;
      suffix := '_' || attempt::text;
      candidate := left(account_row.username_canonical, 36 - length(suffix)) || suffix;
    END LOOP;
    UPDATE accounts SET friend_id = candidate, social_revision = social_revision + 1
    WHERE id = account_row.id;
  END LOOP;
END;
$$;
