<?php
require_once 'api/config.php';
require_once 'api/lib/Db.php';

try {
    echo "Adding contact_phone column...\n";
    Db::query("ALTER TABLE cp_agenda_accounts ADD COLUMN contact_phone VARCHAR(50) DEFAULT NULL AFTER contact_email");
    echo "Done.\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), "Duplicate column") !== false) {
        echo "Column already exists.\n";
    } else {
        // Fallback if contact_email doesn't exist (it might not have been added in previous migrations if we missed it, though types.ts implies it)
        // Let's try adding it without AFTER just in case
        try {
            Db::query("ALTER TABLE cp_agenda_accounts ADD COLUMN contact_phone VARCHAR(50) DEFAULT NULL");
            echo "Done (fallback).\n";
        } catch (Exception $ex) {
             if (strpos($ex->getMessage(), "Duplicate column") !== false) {
                echo "Column already exists.\n";
            } else {
                echo "Error: " . $ex->getMessage() . "\n";
            }
        }
    }
}
