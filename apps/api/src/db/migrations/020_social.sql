ALTER TABLE accounts ADD COLUMN friend_id varchar(36);
UPDATE accounts SET friend_id = 'p_' || replace(id::text, '-', '');
ALTER TABLE accounts ALTER COLUMN friend_id SET NOT NULL;
ALTER TABLE accounts ADD CONSTRAINT accounts_friend_id_unique UNIQUE (friend_id);
ALTER TABLE accounts ADD CONSTRAINT accounts_friend_id_format CHECK (friend_id ~ '^[a-z0-9_]{3,36}$');
ALTER TABLE accounts ADD COLUMN social_revision integer NOT NULL DEFAULT 1 CHECK (social_revision > 0);

CREATE FUNCTION assign_friend_id() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.friend_id IS NULL THEN NEW.friend_id := 'p_' || replace(NEW.id::text, '-', ''); END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER account_friend_id BEFORE INSERT ON accounts FOR EACH ROW EXECUTE FUNCTION assign_friend_id();

CREATE TABLE friendships (
  account_low uuid NOT NULL REFERENCES accounts(id),
  account_high uuid NOT NULL REFERENCES accounts(id),
  requested_by uuid NOT NULL REFERENCES accounts(id),
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'removed')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_low, account_high),
  CHECK (account_low < account_high),
  CHECK (requested_by IN (account_low, account_high))
);
CREATE INDEX friendships_high ON friendships(account_high);

CREATE TABLE direct_messages (
  sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  id uuid PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES accounts(id),
  recipient_id uuid NOT NULL REFERENCES accounts(id),
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX direct_messages_sender ON direct_messages(sender_id, recipient_id, sequence DESC);
CREATE INDEX direct_messages_recipient ON direct_messages(recipient_id, sender_id, sequence DESC);
CREATE TABLE direct_message_reads (
  account_id uuid NOT NULL REFERENCES accounts(id),
  peer_id uuid NOT NULL REFERENCES accounts(id),
  last_sequence bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (account_id, peer_id),
  CHECK (account_id <> peer_id)
);

CREATE TABLE friend_room_invitations (
  id uuid PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES rooms(id),
  sender_id uuid NOT NULL REFERENCES accounts(id),
  recipient_id uuid NOT NULL REFERENCES accounts(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX friend_room_invitations_recipient ON friend_room_invitations(recipient_id, created_at DESC);
CREATE INDEX friend_room_invitations_sender ON friend_room_invitations(sender_id, created_at DESC);
CREATE TABLE social_command_receipts (
  account_id uuid NOT NULL REFERENCES accounts(id),
  request_id uuid NOT NULL,
  input_hash text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, request_id)
);
