<?php
// deploy_hostinger/public_html/api/debug_query.php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/Db.php';

header('Content-Type: text/plain');

echo "--- CONNECTION TEST ---\n";
try {
    $pdo = Db::getInstance()->getPdo();
    echo "Connected to DB: " . DB_NAME . "\n";
} catch (Exception $e) {
    die("Connection failed: " . $e->getMessage() . "\n");
}

echo "\n--- QUERY TEST (Double Quotes) ---\n";
$sql1 = 'SELECT u.id, u.email, u.role FROM cp_agenda_users u JOIN cp_agenda_accounts a ON u.account_id = a.id WHERE u.role = "client"';
echo "SQL: $sql1\n";
try {
    $rows = Db::fetchAll($sql1);
    echo "Count: " . count($rows) . "\n";
    print_r($rows);
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

echo "\n--- QUERY TEST (Single Quotes) ---\n";
$sql2 = "SELECT u.id, u.email, u.role FROM cp_agenda_users u JOIN cp_agenda_accounts a ON u.account_id = a.id WHERE u.role = 'client'";
echo "SQL: $sql2\n";
try {
    $rows = Db::fetchAll($sql2);
    echo "Count: " . count($rows) . "\n";
    print_r($rows);
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

echo "\n--- CHECK SQL MODE ---\n";
try {
    $res = Db::fetch("SELECT @@sql_mode as mode");
    echo "SQL_MODE: " . $res['mode'] . "\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
