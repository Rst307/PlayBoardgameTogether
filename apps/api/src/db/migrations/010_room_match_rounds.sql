-- Retain every round, but allow only one active match per room.
ALTER TABLE matches DROP CONSTRAINT matches_room_id_key;
CREATE UNIQUE INDEX matches_one_active_per_room ON matches(room_id) WHERE status='active';
CREATE INDEX matches_room_history_idx ON matches(room_id, created_at DESC);

-- Participants are immutable match identities, independent of later room seating.
-- Actions and AI tasks retain their composite foreign keys to participants.
ALTER TABLE match_participants DROP CONSTRAINT match_participants_seat_id_fkey;

-- Repair rooms left in_game by previous versions after normal completion.
WITH recovered AS (
  UPDATE rooms r SET status='waiting', active_match_id=NULL, room_revision=room_revision+1
  FROM matches m
  WHERE r.status='in_game' AND r.active_match_id=m.id AND m.status='finished'
  RETURNING r.id
)
UPDATE seats SET ready=false
WHERE room_id IN (SELECT id FROM recovered) AND occupant_kind='human';
