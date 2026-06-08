<?php
require_once __DIR__ . '/api/config.php';
require_once __DIR__ . '/api/lib/Db.php';
try {
    $db = Db::getInstance()->getPdo();
    
    $stmt = $db->prepare("UPDATE cp_agenda_services SET name_color = NULL WHERE name_color = '#ffffff'");
    $stmt->execute();
    
    $stmt = $db->prepare("UPDATE cp_agenda_services SET description_color = NULL WHERE description_color = '#9ca3af'");
    $stmt->execute();
    
    $stmt = $db->prepare("ALTER TABLE cp_agenda_services MODIFY COLUMN name_color VARCHAR(7) DEFAULT NULL");
    $stmt->execute();
    
    $stmt = $db->prepare("ALTER TABLE cp_agenda_services MODIFY COLUMN description_color VARCHAR(7) DEFAULT NULL");
    $stmt->execute();

    echo "Colors fixed!\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
