-- Existing rooms receive a full reconnect window when this migration runs.
ALTER TABLE rooms ADD COLUMN last_activity_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX rooms_idle_idx ON rooms(last_activity_at) WHERE status <> 'closed';
