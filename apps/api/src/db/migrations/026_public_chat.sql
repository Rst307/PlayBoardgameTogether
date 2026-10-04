CREATE TABLE public_messages (
  id uuid PRIMARY KEY,
  sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
  sender_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX public_messages_sender_time ON public_messages(sender_id, created_at DESC);
