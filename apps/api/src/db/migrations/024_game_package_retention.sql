-- Installed rules belong to game versions, never to the uploader's account lifecycle.
-- Keep the uploader UUID as an audit reference without cascading package deletion/truncation.
ALTER TABLE game_packages DROP CONSTRAINT game_packages_installed_by_fkey;
