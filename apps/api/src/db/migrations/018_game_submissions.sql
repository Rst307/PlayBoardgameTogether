-- Requests are inert metadata. Reviewing one never installs or enables a game.
CREATE TABLE game_submissions (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id),
  request_id uuid NOT NULL,
  input jsonb NOT NULL CHECK (jsonb_typeof(input) = 'object'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'rejected')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision IN (1, 2)),
  review_note text CHECK (length(review_note) BETWEEN 1 AND 1000),
  reviewed_by uuid REFERENCES accounts(id),
  review_input jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (account_id, request_id),
  CHECK (
    (status = 'pending' AND revision = 1 AND review_note IS NULL AND reviewed_by IS NULL
      AND review_input IS NULL AND reviewed_at IS NULL)
    OR (status <> 'pending' AND revision = 2 AND review_note IS NOT NULL AND reviewed_by IS NOT NULL
      AND review_input IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);
CREATE INDEX game_submissions_account_created ON game_submissions(account_id, created_at DESC, id DESC);
CREATE INDEX game_submissions_created ON game_submissions(created_at DESC, id DESC);
