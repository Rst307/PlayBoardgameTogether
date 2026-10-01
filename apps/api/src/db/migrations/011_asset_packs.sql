CREATE TABLE asset_drafts (
  id uuid PRIMARY KEY,
  manifest jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validating','ready','published')),
  content_hash text,
  report jsonb NOT NULL DEFAULT '{"errors":[],"warnings":[]}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE asset_files (
  id uuid PRIMARY KEY,
  draft_id uuid REFERENCES asset_drafts(id) ON DELETE SET NULL,
  original_name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('image','audio')),
  status text NOT NULL CHECK (status IN ('staged','processing','validated','failed','tombstone','deleted')),
  storage_key text UNIQUE,
  media_type text NOT NULL,
  source_hash text NOT NULL,
  hash text,
  bytes integer NOT NULL CHECK (bytes >= 0),
  reserved_bytes integer NOT NULL CHECK (reserved_bytes > 0),
  metadata jsonb NOT NULL DEFAULT '{}',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  delete_after timestamptz
);
CREATE TABLE asset_versions (
  id uuid PRIMARY KEY,
  pack_id text NOT NULL,
  version text NOT NULL,
  game_id text NOT NULL,
  manifest jsonb NOT NULL,
  manifest_hash text NOT NULL,
  contract_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('published','archived','deleted')),
  builtin boolean NOT NULL DEFAULT false,
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pack_id,version)
);
CREATE TABLE asset_version_files (
  version_id uuid REFERENCES asset_versions(id),
  file_id uuid REFERENCES asset_files(id),
  PRIMARY KEY(version_id,file_id)
);
CREATE TABLE asset_draft_files (
  draft_id uuid REFERENCES asset_drafts(id) ON DELETE CASCADE,
  file_id uuid REFERENCES asset_files(id),
  PRIMARY KEY(draft_id,file_id)
);
CREATE TABLE asset_receipts (
  actor_id uuid NOT NULL,
  operation text NOT NULL,
  request_id text NOT NULL,
  request_hash text NOT NULL,
  result jsonb NOT NULL,
  PRIMARY KEY(actor_id,operation,request_id)
);
ALTER TABLE rooms ADD COLUMN asset_version_id uuid REFERENCES asset_versions(id);
ALTER TABLE matches ADD COLUMN asset_version_id uuid REFERENCES asset_versions(id);
ALTER TABLE matches ADD COLUMN asset_manifest_hash text;
ALTER TABLE matches ADD COLUMN asset_contract_version text;
CREATE INDEX asset_room_refs ON rooms(asset_version_id) WHERE status <> 'closed';
CREATE INDEX asset_match_refs ON matches(asset_version_id);
CREATE INDEX asset_files_cleanup ON asset_files(status,delete_after);
CREATE FUNCTION protect_asset_version_content() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.manifest IS DISTINCT FROM OLD.manifest OR NEW.manifest_hash IS DISTINCT FROM OLD.manifest_hash
     OR NEW.pack_id IS DISTINCT FROM OLD.pack_id OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.game_id IS DISTINCT FROM OLD.game_id OR NEW.contract_hash IS DISTINCT FROM OLD.contract_hash THEN
    RAISE EXCEPTION 'Published asset version is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER asset_version_immutable BEFORE UPDATE ON asset_versions FOR EACH ROW EXECUTE FUNCTION protect_asset_version_content();
