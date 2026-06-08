<?php
// diag_auth.php
require_once 'api/config.php';
require_once 'api/lib/Response.php';
require_once 'api/lib/Db.php';
require_once 'api/lib/Auth.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    echo "Checking DB connection...\n";
    $db = Db::getInstance();
    echo "DB Connected.\n";

    echo "Checking users table...\n";
    $tables = Db::fetchAll("SHOW TABLES LIKE 'cp_agenda_users'");
    if (empty($tables)) {
        echo "ERROR: cp_agenda_users table MISSING!\n";
    } else {
        echo "Table exists.\n";
        $columns = Db::fetchAll("DESCRIBE cp_agenda_users");
        echo "Columns:\n";
        foreach ($columns as $col) {
            echo " - {$col['Field']} ({$col['Type']})\n";
        }
    }

    echo "Attempting a mock login for suporte@creativeprintjp.com...\n";
    $user = Db::fetch('SELECT * FROM cp_agenda_users WHERE email = ?', ['suporte@creativeprintjp.com']);
    if ($user) {
        echo "User found: " . $user['email'] . "\n";
        echo "Role: " . $user['role'] . "\n";
    } else {
        echo "User NOT FOUND.\n";
        
        echo "Listing all users:\n";
        $all = Db::fetchAll("SELECT id, email FROM cp_agenda_users");
        foreach($all as $u) {
            echo " - {$u['email']}\n";
        }
    }

} catch (Exception $e) {
    echo "CRITICAL ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
