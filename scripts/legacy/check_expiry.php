<?php
require_once 'api/config.php';
require_once 'api/lib/Db.php';

try {
    $companies = Db::fetchAll("SELECT a.id, a.name, a.plan_expires_at FROM cp_agenda_accounts a WHERE a.name LIKE '%TERCEIRO%'");
    
    foreach ($companies as $c) {
        echo "Company: " . $c['name'] . " | Expires: " . $c['plan_expires_at'] . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
