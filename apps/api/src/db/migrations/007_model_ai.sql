CREATE TABLE provider_endpoints (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  protocol text NOT NULL CHECK (protocol IN ('openai-chat-completions','mock')),
  base_url text NOT NULL,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK (base_url ~ '^https://[^/@#]+(/[^?#]*)?$' OR (protocol='mock' AND base_url='mock://local'))
);
INSERT INTO provider_endpoints(id,display_name,protocol,base_url,capabilities) VALUES
 ('openai','OpenAI','openai-chat-completions','https://api.openai.com/v1', '{"jsonObject":true,"usage":true}'::jsonb),
 ('mock','模拟模型','mock','mock://local', '{"jsonObject":true,"usage":false}'::jsonb)
ON CONFLICT(id) DO NOTHING;

CREATE TABLE model_profiles (
  id uuid PRIMARY KEY,
  owner_account_id uuid NOT NULL REFERENCES accounts(id),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  endpoint_id text NOT NULL REFERENCES provider_endpoints(id),
  model_id text NOT NULL CHECK (length(model_id) BETWEEN 1 AND 120),
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id, owner_account_id)
);
CREATE TABLE model_profile_versions (
  profile_id uuid NOT NULL REFERENCES model_profiles(id),
  version integer NOT NULL CHECK (version > 0),
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(profile_id, version)
);
CREATE TABLE model_credentials (
  id uuid PRIMARY KEY,
  owner_account_id uuid NOT NULL REFERENCES accounts(id),
  endpoint_id text NOT NULL REFERENCES provider_endpoints(id),
  ciphertext bytea NOT NULL,
  nonce bytea NOT NULL,
  auth_tag bytea NOT NULL,
  key_version text NOT NULL,
  authorization_version integer NOT NULL DEFAULT 1,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id, owner_account_id, endpoint_id)
);
ALTER TABLE model_profiles ADD COLUMN credential_id uuid;
ALTER TABLE model_profiles ADD CONSTRAINT model_profiles_credential_owner_fk
  FOREIGN KEY(credential_id,owner_account_id,endpoint_id) REFERENCES model_credentials(id,owner_account_id,endpoint_id);

CREATE TABLE model_attempts (
  id uuid PRIMARY KEY,
  owner_account_id uuid NOT NULL REFERENCES accounts(id),
  profile_id uuid REFERENCES model_profiles(id),
  profile_version integer,
  purpose text NOT NULL CHECK (purpose IN ('test','decision')),
  status text NOT NULL CHECK (status IN ('reserved','dispatching','completed','failed','unknown','cancelled')),
  safe_error_code text,
  provider_request_id text,
  returned_model_id text,
  input_tokens integer,
  output_tokens integer,
  cached_input_tokens integer,
  reasoning_tokens integer,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  CHECK (input_tokens IS NULL OR input_tokens >= 0),
  CHECK (output_tokens IS NULL OR output_tokens >= 0)
);
CREATE INDEX model_attempts_owner_date_idx ON model_attempts(owner_account_id,created_at DESC);
CREATE TABLE model_budget_buckets (
  id uuid PRIMARY KEY,
  owner_account_id uuid NOT NULL REFERENCES accounts(id),
  scope text NOT NULL CHECK (scope IN ('daily','profile','match')),
  scope_key text NOT NULL,
  window_start date NOT NULL,
  call_limit integer NOT NULL CHECK (call_limit >= 0),
  reserved_calls integer NOT NULL DEFAULT 0 CHECK (reserved_calls >= 0),
  used_calls integer NOT NULL DEFAULT 0 CHECK (used_calls >= 0),
  reserved_tokens integer NOT NULL DEFAULT 0 CHECK (reserved_tokens >= 0),
  used_tokens integer NOT NULL DEFAULT 0 CHECK (used_tokens >= 0),
  UNIQUE(owner_account_id,scope,scope_key,window_start)
);
CREATE TABLE model_budget_reservations (
  attempt_id uuid PRIMARY KEY REFERENCES model_attempts(id),
  bucket_id uuid NOT NULL REFERENCES model_budget_buckets(id),
  reserved_calls integer NOT NULL DEFAULT 1 CHECK (reserved_calls = 1),
  reserved_tokens integer NOT NULL CHECK (reserved_tokens > 0),
  settled_at timestamptz,
  outcome text CHECK (outcome IN ('settled','released','unknown'))
);
