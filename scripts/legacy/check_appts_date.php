<?php
require_once 'api/config.php';
require_once 'api/lib/Db.php';

try {
    // Fetch all appointments for Feb 18, 2026
    $appts = Db::fetchAll("SELECT id, start_at, end_datetime, duration, status FROM cp_agenda_appointments WHERE DATE(start_at) = '2026-02-18'");
    
    echo "Found " . count($appts) . " appointments for 2026-02-18:\n";
    foreach ($appts as $a) {
        echo "ID: {$a['id']} | Start: {$a['start_at']} | End: {$a['end_datetime']} | Dur: {$a['duration']} | Status: {$a['status']}\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
