<?php
require_once 'api/lib/Db.php';
try {
    $r = Db::fetch('SELECT LENGTH(profile_image) as len FROM cp_agenda_accounts WHERE id=1');
    echo "Length: " . $r['len'] . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
