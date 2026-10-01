ALTER TABLE matches ADD CONSTRAINT matches_id_room_unique UNIQUE(id, room_id);
ALTER TABLE rooms DROP CONSTRAINT rooms_active_match_fk;
ALTER TABLE rooms ADD CONSTRAINT rooms_active_match_room_fk
  FOREIGN KEY(active_match_id, id) REFERENCES matches(id, room_id);
