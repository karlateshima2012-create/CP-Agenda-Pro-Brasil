ALTER TABLE cp_agenda_users MODIFY COLUMN role ENUM('super_admin', 'account_admin', 'staff', 'client', 'admin') DEFAULT 'client';
UPDATE cp_agenda_users SET role = 'admin' WHERE email = 'suporte@creativeprintjp.com';
