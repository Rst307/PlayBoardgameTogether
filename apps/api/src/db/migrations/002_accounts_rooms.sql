CREATE TABLE accounts (
  id uuid PRIMARY KEY,
  username_canonical text NOT NULL UNIQUE CHECK (username_canonical ~ '^[a-z0-9_]{3,32}$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 32),
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'administrator')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id),
  token_hash text NOT NULL UNIQUE,
  csrf_token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_account_idx ON sessions(account_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at) WHERE revoked_at IS NULL;
CREATE TABLE rooms (
  id uuid PRIMARY KEY,
  host_account_id uuid NOT NULL REFERENCES accounts(id),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_game', 'closed')),
  game_id text NOT NULL,
  game_version text NOT NULL,
  options jsonb NOT NULL,
  seat_count integer NOT NULL CHECK (seat_count > 0),
  room_revision integer NOT NULL DEFAULT 0 CHECK (room_revision >= 0),
  active_match_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE INDEX rooms_host_open_idx ON rooms(host_account_id) WHERE status <> 'closed';
CREATE TABLE room_members (
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(room_id, account_id)
);
CREATE INDEX room_members_account_idx ON room_members(account_id, joined_at DESC);
CREATE TABLE seats (
  id uuid PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  seat_index integer NOT NULL CHECK (seat_index >= 0),
  owner_account_id uuid,
  ready boolean NOT NULL DEFAULT false,
  UNIQUE(room_id, seat_index),
  UNIQUE(room_id, owner_account_id),
  FOREIGN KEY(room_id, owner_account_id) REFERENCES room_members(room_id, account_id),
  CHECK (NOT ready OR owner_account_id IS NOT NULL)
);
CREATE TABLE room_invites (
  room_id uuid PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX room_invites_expiry_idx ON room_invites(expires_at);
CREATE TABLE matches (
  id uuid PRIMARY KEY,
  room_id uuid NOT NULL UNIQUE REFERENCES rooms(id),
  game_id text NOT NULL,
  game_version text NOT NULL,
  content_version text NOT NULL,
  resource_pack_id text NOT NULL,
  resource_pack_version text NOT NULL,
  state jsonb NOT NULL,
  rng_state jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished', 'aborted')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE match_participants (
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  seat_id uuid NOT NULL REFERENCES seats(id),
  account_id uuid NOT NULL REFERENCES accounts(id),
  seat_index integer NOT NULL,
  controller_type text NOT NULL DEFAULT 'human' CHECK (controller_type = 'human'),
  controller_epoch integer NOT NULL DEFAULT 0 CHECK (controller_epoch >= 0),
  PRIMARY KEY(match_id, seat_id),
  UNIQUE(match_id, account_id)
);
CREATE INDEX match_participants_account_idx ON match_participants(account_id, match_id);
ALTER TABLE rooms ADD CONSTRAINT rooms_active_match_fk FOREIGN KEY(active_match_id) REFERENCES matches(id);
CREATE TABLE command_receipts (
  account_id uuid NOT NULL REFERENCES accounts(id),
  operation text NOT NULL,
  request_id text NOT NULL CHECK (char_length(request_id) BETWEEN 1 AND 128),
  request_hash text NOT NULL,
  room_id uuid REFERENCES rooms(id),
  result_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY(account_id, operation, request_id)
);
CREATE INDEX command_receipts_expiry_idx ON command_receipts(expires_at);
