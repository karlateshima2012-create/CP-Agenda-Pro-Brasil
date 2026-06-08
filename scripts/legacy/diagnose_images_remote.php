<?php
require_once 'api/lib/Db.php';

echo "=== PHP CONFIG ===\n";
echo "post_max_size: " . ini_get('post_max_size') . "\n";
echo "upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "memory_limit: " . ini_get('memory_limit') . "\n";

echo "\n=== TABLE SCHEMA ===\n";
try {
    $cols = Db::fetchAll('DESCRIBE cp_agenda_accounts');
    foreach ($cols as $c) {
        if ($c['Field'] === 'cover_image' || $c['Field'] === 'profile_image') {
            echo $c['Field'] . ': ' . $c['Type'] . "\n";
        }
    }
} catch (Exception $e) {
    echo "Schema Error: " . $e->getMessage() . "\n";
}

echo "\n=== DATA INSPECTION (ID 16) ===\n";
try {
    $row = Db::fetch('SELECT LENGTH(cover_image) as cover_len, LENGTH(profile_image) as profile_len, LEFT(cover_image, 50) as cover_start, LEFT(profile_image, 50) as profile_start FROM cp_agenda_accounts WHERE id = 16');
    print_r($row);
} catch (Exception $e) {
    echo "Data Error: " . $e->getMessage() . "\n";
}
