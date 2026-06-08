<?php
require_once 'api/config.php';
require_once 'api/lib/Db.php';

try {
    $cols = Db::fetchAll("SHOW COLUMNS FROM cp_agenda_accounts LIKE 'contact_phone'");
    echo "Column exists: " . (count($cols) > 0 ? 'YES' : 'NO') . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
