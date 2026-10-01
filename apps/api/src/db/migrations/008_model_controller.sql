ALTER TABLE match_participants ADD COLUMN model_profile_id uuid;
ALTER TABLE match_participants ADD CONSTRAINT match_participants_model_profile_fk FOREIGN KEY(model_profile_id,account_id) REFERENCES model_profiles(id,owner_account_id);
ALTER TABLE match_participants DROP CONSTRAINT match_participants_controller_type_check;
ALTER TABLE match_participants ADD CONSTRAINT match_participants_controller_type_check CHECK (controller_type IN ('human','script','model'));
ALTER TABLE match_participants ADD CONSTRAINT match_participants_model_shape CHECK ((controller_type='model' AND model_profile_id IS NOT NULL) OR controller_type <> 'model');
