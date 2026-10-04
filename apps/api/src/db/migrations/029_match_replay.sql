CREATE TABLE match_replay_frames (
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision >= 0),
  state jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('active','finished','aborted')),
  internal_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  actor_seat_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, revision)
);

-- Legacy matches have no reconstructable initial state: keep only the current frame.
INSERT INTO match_replay_frames(match_id,revision,state,status)
SELECT id,revision,state,status FROM matches;

-- Initial setup and every committed state transition share the caller's transaction.
CREATE FUNCTION capture_match_replay_frame() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO match_replay_frames(match_id,revision,state,status)
  VALUES(NEW.id,NEW.revision,NEW.state,NEW.status)
  ON CONFLICT (match_id,revision) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER match_replay_capture AFTER INSERT OR UPDATE OF state,revision ON matches
FOR EACH ROW EXECUTE FUNCTION capture_match_replay_frame();
