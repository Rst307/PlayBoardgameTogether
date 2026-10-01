-- Multiple upload records may share immutable bytes, without sharing draft permissions.
ALTER TABLE asset_files DROP CONSTRAINT asset_files_storage_key_key;
CREATE INDEX asset_files_storage_key ON asset_files(storage_key);
