<?php
require_once __DIR__ . '/api/lib/Db.php';
$accountId = 25;

echo "=== CONFLICTS FOR Account $accountId (Feb 23-26) ===\n";
$appts = Db::fetchAll("SELECT id, service_name, start_at, end_datetime, status FROM cp_agenda_appointments 
                       WHERE account_id = ? 
                       AND status IN ('confirmed', 'pending') 
                       AND start_at >= '2026-02-23 00:00:00' 
                       AND start_at <= '2026-02-26 23:59:59' 
                       ORDER BY start_at ASC", [$accountId]);

foreach ($appts as $a) {
    echo "Day: " . substr($a['start_at'], 8, 2) . " | Svc: {$a['service_name']} | Time: " . substr($a['start_at'], 11, 5) . " to " . substr($a['end_datetime'], 11, 5) . " | Status: {$a['status']}\n";
}
?>
