CREATE TABLE ai_decision_groups (
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  seat_id uuid NOT NULL,
  controller_epoch integer NOT NULL CHECK (controller_epoch >= 0),
  decision_key text NOT NULL,
  external_attempts integer NOT NULL DEFAULT 0 CHECK (external_attempts BETWEEN 0 AND 2),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(match_id, seat_id, controller_epoch, decision_key),
  FOREIGN KEY(match_id, seat_id) REFERENCES match_participants(match_id, seat_id) ON DELETE CASCADE
);
