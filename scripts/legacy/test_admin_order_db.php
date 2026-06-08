<?php
// scripts/test_admin_order.php
$url = 'https://cpagendapro.creativeprintjp.com/api/admin/profiles';

// We need a session cookie or token. 
// Since we don't have an easy way to get a session cookie for admin without logging in via a script that handles cookies...
// I will create a temporary public endpoint to dump the query order OR trusting the user that it didn't work.
// Actually, let's just use the `run_command` to execute a PHP snippet on the server that queries DB directly, 
// matching the logic in admin.php

require_once 'api/config.php';
require_once 'api/lib/Db.php';

try {
    $profiles = Db::fetchAll("SELECT a.name as companyName, a.created_at as createdAt FROM cp_agenda_users u JOIN cp_agenda_accounts a ON u.account_id = a.id WHERE u.role = 'client' ORDER BY a.created_at DESC LIMIT 5");
    
    echo "Top 5 Companies (Newest First):\n";
    foreach ($profiles as $p) {
        echo $p['createdAt'] . " - " . $p['companyName'] . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
