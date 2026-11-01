CREATE TABLE game_subscription (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  auto_add boolean NOT NULL DEFAULT false,
  auto_update boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  authorized_by uuid,
  next_check_at timestamptz,
  requested_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','running','succeeded','partial','failed')),
  message text NOT NULL DEFAULT '' CHECK (length(message) <= 160),
  items jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) <= 100)
);
INSERT INTO game_subscription(singleton) VALUES(true);
