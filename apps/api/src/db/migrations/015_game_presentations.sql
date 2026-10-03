CREATE TABLE game_presentations (
  game_id text NOT NULL,
  game_version text NOT NULL,
  icon_url text CHECK (length(icon_url) <= 2048),
  cover_url text CHECK (length(cover_url) <= 2048),
  background_url text CHECK (length(background_url) <= 2048),
  revision integer NOT NULL CHECK (revision > 0),
  updated_by uuid NOT NULL REFERENCES accounts(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, game_version),
  FOREIGN KEY (game_id, game_version) REFERENCES game_installations(game_id, game_version)
);
