<?php
require_once 'api/lib/Db.php';

try {
    echo "=== Finding Owner of Account 16 ===\n";
    $user = Db::fetch("SELECT id, name, email, role, account_id FROM cp_agenda_users WHERE account_id = 16");
    
    if ($user) {
        print_r($user);
    } else {
        echo "No user found linked to Account 16 directly.\n";
        // Check if there is an account 16
        $acc = Db::fetch("SELECT * FROM cp_agenda_accounts WHERE id=16");
        if ($acc) {
            echo "Account 16 exists: " . $acc['name'] . "\n";
        } else {
            echo "Account 16 does not exist.\n";
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
