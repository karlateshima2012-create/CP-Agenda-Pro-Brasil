UPDATE cp_agenda_users SET role = 'account_admin' WHERE email = 'suporte@creativeprintjp.com'; 
-- Wait, the enum is 'super_admin', 'account_admin', 'staff'.
-- 'admin' is NOT in the enum!
-- 'account_admin' is the enum value.
-- But the code checks for 'admin'.
-- Let's check schema.sql again.
