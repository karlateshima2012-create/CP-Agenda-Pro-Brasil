<?php
require_once __DIR__ . '/backend/api/config.php';
$db = Database::getInstance()->getConnection();
$stmt = $db->query("SELECT id, name, name_color, description_color FROM cp_agenda_services LIMIT 10");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach($rows as $r) {
    echo "ID: {$r['id']} | Name: {$r['name']} | Color: '{$r['name_color']}'\n";
}
