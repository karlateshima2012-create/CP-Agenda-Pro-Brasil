<?php
require_once 'api/config.php';
require_once 'api/lib/Db.php';

try {
    // 1. Create Account
    Db::query("INSERT INTO cp_agenda_accounts (name, owner_name, status, plan_type, plan_expires_at) VALUES ('Test Company', 'Test Owner', 'active', '6m', NOW() + INTERVAL 6 MONTH)");
    $accId = Db::getInstance()->getPdo()->lastInsertId();

    // 2. Create User
    $email = 'test_first_access@example.com';
    $pass = 'password123';
    $hash = password_hash($pass, PASSWORD_DEFAULT);

    Db::query("INSERT INTO cp_agenda_users (account_id, email, password_hash, role, name, must_change_password) VALUES (?, ?, ?, 'client', 'Test User', 1)", 
        [$accId, $email, $hash]);

    echo "User created: $email / $pass (Account ID: $accId)\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
