<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/api/config.php';
require_once __DIR__ . '/api/lib/Db.php';
try {
    $db = Db::getInstance()->getConnection();
    $stmt = $db->query("SELECT id, name, name_color, description_color FROM cp_agenda_services");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Total services: " . count($rows) . "\n";
    foreach($rows as $r) {
        echo "ID: " . $r['id'] . " | Name: " . $r['name'] . " | name_color: '" . $r['name_color'] . "' | desc_color: '" . $r['description_color'] . "'\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
