<?php
require_once 'api/config.php';
require_once 'api/lib/Db.php';

try {
    echo "Adding end_datetime column...\n";
    // Check if exists first (simple try catch on alter)
    try {
        Db::query("ALTER TABLE cp_agenda_appointments ADD COLUMN end_datetime DATETIME DEFAULT NULL AFTER start_at");
        echo "Column added.\n";
    } catch (Exception $e) {
        if (strpos($e->getMessage(), "Duplicate column") !== false) {
            echo "Column already exists.\n";
        } else {
            echo "Error adding column: " . $e->getMessage() . "\n";
        }
    }

    echo "Backfilling end_datetime for existing records...\n";
    Db::query("UPDATE cp_agenda_appointments SET end_datetime = DATE_ADD(start_at, INTERVAL duration MINUTE) WHERE end_datetime IS NULL");
    echo "Backfill complete.\n";

} catch (Exception $e) {
    echo "Critical Error: " . $e->getMessage() . "\n";
}
