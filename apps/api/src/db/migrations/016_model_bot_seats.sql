-- Model authorization is separate from the bot's absent login identity.
ALTER TABLE seats ADD COLUMN bot_model_profile_id uuid REFERENCES model_profiles(id);
ALTER TABLE seats ADD CONSTRAINT seats_model_bot_shape CHECK (
  bot_model_profile_id IS NULL OR (occupant_kind='bot' AND bot_policy_id='model')
);

ALTER TABLE match_participants ADD COLUMN model_owner_account_id uuid REFERENCES accounts(id);
ALTER TABLE match_participants ADD CONSTRAINT match_participants_bot_model_profile_fk
  FOREIGN KEY(model_profile_id,model_owner_account_id) REFERENCES model_profiles(id,owner_account_id);
ALTER TABLE match_participants DROP CONSTRAINT match_participants_occupant_shape;
ALTER TABLE match_participants ADD CONSTRAINT match_participants_occupant_shape CHECK (
  (occupant_kind='human' AND account_id IS NOT NULL AND model_owner_account_id IS NULL)
  OR
  (occupant_kind='bot' AND account_id IS NULL AND policy_id IS NOT NULL
    AND policy_version IS NOT NULL AND policy_hash IS NOT NULL AND (
      (controller_type='script' AND model_profile_id IS NULL AND model_owner_account_id IS NULL)
      OR (controller_type='model' AND model_profile_id IS NOT NULL AND model_owner_account_id IS NOT NULL)
    ))
);
