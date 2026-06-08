<?php
require_once 'api/config.php';
require_once 'api/lib/Db.php';

try {
    $cols = Db::fetchAll("SHOW COLUMNS FROM cp_agenda_appointments");
    foreach ($cols as $col) {
        echo $col['Field'] . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
