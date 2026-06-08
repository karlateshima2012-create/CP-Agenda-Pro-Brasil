<?php
require_once __DIR__ . '/api/config.php';
$db = Database::getInstance()->getConnection();
$stmt = $db->prepare("SELECT id, name, name_color FROM cp_agenda_services LIMIT 5");
$stmt->execute();
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
