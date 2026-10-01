-- Stage 5: script-controlled seats, principal-scoped receipts and durable AI work.
ALTER TABLE seats DROP CONSTRAINT seats_check;
ALTER TABLE seats ADD COLUMN occupant_kind text NOT NULL DEFAULT 'human'
  CHECK (occupant_kind IN ('human', 'bot'));
ALTER TABLE seats ADD COLUMN bot_name text;
ALTER TABLE seats ADD COLUMN bot_policy_id text;
ALTER TABLE seats ADD COLUMN bot_policy_version text;
ALTER TABLE seats ADD CONSTRAINT seats_occupant_shape CHECK (
  (occupant_kind='human' AND bot_name IS NULL AND bot_policy_id IS NULL AND bot_policy_version IS NULL)
  OR
  (occupant_kind='bot' AND owner_account_id IS NULL AND bot_name IS NOT NULL AND bot_policy_id IS NOT NULL AND bot_policy_version IS NOT NULL)
);
ALTER TABLE seats ADD CONSTRAINT seats_ready_owner CHECK (NOT ready OR owner_account_id IS NOT NULL OR occupant_kind='bot');

ALTER TABLE match_participants DROP CONSTRAINT match_participants_controller_type_check;
ALTER TABLE match_participants ALTER COLUMN account_id DROP NOT NULL;
ALTER TABLE match_participants ADD COLUMN occupant_kind text NOT NULL DEFAULT 'human'
  CHECK (occupant_kind IN ('human', 'bot'));
ALTER TABLE match_participants ADD COLUMN policy_id text;
ALTER TABLE match_participants ADD COLUMN policy_version text;
ALTER TABLE match_participants ADD COLUMN policy_hash text;
ALTER TABLE match_participants ADD COLUMN controller_version integer NOT NULL DEFAULT 0 CHECK (controller_version >= 0);
ALTER TABLE match_participants ADD COLUMN ai_status_version integer NOT NULL DEFAULT 0 CHECK (ai_status_version >= 0);
ALTER TABLE match_participants ADD COLUMN ai_status text NOT NULL DEFAULT 'idle'
  CHECK (ai_status IN ('idle','queued','running','submitting','blocked'));
ALTER TABLE match_participants ADD COLUMN ai_error_code text;
ALTER TABLE match_participants ADD CONSTRAINT match_participants_controller_type_check CHECK (controller_type IN ('human','script'));
ALTER TABLE match_participants ADD CONSTRAINT match_participants_occupant_shape CHECK (
  (occupant_kind='human' AND account_id IS NOT NULL)
  OR
  (occupant_kind='bot' AND account_id IS NULL AND controller_type='script' AND policy_id IS NOT NULL AND policy_version IS NOT NULL AND policy_hash IS NOT NULL)
);

ALTER TABLE command_receipts ADD COLUMN principal_key text;
UPDATE command_receipts SET principal_key='human:' || account_id::text WHERE principal_key IS NULL;
ALTER TABLE command_receipts ALTER COLUMN principal_key SET NOT NULL;
ALTER TABLE command_receipts DROP CONSTRAINT command_receipts_pkey;
ALTER TABLE command_receipts ALTER COLUMN account_id DROP NOT NULL;
ALTER TABLE command_receipts ADD PRIMARY KEY(principal_key, operation, request_id);
ALTER TABLE command_receipts ADD CONSTRAINT command_receipts_principal_shape CHECK (
  (principal_key LIKE 'human:%' AND account_id IS NOT NULL) OR
  (principal_key LIKE 'automation:%' AND account_id IS NULL)
);

ALTER TABLE match_actions ALTER COLUMN account_id DROP NOT NULL;
ALTER TABLE match_actions ADD COLUMN principal_key text;
UPDATE match_actions SET principal_key='human:' || account_id::text WHERE principal_key IS NULL;
ALTER TABLE match_actions ALTER COLUMN principal_key SET NOT NULL;

CREATE TABLE ai_tasks (
  id uuid PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  seat_id uuid NOT NULL,
  source_revision integer NOT NULL CHECK (source_revision >= 0),
  controller_epoch integer NOT NULL CHECK (controller_epoch >= 0),
  decision_key text NOT NULL,
  policy_id text NOT NULL,
  policy_version text NOT NULL,
  policy_hash text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','proposed','submitting','succeeded','stale','cancelled','blocked')),
  available_at timestamptz NOT NULL DEFAULT now(),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  deadline timestamptz,
  lease_owner text,
  lease_until timestamptz,
  lease_generation integer NOT NULL DEFAULT 0 CHECK (lease_generation >= 0),
  request_id text NOT NULL,
  proposed_action jsonb,
  proposal_hash text,
  applied_revision integer,
  safe_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, seat_id, source_revision, controller_epoch, decision_key),
  FOREIGN KEY(match_id, seat_id) REFERENCES match_participants(match_id, seat_id)
);
CREATE INDEX ai_tasks_claim_idx ON ai_tasks(status, available_at, created_at);
CREATE INDEX ai_tasks_lease_idx ON ai_tasks(lease_until) WHERE status IN ('running','proposed','submitting');
CREATE INDEX ai_tasks_match_seat_idx ON ai_tasks(match_id, seat_id, created_at DESC);
