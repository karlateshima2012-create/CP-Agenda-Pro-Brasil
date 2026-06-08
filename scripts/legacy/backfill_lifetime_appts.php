<?php
require_once 'api/config.php';
require_once 'api/lib/Db.php';

try {
    // 1. Get counts per account for confirmed/done
    $counts = Db::fetchAll("SELECT account_id, COUNT(*) as total FROM cp_agenda_appointments WHERE status IN ('confirmed', 'done') GROUP BY account_id");
    
    echo "Found " . count($counts) . " accounts with confirmed appointments.\n";
    
    foreach ($counts as $row) {
        $accId = $row['account_id'];
        $total = $row['total'];
        
        // Update account
        Db::query("UPDATE cp_agenda_accounts SET lifetime_appointments = ? WHERE id = ?", [$total, $accId]);
        echo "Updated Account ID {$accId} with {$total} lifetime appointments.\n";
    }
    
    echo "Backfill complete.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
