ALTER TABLE game_packages ADD COLUMN presentation jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE game_packages ADD CONSTRAINT game_package_presentation_object
  CHECK (jsonb_typeof(presentation) = 'object' AND octet_length(presentation::text) <= 1400000);
