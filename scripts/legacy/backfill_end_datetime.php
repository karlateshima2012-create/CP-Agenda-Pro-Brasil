<?php
require_once 'api/config.php';
require_once 'api/lib/Db.php';

try {
    // 1. Check for NULL end_datetime
    $nulls = Db::fetchAll("SELECT id, start_at, duration FROM cp_agenda_appointments WHERE end_datetime IS NULL");
    
    echo "Found " . count($nulls) . " appointments with NULL end_datetime.\n";
    
    foreach ($nulls as $app) {
        $start = new DateTime($app['start_at']);
        $end = clone $start;
        $end->modify("+" . $app['duration'] . " minutes");
        $endStr = $end->format('Y-m-d H:i:s');
        
        Db::query("UPDATE cp_agenda_appointments SET end_datetime = ? WHERE id = ?", [$endStr, $app['id']]);
        echo "Updated IDs: " . $app['id'] . "\n";
    }
    
    echo "Done.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
