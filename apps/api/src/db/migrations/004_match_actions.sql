CREATE TABLE match_actions (
  id uuid PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id),
  seat_id uuid NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  action jsonb NOT NULL,
  actor_view jsonb NOT NULL,
  actor_events jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, revision),
  FOREIGN KEY(match_id, seat_id) REFERENCES match_participants(match_id, seat_id)
);
CREATE INDEX match_actions_match_idx ON match_actions(match_id, revision);
