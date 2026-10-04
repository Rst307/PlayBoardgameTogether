-- Keep bot names with fixed participants; room seats may be reused after settlement.
ALTER TABLE match_participants ADD COLUMN display_name text;

UPDATE match_participants p SET display_name = a.display_name
FROM accounts a WHERE a.id = p.account_id;

-- Only active room bindings can safely recover a legacy bot's original name.
UPDATE match_participants p SET display_name = s.bot_name
FROM matches m JOIN rooms r ON r.active_match_id = m.id
JOIN seats s ON s.room_id = r.id
WHERE p.match_id = m.id AND p.seat_id = s.id
  AND p.occupant_kind = 'bot' AND s.occupant_kind = 'bot';
