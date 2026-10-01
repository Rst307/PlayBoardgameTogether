ALTER TABLE rooms ADD COLUMN creator_account_id uuid REFERENCES accounts(id);
-- Historical rooms did not record their creator; preserve them and use their current host.
UPDATE rooms SET creator_account_id = host_account_id;
ALTER TABLE rooms ALTER COLUMN creator_account_id SET NOT NULL;
ALTER TABLE rooms ADD COLUMN visibility text NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('public', 'private'));
ALTER TABLE rooms ADD COLUMN password_hash text;
CREATE INDEX rooms_creator_open ON rooms(creator_account_id) WHERE status <> 'closed';
CREATE INDEX rooms_public_listing ON rooms(created_at DESC, id DESC) WHERE visibility = 'public';

-- Fence and cancel previously authorized human script controllers.
UPDATE match_participants SET controller_type='human', controller_epoch=controller_epoch+1,
  controller_version=controller_version+1, policy_id=NULL, policy_version=NULL, policy_hash=NULL,
  ai_status='idle', ai_error_code=NULL, ai_status_version=ai_status_version+1
WHERE occupant_kind='human' AND controller_type='script';
UPDATE ai_tasks t SET status='cancelled', updated_at=now()
FROM match_participants p WHERE t.match_id=p.match_id AND t.seat_id=p.seat_id
  AND t.controller_epoch<>p.controller_epoch
  AND t.status NOT IN ('succeeded','stale','cancelled','blocked');
