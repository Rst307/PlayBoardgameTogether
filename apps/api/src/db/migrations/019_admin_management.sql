ALTER TABLE accounts ADD COLUMN admin_revision integer NOT NULL DEFAULT 1 CHECK (admin_revision > 0);
ALTER TABLE game_installations ADD COLUMN admin_revision integer NOT NULL DEFAULT 1 CHECK (admin_revision > 0);

CREATE FUNCTION bump_admin_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.admin_revision := OLD.admin_revision + 1;
  RETURN NEW;
END;
$$;
CREATE TRIGGER account_status_revision BEFORE UPDATE OF status ON accounts
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION bump_admin_revision();
CREATE TRIGGER game_enabled_revision BEFORE UPDATE OF enabled ON game_installations
FOR EACH ROW WHEN (OLD.enabled IS DISTINCT FROM NEW.enabled) EXECUTE FUNCTION bump_admin_revision();

CREATE TABLE admin_command_receipts (
  account_id uuid NOT NULL REFERENCES accounts(id),
  request_id uuid NOT NULL,
  input jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, request_id)
);
