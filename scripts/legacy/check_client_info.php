<?php
require_once 'api/lib/Db.php';

try {
    echo "=== Checking Appointments for Account 16 ===\n";
    $appts = Db::fetchAll("SELECT id, client_name, client_phone, service_name, start_at FROM cp_agenda_appointments WHERE account_id = 16");
    print_r($appts);

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
