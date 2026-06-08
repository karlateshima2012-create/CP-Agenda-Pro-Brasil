<?php
require_once 'api/lib/Db.php';

try {
    $pdo = Db::getInstance()->getPdo();
    
    echo "Altering cover_image to LONGTEXT...\n";
    $pdo->exec("ALTER TABLE cp_agenda_accounts MODIFY cover_image LONGTEXT");
    
    echo "Altering profile_image to LONGTEXT...\n";
    $pdo->exec("ALTER TABLE cp_agenda_accounts MODIFY profile_image LONGTEXT");
    
    echo "Schema updated successfully.\n";
    
    // Check again
    $cols = Db::fetchAll('DESCRIBE cp_agenda_accounts');
    foreach ($cols as $c) {
        if ($c['Field'] === 'cover_image' || $c['Field'] === 'profile_image') {
            echo $c['Field'] . ': ' . $c['Type'] . "\n";
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
