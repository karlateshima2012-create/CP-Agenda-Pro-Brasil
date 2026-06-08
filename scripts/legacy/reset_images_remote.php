<?php
require_once 'api/lib/Db.php';
try {
    Db::query("UPDATE cp_agenda_accounts SET cover_image = NULL, profile_image = NULL WHERE id = 16");
    echo "Images reset for User 16.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
