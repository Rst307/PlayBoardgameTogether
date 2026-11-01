-- Keep existing package versions intact while allowing larger self-contained desktops.
ALTER TABLE game_packages DROP CONSTRAINT game_packages_check;
ALTER TABLE game_packages ADD CONSTRAINT game_packages_check
  CHECK (octet_length(server_source) + octet_length(client_html) + octet_length(public_rules) <= 104857600);
