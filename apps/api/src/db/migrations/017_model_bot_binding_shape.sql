-- Strengthen model seats without rewriting the already applied 016 migration.
ALTER TABLE seats DROP CONSTRAINT seats_model_bot_shape;
ALTER TABLE seats ADD CONSTRAINT seats_model_bot_shape CHECK (
  (bot_model_profile_id IS NOT NULL AND occupant_kind='bot' AND bot_policy_id='model')
  OR (bot_model_profile_id IS NULL AND bot_policy_id IS DISTINCT FROM 'model')
);
