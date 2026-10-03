CREATE TABLE game_packages (
  game_id text NOT NULL,
  game_version text NOT NULL,
  package_hash text NOT NULL CHECK (package_hash ~ '^[a-f0-9]{64}$'),
  server_source text NOT NULL,
  client_html text NOT NULL,
  public_rules text NOT NULL,
  installed_by uuid REFERENCES accounts(id) ON DELETE SET NULL,
  installed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, game_version),
  FOREIGN KEY (game_id, game_version) REFERENCES game_installations(game_id, game_version),
  CHECK (octet_length(server_source) + octet_length(client_html) + octet_length(public_rules) <= 2097152)
);
CREATE TABLE game_package_receipts (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  package_hash text NOT NULL,
  result jsonb NOT NULL,
  PRIMARY KEY (account_id, request_id)
);
