CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS game_installations (
  game_id text NOT NULL,
  game_version text NOT NULL,
  content_version text NOT NULL,
  sdk_range text NOT NULL,
  manifest jsonb NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  installed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, game_version)
);
