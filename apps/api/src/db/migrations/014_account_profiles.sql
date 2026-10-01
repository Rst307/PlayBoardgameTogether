ALTER TABLE accounts
  ADD COLUMN avatar text NOT NULL DEFAULT 'dice'
    CHECK (avatar IN ('dice', 'leaf', 'cat', 'rocket', 'star', 'coffee')),
  ADD COLUMN bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 300);
