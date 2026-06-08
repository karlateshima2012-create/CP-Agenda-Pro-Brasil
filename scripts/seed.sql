-- seed.sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE cp_agenda_users;
TRUNCATE TABLE cp_agenda_accounts;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO cp_agenda_accounts (id, name, status) VALUES (1, 'CP Demo', 'active');
-- Password hash for 'password1234' is generated dynamically in the script
