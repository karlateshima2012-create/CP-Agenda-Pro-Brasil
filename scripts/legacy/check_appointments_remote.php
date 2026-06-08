<?php
require_once 'api/lib/Db.php';

try {
    $accountId = 16; // User ID from previous context
    echo "=== Appointments for Account $accountId ===\n";
    $appts = Db::fetchAll("SELECT * FROM cp_agenda_appointments WHERE account_id = ? ORDER BY created_at DESC LIMIT 10", [$accountId]);
    
    foreach ($appts as $a) {
        echo "[ID: " . $a['id'] . "] Status: " . $a['status'] . " | Service: " . $a['service_name'] . " | Start: " . $a['start_at'] . " | Created: " . $a['created_at'] . "\n";
    }
    
    echo "\n=== Total Count ===\n";
    $count = Db::fetch("SELECT COUNT(*) as c FROM cp_agenda_appointments WHERE account_id = ?", [$accountId]);
    echo "Total: " . $count['c'] . "\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
