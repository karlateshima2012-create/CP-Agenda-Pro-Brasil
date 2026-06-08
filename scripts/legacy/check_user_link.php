<?php
require_once 'api/lib/Db.php';

try {
    echo "=== User Check ===\n";
    $user = Db::fetch("SELECT id, name, email, account_id FROM cp_agenda_users WHERE email = 'suporte@creativeprintjp.com'");
    print_r($user);
    
    if ($user) {
        $accId = $user['account_id'];
        echo "\n=== Account $accId Check ===\n";
        $acc = Db::fetch("SELECT id, name FROM cp_agenda_accounts WHERE id = ?", [$accId]);
        print_r($acc);
        
        echo "\n=== Appointments for Account $accId ===\n";
        $count = Db::fetch("SELECT COUNT(*) as c FROM cp_agenda_appointments WHERE account_id = ?", [$accId]);
        echo "Count: " . $count['c'] . "\n";
        
        // Also check if they are linked to another account by mistake
        echo "\n=== Appointments for ANY Account (limit 5) ===\n";
        $all = Db::fetchAll("SELECT id, account_id, status FROM cp_agenda_appointments ORDER BY id DESC LIMIT 5");
        print_r($all);
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
