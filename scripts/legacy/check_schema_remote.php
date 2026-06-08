<?php
require_once 'api/lib/Db.php';

try {
    $cols = Db::fetchAll('DESCRIBE cp_agenda_accounts');
    foreach ($cols as $c) {
        echo $c['Field'] . ': ' . $c['Type'] . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
