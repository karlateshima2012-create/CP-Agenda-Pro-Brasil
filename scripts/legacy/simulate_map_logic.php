<?php
require_once 'api/lib/Db.php';

try {
    // 1. Fetch raw appointments for Account 16
    $accId = 16;
    $appts = Db::fetchAll("SELECT * FROM cp_agenda_appointments WHERE account_id = ? ORDER BY start_at ASC", [$accId]);
    
    echo "=== Raw DB Data ===\n";
    print_r($appts);
    
    // 2. Simulate Frontend Mapping
    echo "\n=== Simulated Frontend Mapping ===\n";
    $mapped = array_map(function($a) {
        return [
            'id' => $a['id'],
            'startAt' => $a['start_at'] ? str_replace(' ', 'T', $a['start_at']) : '',
            'status' => $a['status']
        ];
    }, $appts);
    
    print_r($mapped);
    
    // 3. Simulate Filter Logic (Date: All, Status: All)
    echo "\n=== Simulated Client Filter (All/All) ===\n";
    $filtered = array_filter($mapped, function($a) {
        if (!$a['startAt']) return false;
        // Status filter 'all' -> pass
        // Date filter 'all' -> pass
        return true;
    });
    
    echo "Filtered Count: " . count($filtered) . "\n";
    print_r($filtered);

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
